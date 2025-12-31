# State Management

This project uses [Redux Toolkit](https://redux-toolkit.js.org/) for global state management combined with [TanStack Query](https://tanstack.com/query) for server state.

## Overview

The state management strategy follows a clear separation:

| State Type | Solution | Use Case |
|------------|----------|----------|
| **Server State** | TanStack Query | API data, caching, synchronization |
| **Global UI State** | Redux Toolkit | Auth, theme, app-wide settings |
| **Local UI State** | React useState | Component-specific state |
| **Form State** | React Hook Form | Form inputs and validation |

## Redux Store Setup

### Store Configuration

`src/store/index.ts`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Typed Hooks

Always use typed hooks instead of plain `useDispatch` and `useSelector`:

```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

## Auth Slice

The authentication slice manages user session state.

### State Interface

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
```

### Async Thunks

`src/store/authSlice.ts`:

```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Initialize authentication
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
          email: keycloak.tokenParsed?.email,
          firstName: keycloak.tokenParsed?.given_name,
          lastName: keycloak.tokenParsed?.family_name,
        },
      };
    }
    return { authenticated: false, token: undefined, user: null };
  }
);

// Logout
export const logout = createAsyncThunk('auth/logout', async () => {
  keycloak.logout({ redirectUri: window.location.origin });
});
```

### Slice Definition

```typescript
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.token = undefined;
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.authenticated;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Authentication failed';
      });
  },
});
```

## Using Redux State

### Selecting State

```typescript
import { useAppSelector } from '@/store';

const MyComponent = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  return <div>Welcome, {user?.firstName}</div>;
};
```

### Dispatching Actions

```typescript
import { useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';

const LogoutButton = () => {
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return <button onClick={handleLogout}>Logout</button>;
};
```

## Creating Custom Hooks

### The `useAuth` Hook

`src/hooks/useAuth.ts`:

```typescript
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, initializeAuth } from '@/store/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);

  return {
    isAuthenticated,
    isLoading,
    user,
    token,
    logout: () => dispatch(logout()),
    initialize: () => dispatch(initializeAuth()),
  };
};
```

### State Hook Factory

`src/hooks/createStateHook.ts`:

```typescript
import { useAppSelector } from '@/store';
import { RootState } from '@/store';

export const createStateHook = <T>(selector: (state: RootState) => T) => {
  return () => useAppSelector(selector);
};

// Usage
export const useIsAuthenticated = createStateHook(
  (state) => state.auth.isAuthenticated
);
```

## TanStack Query Integration

### Query Client Setup

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Auth-Aware Queries

`src/hooks/useAuthQuery.ts`:

```typescript
import { useAuth } from './useAuth';

export const useAuthQuery = <TData, TError>(
  useQueryHook: () => UseQueryResult<TData, TError>,
  params: unknown[],
  options?: { errorMessage?: string }
) => {
  const { isAuthenticated } = useAuth();

  const result = useQueryHook(...params, {
    enabled: isAuthenticated,
  });

  // Handle errors with snackbar
  useEffect(() => {
    if (result.error && options?.errorMessage) {
      enqueueSnackbar(options.errorMessage, { variant: 'error' });
    }
  }, [result.error]);

  return result;
};
```

## Adding a New Slice

### 1. Create the Slice File

`src/store/settingsSlice.ts`:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  sidebarOpen: boolean;
  density: 'comfortable' | 'compact';
}

const initialState: SettingsState = {
  sidebarOpen: true,
  density: 'comfortable',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setDensity: (state, action: PayloadAction<'comfortable' | 'compact'>) => {
      state.density = action.payload;
    },
  },
});

export const { toggleSidebar, setDensity } = settingsSlice.actions;
export default settingsSlice;
```

### 2. Add to Store

```typescript
// src/store/index.ts
import settingsSlice from './settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    settings: settingsSlice.reducer,
  },
});
```

### 3. Create Custom Hook

```typescript
// src/hooks/useSettings.ts
export const useSettings = () => {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.settings.sidebarOpen);
  const density = useAppSelector((state) => state.settings.density);

  return {
    sidebarOpen,
    density,
    toggleSidebar: () => dispatch(toggleSidebar()),
    setDensity: (d: 'comfortable' | 'compact') => dispatch(setDensity(d)),
  };
};
```

## Best Practices

### 1. Keep Redux for Global State Only

```typescript
// Good - Global state that many components need
const authSlice = createSlice({ ... }); // Auth state
const settingsSlice = createSlice({ ... }); // App settings

// Avoid - Local UI state belongs in components
const modalSlice = createSlice({ ... }); // Use local state instead
```

### 2. Use Selectors for Derived State

```typescript
// src/store/selectors.ts
import { createSelector } from '@reduxjs/toolkit';

export const selectUserFullName = createSelector(
  [(state: RootState) => state.auth.user],
  (user) => user ? `${user.firstName} ${user.lastName}` : ''
);

// Usage
const fullName = useAppSelector(selectUserFullName);
```

### 3. Normalize Complex State

For complex nested data, consider normalizing:

```typescript
interface NormalizedState {
  byId: Record<string, Entity>;
  allIds: string[];
}
```

### 4. Use RTK Query for API Caching

For simpler API state management, consider RTK Query:

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => 'users',
    }),
  }),
});
```

## Debugging

### Redux DevTools

Redux DevTools is automatically enabled in development:

1. Install browser extension
2. Open DevTools and select "Redux" tab
3. Inspect state, actions, and time-travel

### React Query DevTools

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

## Testing Redux

### Testing Reducers

```typescript
import authSlice, { setToken } from './authSlice';

describe('authSlice', () => {
  it('should set token', () => {
    const state = authSlice.reducer(undefined, setToken('test-token'));
    expect(state.token).toBe('test-token');
  });
});
```

### Testing with Store

```typescript
import { renderWithProviders } from '@/test-utils';

test('displays user name', () => {
  renderWithProviders(<UserProfile />, {
    preloadedState: {
      auth: {
        user: { firstName: 'John' },
        isAuthenticated: true,
      },
    },
  });

  expect(screen.getByText('John')).toBeInTheDocument();
});
```
