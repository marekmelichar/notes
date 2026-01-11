// Runtime environment configuration
// This file is loaded at runtime, not build time
// Update these values for each deployment environment

// API Configuration
// Local dev: http://localhost:5001
// Production: https://epoznamky.cz
window.API_URL = 'http://localhost:5001';

// Keycloak Authentication
window.KEYCLOAK_URL = 'http://localhost:8080';
window.KEYCLOAK_REALM = 'epoznamky';
window.KEYCLOAK_CLIENT_ID = 'epoznamky-frontend';

// Development mode - set to true to bypass Keycloak and use MSW mocks
window.MOCK_MODE = false;
