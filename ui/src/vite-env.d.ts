/// <reference types="vite/client" />

import '@mui/material/Button';

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    subtle: true;
  }
}

// Global window interface extensions
declare global {
  interface Window {
    EVP_LEGACY_API_URL: string;
    NAVADMIN_API_URL?: string;
    ENVIRONMENT: string;
    APP_VERSION: string;
    KEYCLOAK_URL: string;
    KEYCLOAK_REALM: string;
    KEYCLOAK_CLIENT_ID: string;
  }
}
