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
    API_URL?: string;
    KEYCLOAK_URL: string;
    KEYCLOAK_REALM: string;
    KEYCLOAK_CLIENT_ID: string;
    MOCK_MODE?: boolean;
  }
}
