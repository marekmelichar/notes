import {
  initKeycloak,
  keycloak,
  clearScheduledRefresh,
  setTokenRefreshCallback,
} from '@/features/auth/utils/keycloak';
import { clearAuthToken, setAuthToken } from '@/lib';
import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export type AccessStatus = 'unknown' | 'authorized' | 'unauthorized';

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
    roles?: string[];
    realmRoles?: string[];
  } | null;
  error: string | null;
  accessStatus: AccessStatus;
}

const initialState: IAuthState = {
  isAuthenticated: false,
  isLoading: true,
  token: undefined,
  user: null,
  error: null,
  accessStatus: 'unknown',
};

// Mock user for development mode
const mockUser = {
  id: 'mock-user-id',
  username: 'Mock User',
  email: 'mock@example.com',
  firstName: 'Mock',
  lastName: 'User',
  roles: ['admin'],
  realmRoles: ['admin'],
};

// Action dispatched internally when token is refreshed
export const updateToken = createAction<string>('auth/updateToken');

// Async thunk for initializing Keycloak
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const authenticated = await initKeycloak();
      if (authenticated) {
        if (window.MOCK_MODE) {
          return {
            authenticated: true,
            token: 'mock-token',
            user: mockUser,
          };
        }

        // Register callback to sync future token refreshes to Redux + localStorage
        setTokenRefreshCallback((token) => {
          setAuthToken(token);
          dispatch(updateToken(token));
        });

        return {
          authenticated,
          token: keycloak.token,
          user: {
            id: keycloak.subject,
            username: `${keycloak.tokenParsed?.given_name} ${keycloak.tokenParsed?.family_name}`,
            email: keycloak.tokenParsed?.email,
            firstName: keycloak.tokenParsed?.given_name,
            lastName: keycloak.tokenParsed?.family_name,
          },
        };
      }

      return { authenticated: false, token: undefined, user: null };
    } catch (error) {
      return rejectWithValue(`Failed to initialize authentication: ${error}`);
    }
  },
);

// Async thunk for login
export const login = createAsyncThunk('auth/login', async () => {
  keycloak.login();
});

// Async thunk for logout
export const logout = createAsyncThunk('auth/logout', async () => {
  clearScheduledRefresh();
  clearAuthToken();
  keycloak.logout({
    redirectUri: window.location.origin,
  });
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessStatus: (state, action: { payload: AccessStatus }) => {
      state.accessStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.authenticated;
        state.token = action.payload.token;
        setAuthToken(action.payload.token || '');
        state.user = action.payload.user;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })

      // Token refreshed silently
      .addCase(updateToken, (state, action) => {
        state.token = action.payload;
      })

      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.token = undefined;
        state.user = null;
        state.isLoading = false;
        state.accessStatus = 'unknown';
        setAuthToken('');
      });
  },
});

export const { setAccessStatus } = authSlice.actions;

// Selectors
export const selectAuthUser = (state: { auth: IAuthState }) => state.auth.user;
