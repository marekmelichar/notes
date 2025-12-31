# Authentication

This project uses [Keycloak](https://www.keycloak.org/) for authentication, providing enterprise-grade SSO capabilities.

## Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Keycloak   │────▶│   Your App  │
│             │◀────│   Server    │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Authentication Flow:**
1. User visits the app
2. App checks for existing session via `check-sso`
3. If not authenticated, redirects to Keycloak login
4. Keycloak authenticates and redirects back with tokens
5. App stores token and makes authenticated API calls

## Configuration

### Environment Variables

Configure Keycloak in `public/env.js`:

```javascript
window.KEYCLOAK_URL = 'https://keycloak.example.com/auth';
window.KEYCLOAK_REALM = 'your-realm';
window.KEYCLOAK_CLIENT_ID = 'your-client-id';
window.MOCK_MODE = false; // Set to true to bypass auth
```

### Keycloak Client Setup

In Keycloak admin console:

1. Create a new client
2. Set **Client ID** (matches `KEYCLOAK_CLIENT_ID`)
3. Set **Valid Redirect URIs** to your app URL
4. Enable **Standard Flow**
5. Set **Web Origins** to your app URL

## Code Structure

### Keycloak Initialization

`src/features/auth/utils/keycloak.ts`:

```typescript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: window.KEYCLOAK_URL,
  realm: window.KEYCLOAK_REALM,
  clientId: window.KEYCLOAK_CLIENT_ID,
});

// Initialize with check-sso (doesn't force login)
const initKeycloakReal = (): Promise<boolean> => {
  return keycloak.init({
    onLoad: 'check-sso',
    pkceMethod: 'S256',
    flow: 'standard',
  }).then((authenticated) => {
    if (!authenticated) {
      keycloak.login();
    }
    return authenticated;
  });
};

// Mock mode - bypass Keycloak
const initKeycloakMock = (): Promise<boolean> => {
  return Promise.resolve(true);
};

export const initKeycloak = window.MOCK_MODE
  ? initKeycloakMock
  : initKeycloakReal;
```

### Auth State (Redux)

`src/store/authSlice.ts`:

```typescript
interface IAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | undefined;
  user: {
    id?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  error: string | null;
}

// Async thunk for initialization
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    const authenticated = await initKeycloak();
    if (authenticated) {
      return {
        authenticated,
        token: keycloak.token,
        user: {
          id: keycloak.subject,
          username: keycloak.tokenParsed?.preferred_username,
          // ...
        },
      };
    }
    return { authenticated: false, token: undefined, user: null };
  }
);
```

### Protected Route

`src/features/auth/components/ProtectedRoute/index.tsx`:

```typescript
export const ProtectedRoute = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  return <Outlet />;
};
```

## Usage

### Using the Auth Hook

```typescript
import { useAuth } from '@/hooks';

const MyComponent = () => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.firstName}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### Auth-Aware API Calls

```typescript
import { useAuthQuery } from '@/hooks';

// The query only runs when authenticated
const { data, isLoading } = useAuthQuery(
  useGetUsers, // Your generated hook
  [],          // Hook parameters
  { errorMessage: 'Failed to load users' }
);
```

### Accessing Token

```typescript
import { getAuthToken } from '@/lib';

const token = getAuthToken(); // Returns "Bearer xxx" or null
```

## Token Management

### Automatic Token Refresh

The `apiManager` handles token refresh automatically:

```typescript
// src/lib/apiManager.tsx
apiManager.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt silent token refresh
      const refreshed = await keycloak.updateToken(-1);
      if (refreshed) {
        // Retry the original request
        return apiManager(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);
```

### Token Storage

Tokens are stored in localStorage:

```typescript
const AUTH_TOKEN_KEY = 'APP_AUTH_TOKEN';

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, `Bearer ${token}`);
};

export const getAuthToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};
```

## Mock Mode

For development without Keycloak:

1. Set `window.MOCK_MODE = true` in `public/env.js`
2. Run `npm run dev:mock`

In mock mode:
- Keycloak initialization is bypassed
- A mock user is provided
- All API calls use MSW handlers

**Mock user:**
```typescript
const mockUser = {
  id: 'mock-user-id',
  username: 'Mock User',
  email: 'mock@example.com',
  firstName: 'Mock',
  lastName: 'User',
  roles: ['admin'],
};
```

## Session Handling

### Session Expiration

When a session expires:

1. API call returns 401
2. Token refresh is attempted
3. If refresh fails, show session expired message
4. User can click "Login" to re-authenticate

```typescript
const showSessionExpiredMessage = () => {
  enqueueSnackbar(i18n.t('Common.SessionExpired'), {
    variant: 'warning',
    persist: true,
    action: (snackbarId) => (
      <Button onClick={() => dispatch(logout())}>
        {i18n.t('Common.Login')}
      </Button>
    ),
  });
};
```

### Logout

```typescript
export const logout = createAsyncThunk('auth/logout', async () => {
  keycloak.logout({
    redirectUri: window.location.origin,
  });
});
```

## Security Best Practices

1. **Use HTTPS** in production
2. **Set short token lifetimes** in Keycloak
3. **Enable PKCE** (already configured)
4. **Validate tokens** on the backend
5. **Use secure cookies** when possible
6. **Implement CORS** properly on your API

## Troubleshooting

### Common Issues

**"Invalid redirect URI"**
- Check Keycloak client settings
- Ensure redirect URI matches exactly

**Token not refreshing**
- Check token lifetime in Keycloak
- Verify `updateToken` is being called

**CORS errors**
- Add your app URL to Keycloak's Web Origins
- Configure CORS on your API server

### Debug Mode

Enable Keycloak logging:

```typescript
keycloak.init({
  // ...
  enableLogging: true,
});
```
