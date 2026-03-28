// Runtime environment configuration
// This file is loaded at runtime, not build time
// Overridden at runtime by Docker entrypoint for each environment.
// Local dev (Vite): empty = relative URLs via Vite proxy
// Docker/prod: injected as absolute URLs (e.g. http://localhost:5001)

// API Configuration
window.API_URL = '';

// Keycloak Authentication
window.KEYCLOAK_URL = '';
window.KEYCLOAK_REALM = 'notes';
window.KEYCLOAK_CLIENT_ID = 'notes-frontend';
