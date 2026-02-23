import React from 'react';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '@/config';
import { enqueueSnackbar, closeSnackbar } from 'notistack';
import i18n from '@/i18n';
import { Button } from '@mui/material';
import { logout, setAccessStatus, updateToken } from '@/store/authSlice';
import { store } from '@/store';
import { keycloak } from '@/features/auth/utils/keycloak';

const AUTH_TOKEN_KEY = 'APP_AUTH_TOKEN';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string) => {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, `Bearer ${token}`);
  } catch {
    // Storage unavailable - token will only persist in memory via Keycloak
  }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage unavailable - nothing to clear
  }
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

const showSessionExpiredMessage = () => {
  enqueueSnackbar(i18n.t('Common.SessionExpired'), {
    variant: 'warning',
    persist: true,
    action: (snackbarId) => (
      <Button
        color="inherit"
        size="small"
        onClick={() => {
          closeSnackbar(snackbarId);
          store.dispatch(logout());
        }}
      >
        {i18n.t('Common.Login')}
      </Button>
    ),
  });
};

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

    // Handle 401 Unauthorized - attempt silent token refresh
    if (statusCode === 401 && originalRequest && !originalRequest._retry) {
      // In mock mode, don't attempt refresh - just show error
      if (window.MOCK_MODE) {
        showSessionExpiredMessage();
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
          setAuthToken(keycloak.token);
          store.dispatch(updateToken(keycloak.token));

          processQueue(null, keycloak.token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
          return await apiManager(originalRequest);
        } else {
          // Token refresh returned false (token still valid but 401 occurred)
          // This shouldn't happen, but handle it gracefully
          console.warn('Token refresh returned false despite 401 - session may be invalid');
          processQueue(error, null);
          showSessionExpiredMessage();
          return await Promise.reject(error);
        }
      } catch (refreshError) {
        // Token refresh failed - user needs to re-authenticate
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        showSessionExpiredMessage();
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
