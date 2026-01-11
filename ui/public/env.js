// Runtime environment configuration
// This file is loaded at runtime, not build time
// Update these values for each deployment environment

// API Configuration
// Empty string = relative URLs. Vite proxy handles /api in dev, nginx in production.
window.API_URL = '';

// Keycloak Authentication
window.KEYCLOAK_URL = 'http://localhost:8080';
window.KEYCLOAK_REALM = 'epoznamky';
window.KEYCLOAK_CLIENT_ID = 'epoznamky-frontend';

// Development mode - set to true to bypass Keycloak and use MSW mocks
window.MOCK_MODE = false;
