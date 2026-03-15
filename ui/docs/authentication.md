# Authentication

The app uses Keycloak for login and token refresh, with Redux holding the current session state.

## Runtime Configuration

`public/env.js`

```js
window.API_URL = 'http://localhost:5001';
window.KEYCLOAK_URL = 'http://localhost:8080';
window.KEYCLOAK_REALM = 'notes';
window.KEYCLOAK_CLIENT_ID = 'notes-frontend';
```

## Frontend Flow

1. `App.tsx` dispatches `initializeAuth()` on startup.
2. `features/auth/utils/keycloak.ts` runs `keycloak.init()` with `check-sso`.
3. On success, Redux stores the authenticated user and access token.
4. `apiManager.ts` attaches the current token to requests.
5. If the API responds with `401`, the client attempts a silent Keycloak refresh and retries once.

## Token Storage

The frontend does not persist bearer tokens to `localStorage`.

Current behavior:

- Redux holds the active token for the running session.
- Keycloak remains the source of truth for refresh and expiration.
- `apiManager.ts` can read the token from Redux or directly from the in-memory Keycloak client.

## Access Status

`authSlice` tracks an `accessStatus` field:

- `unknown`
- `authorized`
- `unauthorized`

This is used to distinguish "not checked yet" from "authenticated but blocked by authorization."

## Backend Contract

The API validates JWT bearer tokens issued by Keycloak. Most endpoints require auth; the file download endpoint stays anonymous so embedded media can render directly.

## Related Files

- `src/store/authSlice.ts`
- `src/features/auth/utils/keycloak.ts`
- `src/lib/apiManager.ts`
- `api/EpoznamkyApi/Program.cs`
