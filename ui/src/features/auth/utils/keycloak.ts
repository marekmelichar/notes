import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: window.KEYCLOAK_URL, // Keycloak base URL
  realm: window.KEYCLOAK_REALM, // Realm name
  clientId: window.KEYCLOAK_CLIENT_ID, // Client ID from Keycloak
});

// Store interval ID for cleanup
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

// Mock mode bypass - returns true immediately without Keycloak initialization
const initKeycloakMock = (): Promise<boolean> => {
  return Promise.resolve(true);
};

const initKeycloakReal = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    keycloak
      .init({
        onLoad: 'check-sso', // Check SSO session first, don't force redirect
        pkceMethod: 'S256',
        flow: 'standard',
        checkLoginIframe: false,
        enableLogging: false,
      })
      .then((authenticated: boolean) => {
        // If not authenticated, trigger login
        if (!authenticated) {
          keycloak.login();
          return;
        }

        // Setup token refresh on expiration
        keycloak.onTokenExpired = () => {
          keycloak.updateToken(30).catch(() => {
            console.error('Token refresh failed on expiration');
            keycloak.login();
          });
        };

        // Clear any existing interval to prevent multiple intervals
        if (tokenRefreshInterval) {
          clearInterval(tokenRefreshInterval);
        }

        // Background token refresh every 60 seconds
        // This proactively refreshes tokens before they expire
        tokenRefreshInterval = setInterval(() => {
          keycloak
            .updateToken(30)
            .then((refreshed) => {
              if (refreshed) {
                console.debug('Token refreshed proactively');
              }
            })
            .catch(() => {
              console.error('Background token refresh failed');
            });
        }, 60000);

        resolve(authenticated);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

// Use mock initialization when MOCK_MODE is enabled
const initKeycloak = window.MOCK_MODE ? initKeycloakMock : initKeycloakReal;

// Cleanup function to stop token refresh
const cleanupKeycloak = () => {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
};

export { keycloak, initKeycloak, cleanupKeycloak };
