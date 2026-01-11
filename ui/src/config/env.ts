/**
 * Environment Configuration
 *
 * This module provides type-safe access to environment variables.
 * All required environment variables are validated at application startup.
 */

interface EnvironmentConfig {
  API_URL: string;
  KEYCLOAK_URL: string;
  KEYCLOAK_REALM: string;
  KEYCLOAK_CLIENT_ID: string;
}

/**
 * Validates and returns the environment configuration
 * @throws {Error} if required environment variables are missing
 */
function getEnvironmentConfig(): EnvironmentConfig {
  const apiUrl = window.API_URL;
  const keycloakUrl = window.KEYCLOAK_URL;
  const keycloakRealm = window.KEYCLOAK_REALM;
  const keycloakClientId = window.KEYCLOAK_CLIENT_ID;

  // Validate API_URL format if provided (non-empty)
  if (apiUrl && apiUrl.trim()) {
    try {
      new URL(apiUrl);
    } catch {
      throw new Error(`API_URL is not a valid URL: ${apiUrl}`);
    }
  }

  if (!keycloakUrl) {
    throw new Error(
      'KEYCLOAK_URL is not defined. Please check your public/env.js file.',
    );
  }
  if (!keycloakRealm) {
    throw new Error(
      'KEYCLOAK_REALM is not defined. Please check your public/env.js file.',
    );
  }
  if (!keycloakClientId) {
    throw new Error(
      'KEYCLOAK_CLIENT_ID is not defined. Please check your public/env.js file.',
    );
  }

  return {
    // Empty string means use relative URLs (same origin)
    API_URL: apiUrl?.trim() || '',
    KEYCLOAK_URL: keycloakUrl,
    KEYCLOAK_REALM: keycloakRealm,
    KEYCLOAK_CLIENT_ID: keycloakClientId,
  };
}

// Export validated environment configuration
// This will throw an error at app startup if configuration is invalid
const env = getEnvironmentConfig();

/**
 * Gets the API base URL
 * Empty string = relative URLs (requests go to same origin)
 */
export const getApiBaseUrl = (): string => env.API_URL;
