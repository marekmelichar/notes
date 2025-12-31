import React from 'react';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '@/config';
import { enqueueSnackbar, closeSnackbar } from 'notistack';
import i18n from '@/i18n';
import { Button } from '@mui/material';
import { logout } from '@/store/authSlice';
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

export const apiManager = axios.create({
  baseURL: getApiBaseUrl(),
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
  (response) => response,
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
        const refreshed = await keycloak.updateToken(-1);

        if (refreshed && keycloak.token) {
          // Update stored token
          setAuthToken(keycloak.token);

          // Process queued requests with new token
          processQueue(null, keycloak.token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
          return await apiManager(originalRequest);
        } else {
          // Token refresh returned false (token still valid but 401 occurred)
          // This shouldn't happen, but handle it gracefully
          processQueue(error, null);
          showSessionExpiredMessage();
          return await Promise.reject(error);
        }
      } catch (refreshError) {
        // Token refresh failed - user needs to re-authenticate
        processQueue(refreshError, null);
        showSessionExpiredMessage();
        return await Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden - no refresh attempt, user lacks permissions
    if (statusCode === 403) {
      showSessionExpiredMessage();
    }

    return Promise.reject(error);
  },
);
