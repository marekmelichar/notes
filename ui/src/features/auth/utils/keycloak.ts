import Keycloak from 'keycloak-js';

const REFRESH_MARGIN_SECONDS = 60;
const MAX_REFRESH_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

const keycloak = new Keycloak({
  url: window.KEYCLOAK_URL,
  realm: window.KEYCLOAK_REALM,
  clientId: window.KEYCLOAK_CLIENT_ID,
});

// Proactive token refresh — schedules refresh BEFORE token expires
let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
let onTokenRefreshCallback: ((token: string) => void) | null = null;
let onRefreshFailureCallback: (() => void) | null = null;

// Mutex to prevent concurrent refresh attempts (e.g. visibilitychange + onTokenExpired racing)
let isRefreshing = false;

const clearScheduledRefresh = () => {
  if (refreshTimeoutId !== null) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attempt token refresh with retries and exponential backoff.
 * Returns true if refresh succeeded, false if all retries exhausted.
 */
const refreshTokenWithRetry = async (): Promise<boolean> => {
  if (isRefreshing) return false;
  isRefreshing = true;

  try {
    for (let attempt = 0; attempt <= MAX_REFRESH_RETRIES; attempt++) {
      try {
        const refreshed = await keycloak.updateToken(REFRESH_MARGIN_SECONDS);
        if (refreshed && keycloak.token) {
          onTokenRefreshCallback?.(keycloak.token);
        }
        scheduleTokenRefresh();
        return true;
      } catch {
        if (attempt < MAX_REFRESH_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          console.debug(`Token refresh attempt ${attempt + 1} failed, retrying in ${delay}ms`);
          await sleep(delay);
        }
      }
    }

    // All retries exhausted — notify via callback instead of force-redirecting
    console.warn('Token refresh failed after all retries');
    onRefreshFailureCallback?.();
    return false;
  } finally {
    isRefreshing = false;
  }
};

const scheduleTokenRefresh = () => {
  clearScheduledRefresh();

  if (!keycloak.tokenParsed?.exp) return;

  const expiresAtMs = keycloak.tokenParsed.exp * 1000;
  const refreshAtMs = expiresAtMs - REFRESH_MARGIN_SECONDS * 1000;
  const delay = Math.max(refreshAtMs - Date.now(), 0);

  refreshTimeoutId = setTimeout(() => {
    refreshTokenWithRetry();
  }, delay);
};

export const setTokenRefreshCallback = (callback: (token: string) => void) => {
  onTokenRefreshCallback = callback;
};

export const setRefreshFailureCallback = (callback: () => void) => {
  onRefreshFailureCallback = callback;
};

// Fallback — fires if scheduled refresh misses (e.g. device sleep)
keycloak.onTokenExpired = () => {
  refreshTokenWithRetry();
};

// Refresh token when the tab becomes visible again (e.g. after device sleep or long background)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && keycloak.authenticated) {
    refreshTokenWithRetry();
  }
});

// Guard against double init (React StrictMode double-mounts the App)
let initPromise: Promise<boolean> | null = null;

const initKeycloak = (): Promise<boolean> => {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        flow: 'standard',
        checkLoginIframe: false,
        enableLogging: false,
        scope: 'openid offline_access',
      })
      .then((authenticated: boolean) => {
        if (!authenticated) {
          keycloak.login();
          return;
        }

        scheduleTokenRefresh();
        resolve(authenticated);
      })
      .catch((error) => {
        initPromise = null;
        reject(error);
      });
  });

  return initPromise;
};

export { keycloak, initKeycloak, clearScheduledRefresh };
