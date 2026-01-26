# Implement 403 Forbidden "No Access" Page Feature

## Overview
Create a user-friendly "No Access" page that appears when an authenticated user tries to access the application but receives a 403 Forbidden response from the API (user is authenticated but lacks permissions).

## Requirements

### 1. Access Status State Management
Add an access status field to your auth state with three possible values:
- `'unknown'` - Initial state, haven't checked yet
- `'authorized'` - User has access (successful API response)
- `'unauthorized'` - User lacks permissions (403 from API)

### 2. API Interceptor Logic
In your API client (axios/fetch interceptor):

**On successful response:**
- If current access status is `'unknown'`, set it to `'authorized'`

**On 403 Forbidden error:**
- Set access status to `'unauthorized'`
- Don't show error notification (the NoAccessPage will handle UX)

### 3. Protected Route Logic
Your protected route wrapper should:
- Show loading spinner while `isLoading` is true
- Redirect to `/no-access` if `accessStatus === 'unauthorized'`
- Otherwise render the protected content

### 4. No Access Page Component
Create a page that shows:
- Clear "Access Denied" heading
- Explanation message
- Currently logged-in user's email
- "Try a different account" button that triggers logout

### 5. Route Configuration
Add `/no-access` route that's accessible without authorization (not wrapped in ProtectedRoute)

## Implementation Details

### Auth State Type
```typescript
type AccessStatus = 'unknown' | 'authorized' | 'unauthorized';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | undefined;
  user: User | null;
  accessStatus: AccessStatus;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  token: undefined,
  user: null,
  accessStatus: 'unknown', // Start as unknown
};
```

### Auth Slice Actions
```typescript
// Add a reducer to manually set access status
reducers: {
  setAccessStatus: (state, action: { payload: AccessStatus }) => {
    state.accessStatus = action.payload;
  },
}

// On logout, reset accessStatus to 'unknown'
.addCase(logout.fulfilled, (state) => {
  state.isAuthenticated = false;
  state.token = undefined;
  state.user = null;
  state.accessStatus = 'unknown'; // Reset
});
```

### API Interceptor (Axios)
```typescript
import { setAccessStatus } from '@/store/authSlice';
import { store } from '@/store';

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Mark as authorized on first successful response
    const currentStatus = store.getState().auth.accessStatus;
    if (currentStatus === 'unknown') {
      store.dispatch(setAccessStatus('authorized'));
    }
    return response;
  },
  (error: AxiosError) => {
    const statusCode = error.response?.status;

    // Handle 403 Forbidden
    if (statusCode === 403) {
      store.dispatch(setAccessStatus('unauthorized'));
      // Don't show error notification
      // ProtectedRoute will redirect to NoAccessPage
    }

    // Handle other errors...
    return Promise.reject(error);
  }
);
```

### Protected Route Component
```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { CircularProgress, Box } from '@mui/material';

export const ProtectedRoute = () => {
  const { isLoading, accessStatus } = useAppSelector((state) => state.auth);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to no-access if unauthorized (403)
  if (accessStatus === 'unauthorized') {
    return <Navigate to="/no-access" replace />;
  }

  // If not authenticated, auth provider will handle redirect
  return <Outlet />;
};
```

### No Access Page Component
```typescript
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';

const NoAccessPage = () => {
  const { logout, user } = useAuth();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Box textAlign="center" maxWidth="32rem" px={2}>
        <Typography variant="h4" component="h1" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          You don't have permission to access this application.
        </Typography>
        {user?.email && (
          <Typography variant="body2" color="text.secondary" mb={3}>
            Logged in as: {user.email}
          </Typography>
        )}
        <Button variant="contained" color="primary" onClick={logout}>
          Try a different account
        </Button>
      </Box>
    </Box>
  );
};

export default NoAccessPage;
```

### Routes Configuration
```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      // ... other protected routes
    ],
  },
  {
    // Not wrapped in ProtectedRoute - accessible while authenticated
    path: '/no-access',
    element: <NoAccessPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
```

## Testing Strategy

### Manual Testing
1. **Create user without permissions in your auth system**
2. **Login with that user**
3. **Verify API returns 403 for protected endpoints**
4. **Confirm automatic redirect to /no-access page**
5. **Verify user email is displayed**
6. **Click "Try different account" and verify logout works**

### Direct Navigation Test
Navigate directly to `http://localhost:3000/no-access` to verify the page renders correctly.

### State Test (Redux DevTools)
1. Login normally
2. Open Redux DevTools
3. Dispatch: `{ type: 'auth/setAccessStatus', payload: 'unauthorized' }`
4. Verify redirect to no-access page

## Backend Setup (Example)

To trigger 403 responses, your API should check user permissions and return:

```csharp
// .NET Example
if (!user.HasRequiredRole())
{
    return Forbid(); // Returns 403
}
```

```javascript
// Express.js Example
if (!user.hasPermission('access_app')) {
    return res.status(403).json({ message: 'Forbidden' });
}
```

## Key Design Decisions

1. **Why three states?**
   - `unknown` prevents false positives on initial load
   - `authorized` confirms successful API access
   - `unauthorized` triggers NoAccessPage

2. **Why set to authorized on first success?**
   - Optimistic: assume access granted after first successful call
   - Avoids unnecessary permission checks

3. **Why clear on logout?**
   - Next user might have different permissions
   - Fresh state for new session

4. **Why not show error notification for 403?**
   - NoAccessPage provides better UX
   - Prevents double messaging

## Common Pitfalls to Avoid

1. ❌ Don't wrap `/no-access` route in `ProtectedRoute` (creates redirect loop)
2. ❌ Don't forget to reset `accessStatus` on logout
3. ❌ Don't show both error toast and NoAccessPage for 403
4. ❌ Don't confuse 401 (unauthenticated) with 403 (unauthorized)

## Summary Flow

```
1. User logs in → accessStatus: 'unknown'
2. First API call succeeds → accessStatus: 'authorized'
3. User navigates normally
4. API returns 403 → accessStatus: 'unauthorized'
5. ProtectedRoute detects 'unauthorized'
6. Redirect to /no-access
7. User clicks logout → accessStatus reset to 'unknown'
```

## Implementation in This Project

This feature is fully implemented in the notes.nettio.eu application:

- **Auth State**: `ui/src/store/authSlice.ts`
- **API Interceptor**: `ui/src/lib/apiManager.tsx`
- **Protected Route**: `ui/src/features/auth/components/ProtectedRoute/index.tsx`
- **No Access Page**: `ui/src/pages/NoAccessPage/index.tsx`
- **Routes Config**: `ui/src/App.tsx`

## Related Documentation

- [Authentication Documentation](../ui/docs/authentication.md)
- [State Management](../ui/docs/state-management.md)
- [Testing Guide](TESTING.md)
