import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '@/config';
import { setAccessStatus, setSessionExpired, updateToken } from '@/store/authSlice';
import { store } from '@/store';
import { keycloak } from '@/features/auth/utils/keycloak';

export const getAuthToken = (): string | null => {
  if (keycloak.token) {
    return `Bearer ${keycloak.token}`;
  }
  return null;
};

const apiBaseUrl = getApiBaseUrl();

export const apiManager = axios.create({
  // Only set baseURL if non-empty, otherwise use relative URLs
  ...(apiBaseUrl ? { baseURL: apiBaseUrl } : {}),
});

apiManager.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
// Queue of failed requests to retry after token refresh
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Methods where silent 401→refresh→retry is safe. Mutating methods are
// excluded because the buffered request body is a snapshot taken *before* the
// token expired — replaying it can overwrite newer server state with stale
// data (see 2026-04-23 note-wipe incident + ADR 0009). The caller must
// re-derive the body from current editor/UI state after the refresh.
const IDEMPOTENT_RETRY_METHODS = new Set(['get', 'head', 'options']);

// Response interceptor for authentication errors with silent token refresh
apiManager.interceptors.response.use(
  (response) => {
    // Mark access as authorized on successful response
    const currentStatus = store.getState().auth.accessStatus;
    if (currentStatus === 'unknown') {
      store.dispatch(setAccessStatus('authorized'));
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const statusCode = error.response?.status;
    const method = (originalRequest?.method ?? 'get').toLowerCase();
    const isIdempotent = IDEMPOTENT_RETRY_METHODS.has(method);

    // Handle 401 Unauthorized - attempt silent token refresh
    if (statusCode === 401 && originalRequest && !originalRequest._retry) {
      // For mutating requests (PUT/POST/PATCH/DELETE) we still refresh the
      // token so the next call works, but we DO NOT replay the original
      // request body — surface the 401 to the caller so they can rebuild the
      // body from current state.
      if (!isIdempotent) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            console.debug('Refreshing token after 401 on mutating request (no replay)');
            const refreshed = await keycloak.updateToken(-1);
            if (refreshed && keycloak.token) {
              store.dispatch(updateToken(keycloak.token));
              processQueue(null, keycloak.token);
            } else {
              console.warn('Token refresh returned false despite 401 - session may be invalid');
              processQueue(error, null);
              store.dispatch(setSessionExpired(true));
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            processQueue(refreshError, null);
            store.dispatch(setSessionExpired(true));
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiManager(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token using Keycloak
        // minValidity of -1 forces a refresh regardless of current token validity
        console.debug('Attempting silent token refresh after 401');
        const refreshed = await keycloak.updateToken(-1);

        if (refreshed && keycloak.token) {
          console.debug('Token refresh successful, retrying request');
          store.dispatch(updateToken(keycloak.token));

          processQueue(null, keycloak.token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
          return await apiManager(originalRequest);
        } else {
          // Token refresh returned false (token still valid but 401 occurred)
          console.warn('Token refresh returned false despite 401 - session may be invalid');
          processQueue(error, null);
          store.dispatch(setSessionExpired(true));
          return await Promise.reject(error);
        }
      } catch (refreshError) {
        // Token refresh failed - user needs to re-authenticate
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        store.dispatch(setSessionExpired(true));
        return await Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden - user authenticated but lacks permissions
    // Only set unauthorized on initial access check (when status is still unknown)
    // This prevents a single 403 on one endpoint from locking the entire app
    if (statusCode === 403) {
      const currentStatus = store.getState().auth.accessStatus;
      if (currentStatus === 'unknown') {
        store.dispatch(setAccessStatus('unauthorized'));
      }
    }

    return Promise.reject(error);
  },
);
