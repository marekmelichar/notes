# 04 — Authentication (Keycloak OIDC)

## Overview

Authentication uses **Keycloak 26** with the **OpenID Connect (OIDC)** protocol and **PKCE** (Proof Key for Code Exchange) flow. The frontend is a **public client** (no client secret).

## Keycloak Configuration

### Realm: `notes`

| Setting | Dev Value | Prod Value |
|---------|-----------|------------|
| SSL Required | none | external |
| Registration | allowed | allowed |
| Email login | allowed | allowed |
| Brute force protection | enabled | enabled |
| Duplicate emails | not allowed | not allowed |
| Access token lifespan | default | 300s (5 min) |
| SSO session idle | default | 1800s (30 min) |
| SSO session max | default | 36000s (10 hours) |
| Offline session idle | default | 2592000s (30 days) |

### Client: `notes-frontend`

| Setting | Value |
|---------|-------|
| Client ID | `notes-frontend` |
| Client Type | Public (no secret) |
| Protocol | OpenID Connect |
| Standard Flow | Enabled |
| Direct Access Grants | Disabled |
| PKCE | S256 (enabled) |

### Redirect URIs (Production)

```
http://localhost:3000/*
http://localhost:5173/*
http://127.0.0.1:3000/*
http://host.docker.internal:3000/*
https://notes.nettio.eu/*
```

### Post-Logout Redirect URIs

```
http://localhost:3000/*
http://localhost:5173/*
https://notes.nettio.eu/*
```

### Realm Roles

| Role | Description |
|------|-------------|
| `user` | Default role for all registered users |
| `admin` | Administrative role |

### Test Users

| Username | Password | Email | Roles |
|----------|----------|-------|-------|
| testuser | testuser | test@example.com | user |
| demo | demo123 | demo@example.com | user |
| admin | admin123 | admin@example.com | user, admin |

## Frontend Authentication Flow

### 1. Initialization

On app mount, the auth system initializes:

```
App starts
  → initializeAuth() thunk dispatched
  → Keycloak.init({ onLoad: 'check-sso', pkceMethod: 'S256' })
  → If SSO session exists → user is authenticated silently
  → If no SSO session → user stays unauthenticated (no redirect yet)
```

**Key:** The initialization does NOT force a login redirect. It only checks if an existing SSO session is active.

### 2. Login Flow

When accessing a protected route without authentication:

```
User visits protected route
  → ProtectedRoute component checks isAuthenticated
  → If not authenticated → Keycloak handles redirect
  → Keycloak login page shown
  → User enters credentials
  → Redirect back to app with auth code
  → Keycloak JS exchanges code for tokens (PKCE)
  → Token stored in localStorage
  → User data extracted from JWT claims
  → App renders protected content
```

### 3. Token Storage

```typescript
// Token stored in localStorage with "Bearer " prefix
localStorage.setItem('LOGGED_CLIENT_TOKEN', `Bearer ${token}`);

// Retrieved for API calls
const token = localStorage.getItem('LOGGED_CLIENT_TOKEN');
// → "Bearer eyJhbGciOiJ..."
```

### 4. Token Refresh

Two mechanisms ensure tokens stay fresh:

**Background refresh (interval):**
```
Every 60 seconds:
  → keycloak.updateToken(70)  // Refresh if expiring within 70 seconds
  → If refreshed → update localStorage with new token
  → If refresh fails → log warning
```

**On-expiration callback:**
```
Token expires:
  → keycloak.onTokenExpired fires
  → keycloak.updateToken(30)  // Immediate refresh
  → If refreshed → update localStorage
  → If failed → dispatch login() to redirect to Keycloak
```

### 5. API Request Interceptor

Every API request includes the token:

```typescript
// Axios request interceptor
config.headers.Authorization = localStorage.getItem('LOGGED_CLIENT_TOKEN');
// → "Bearer eyJhbGciOiJ..."
```

### 6. 401 Response Handling (Silent Refresh)

```
API returns 401
  → Axios response interceptor catches it
  → Attempt keycloak.updateToken(5)
  → If refresh succeeds:
      → Update localStorage with new token
      → Retry original request with new token
  → If refresh fails:
      → Redirect to Keycloak login
```

Multiple concurrent 401s are queued — only one refresh attempt is made, and all queued requests are retried with the new token.

### 7. 403 Response Handling

```
API returns 403
  → Set accessStatus = 'unauthorized' in Redux auth state
  → ProtectedRoute detects accessStatus === 'unauthorized'
  → Redirect to /no-access page
  → Page shows user email + "Try a different account" button
  → Button triggers logout + re-login
```

### 8. Logout Flow

```
User clicks Logout
  → dispatch(logout())
  → clearAuthToken() from localStorage
  → cleanupKeycloak() (stop refresh interval)
  → keycloak.logout({ redirectUri: window.location.origin })
  → Keycloak clears SSO session
  → Redirect back to app (unauthenticated)
```

## JWT Claims Structure

The Keycloak JWT contains these relevant claims:

```json
{
  "sub": "keycloak-user-uuid",
  "preferred_username": "johndoe",
  "email": "john@example.com",
  "given_name": "John",
  "family_name": "Doe",
  "realm_access": {
    "roles": ["user", "admin"]
  }
}
```

### Claim Mapping (Frontend)

```typescript
interface AuthUser {
  id: string;           // JWT 'sub'
  username: string;     // JWT 'preferred_username'
  email: string;        // JWT 'email'
  firstName: string;    // JWT 'given_name'
  lastName: string;     // JWT 'family_name'
  roles: string[];      // JWT 'realm_access.roles' (client-level)
  realmRoles: string[]; // JWT 'realm_access.roles' (realm-level)
}
```

## Backend JWT Validation

The .NET API validates JWTs with:

```csharp
// Authority (Keycloak issuer URL)
Authority = "http://localhost:8080/realms/notes"  // configurable

// Token validation
ValidateIssuer = false        // Disabled for Docker (issuer URL mismatch)
ValidateAudience = false
ValidateLifetime = true
ValidateIssuerSigningKey = true
```

User identity extraction in controllers (priority order):
1. JWT `sub` claim → UserId
2. `NameIdentifier` claim → UserId (fallback)
3. `X-User-Id` header → UserId (development fallback)
4. `"anonymous"` → last resort fallback

## Mock Mode (Development)

When `window.MOCK_MODE = true` in `env.js`:

- Keycloak is NOT initialized
- A mock user is returned immediately:
  ```typescript
  {
    id: 'mock-user-id',
    username: 'Mock User',
    email: 'mock@example.com',
    firstName: 'Mock',
    lastName: 'User',
    roles: ['admin']
  }
  ```
- No real authentication occurs
- Useful for frontend-only development without Keycloak running

## Environment Variables for Auth

```javascript
// ui/public/env.js (or generated by Docker entrypoint)
window.KEYCLOAK_URL = 'http://localhost:8080';
window.KEYCLOAK_REALM = 'notes';
window.KEYCLOAK_CLIENT_ID = 'notes-frontend';
window.MOCK_MODE = false;
```

## Next.js Migration Notes

For the Next.js rebuild, consider:

1. **keycloak-js** works client-side only — use it in a client component or wrap initialization in `useEffect`
2. Alternatively, consider **next-auth** with the Keycloak provider for server-side session management
3. The API expects `Authorization: Bearer <token>` — this won't change regardless of frontend framework
4. Token refresh logic should be preserved (60-second interval + on-expiry callback)
5. The `/no-access` route and 403 handling pattern should be replicated
6. SSO check on load (`check-sso`) provides a smooth UX — user isn't forced to login if session exists
