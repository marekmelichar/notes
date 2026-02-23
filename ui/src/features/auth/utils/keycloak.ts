import Keycloak from 'keycloak-js';

const REFRESH_MARGIN_SECONDS = 60;

const keycloak = new Keycloak({
  url: window.KEYCLOAK_URL,
  realm: window.KEYCLOAK_REALM,
  clientId: window.KEYCLOAK_CLIENT_ID,
});

// Proactive token refresh — schedules refresh BEFORE token expires
let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
let onTokenRefreshCallback: ((token: string) => void) | null = null;

const clearScheduledRefresh = () => {
  if (refreshTimeoutId !== null) {
    clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
  }
};

const scheduleTokenRefresh = () => {
  clearScheduledRefresh();

  if (!keycloak.tokenParsed?.exp) return;

  const expiresAtMs = keycloak.tokenParsed.exp * 1000;
  const refreshAtMs = expiresAtMs - REFRESH_MARGIN_SECONDS * 1000;
  const delay = Math.max(refreshAtMs - Date.now(), 0);

  refreshTimeoutId = setTimeout(async () => {
    try {
      const refreshed = await keycloak.updateToken(REFRESH_MARGIN_SECONDS);
      if (refreshed && keycloak.token) {
        onTokenRefreshCallback?.(keycloak.token);
      }
      scheduleTokenRefresh();
    } catch {
      keycloak.login();
    }
  }, delay);
};

export const setTokenRefreshCallback = (callback: (token: string) => void) => {
  onTokenRefreshCallback = callback;
};

// Fallback — fires if scheduled refresh misses (e.g. device sleep)
keycloak.onTokenExpired = () => {
  keycloak
    .updateToken(REFRESH_MARGIN_SECONDS)
    .then((refreshed) => {
      if (refreshed && keycloak.token) {
        onTokenRefreshCallback?.(keycloak.token);
      }
      scheduleTokenRefresh();
    })
    .catch(() => {
      keycloak.login();
    });
};

const initKeycloakMock = (): Promise<boolean> => {
  return Promise.resolve(true);
};

const initKeycloakReal = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        flow: 'standard',
        checkLoginIframe: false,
        enableLogging: false,
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
        reject(error);
      });
  });
};

const initKeycloak = window.MOCK_MODE ? initKeycloakMock : initKeycloakReal;

export { keycloak, initKeycloak, clearScheduledRefresh };
