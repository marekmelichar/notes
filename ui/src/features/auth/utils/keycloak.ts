import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: window.KEYCLOAK_URL, // Keycloak base URL
  realm: window.KEYCLOAK_REALM, // Realm name
  clientId: window.KEYCLOAK_CLIENT_ID, // Client ID from Keycloak
});

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

        // Setup token refresh
        keycloak.onTokenExpired = () => {
          keycloak.updateToken(30).catch(() => {
            keycloak.login();
          });
        };

        resolve(authenticated);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

// Use mock initialization when MOCK_MODE is enabled
const initKeycloak = window.MOCK_MODE ? initKeycloakMock : initKeycloakReal;

export { keycloak, initKeycloak };
