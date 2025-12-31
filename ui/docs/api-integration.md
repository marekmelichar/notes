# API Integration

This project uses [Axios](https://axios-http.com/) for HTTP requests, [TanStack Query](https://tanstack.com/query) for data fetching, and [Orval](https://orval.dev/) for generating typed API hooks from OpenAPI specifications.

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Components    │────▶│  Generated Hooks │────▶│   API Manager   │
│                 │◀────│  (React Query)   │◀────│    (Axios)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   Backend API   │
                                                └─────────────────┘
```

## API Manager

The `apiManager` is a configured Axios instance with authentication handling.

### Configuration

`src/lib/apiManager.tsx`:

```typescript
import axios from 'axios';
import { getAuthToken, setAuthToken } from './tokenStorage';

export const apiManager = axios.create({
  baseURL: window.API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiManager.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors
apiManager.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt token refresh
        const refreshed = await keycloak.updateToken(-1);
        if (refreshed && keycloak.token) {
          setAuthToken(keycloak.token);
          originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
          return apiManager(originalRequest);
        }
      } catch (refreshError) {
        // Token refresh failed - session expired
        showSessionExpiredMessage();
      }
    }

    return Promise.reject(error);
  }
);
```

### Token Storage

```typescript
const AUTH_TOKEN_KEY = 'APP_AUTH_TOKEN';

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, `Bearer ${token}`);
};

export const getAuthToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};
```

## Orval Code Generation

Orval generates typed React Query hooks from your OpenAPI specification.

### Configuration

`orval.config.ts`:

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: './openapi.yaml', // Your OpenAPI spec
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/models',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/lib/apiManager.tsx',
          name: 'apiManager',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
```

### Generate API Hooks

```bash
npm run api:generate
```

This creates:
- `src/api/generated/` - React Query hooks for each API tag
- `src/api/models/` - TypeScript interfaces for all schemas

### Generated Hook Example

Given this OpenAPI endpoint:

```yaml
paths:
  /users:
    get:
      operationId: getUsers
      tags: [users]
      responses:
        200:
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
```

Orval generates:

```typescript
// src/api/generated/users.ts
export const useGetUsers = <TData = User[]>(
  options?: UseQueryOptions<User[], Error, TData>
) => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiManager.get<User[]>('/users').then(res => res.data),
    ...options,
  });
};
```

## Using Generated Hooks

### Basic Query

```typescript
import { useGetUsers } from '@/api/generated/users';

const UserList = () => {
  const { data: users, isLoading, error } = useGetUsers();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <ul>
      {users?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};
```

### With Parameters

```typescript
import { useGetUserById } from '@/api/generated/users';

const UserProfile = ({ userId }: { userId: string }) => {
  const { data: user } = useGetUserById(userId);

  return <div>{user?.name}</div>;
};
```

### Mutations

```typescript
import { useCreateUser } from '@/api/generated/users';

const CreateUserForm = () => {
  const { mutate: createUser, isPending } = useCreateUser();

  const handleSubmit = (data: CreateUserInput) => {
    createUser(
      { data },
      {
        onSuccess: (newUser) => {
          enqueueSnackbar('User created!', { variant: 'success' });
        },
        onError: (error) => {
          enqueueSnackbar('Failed to create user', { variant: 'error' });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isPending}>Create</button>
    </form>
  );
};
```

## Auth-Aware Hooks

### useAuthQuery

`src/hooks/useAuthQuery.ts`:

```typescript
import { useAuth } from './useAuth';
import { useSnackbar } from 'notistack';

interface UseAuthQueryOptions {
  errorMessage?: string;
  showError?: boolean;
}

export const useAuthQuery = <TData, TError>(
  queryHook: () => UseQueryResult<TData, TError>,
  options: UseAuthQueryOptions = {}
) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const result = queryHook({
    enabled: isAuthenticated && !authLoading,
  });

  useEffect(() => {
    if (result.error && options.showError !== false) {
      enqueueSnackbar(
        options.errorMessage || 'Failed to load data',
        { variant: 'error' }
      );
    }
  }, [result.error]);

  return {
    ...result,
    isLoading: authLoading || result.isLoading,
  };
};
```

### Usage

```typescript
const { data, isLoading, error } = useAuthQuery(
  () => useGetUsers(),
  { errorMessage: 'Failed to load users' }
);
```

### useAuthMutation

`src/hooks/useAuthMutation.ts`:

```typescript
export const useAuthMutation = <TData, TError, TVariables>(
  mutationHook: () => UseMutationResult<TData, TError, TVariables>,
  options: {
    successMessage?: string;
    errorMessage?: string;
  } = {}
) => {
  const { enqueueSnackbar } = useSnackbar();

  const mutation = mutationHook();

  const mutateWithFeedback = (
    variables: TVariables,
    callbacks?: {
      onSuccess?: (data: TData) => void;
      onError?: (error: TError) => void;
    }
  ) => {
    mutation.mutate(variables, {
      onSuccess: (data) => {
        if (options.successMessage) {
          enqueueSnackbar(options.successMessage, { variant: 'success' });
        }
        callbacks?.onSuccess?.(data);
      },
      onError: (error) => {
        enqueueSnackbar(
          options.errorMessage || 'Operation failed',
          { variant: 'error' }
        );
        callbacks?.onError?.(error);
      },
    });
  };

  return {
    ...mutation,
    mutateWithFeedback,
  };
};
```

## Mock Service Worker (MSW)

For development without a backend, use MSW to mock API responses.

### Setup

`src/mocks/browser.ts`:

```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### Defining Handlers

`src/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET /api/users
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ]);
  }),

  // GET /api/users/:id
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      name: 'John Doe',
      email: 'john@example.com',
    });
  }),

  // POST /api/users
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: crypto.randomUUID(), ...body },
      { status: 201 }
    );
  }),

  // Error response
  http.get('/api/error', () => {
    return HttpResponse.json(
      { message: 'Something went wrong' },
      { status: 500 }
    );
  }),
];
```

### Starting MSW

`src/main.tsx`:

```typescript
async function enableMocking() {
  if (window.MOCK_MODE) {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
  );
});
```

### Development Script

```bash
npm run dev:mock  # Starts with MOCK_MODE=true
```

## Error Handling

### API Error Types

`src/types/apiErrors.ts`:

```typescript
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  );
};
```

### Error Handler Utility

`src/utils/errorHandler.ts`:

```typescript
import { AxiosError } from 'axios';
import i18n from '@/i18n';

export const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;

    switch (status) {
      case 400:
        return i18n.t('Errors.BadRequest');
      case 401:
        return i18n.t('Errors.Unauthorized');
      case 403:
        return i18n.t('Errors.Forbidden');
      case 404:
        return i18n.t('Errors.NotFound');
      case 500:
        return i18n.t('Errors.ServerError');
      default:
        return error.message || i18n.t('Errors.Unknown');
    }
  }

  return i18n.t('Errors.Unknown');
};
```

## Query Client Configuration

### Default Options

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### Query Invalidation

After mutations, invalidate related queries:

```typescript
const queryClient = useQueryClient();

const { mutate: createUser } = useCreateUser({
  onSuccess: () => {
    // Invalidate and refetch users list
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

## Best Practices

### 1. Use Generated Hooks

Always prefer generated hooks over manual API calls:

```typescript
// Good
const { data } = useGetUsers();

// Avoid
const [users, setUsers] = useState([]);
useEffect(() => {
  apiManager.get('/users').then(res => setUsers(res.data));
}, []);
```

### 2. Handle Loading and Error States

```typescript
const { data, isLoading, error } = useGetUsers();

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data?.length) return <EmptyState />;

return <UserList users={data} />;
```

### 3. Use Optimistic Updates

```typescript
const { mutate } = useUpdateUser({
  onMutate: async (newUser) => {
    await queryClient.cancelQueries({ queryKey: ['users'] });
    const previous = queryClient.getQueryData(['users']);
    queryClient.setQueryData(['users'], (old) =>
      old?.map(u => u.id === newUser.id ? newUser : u)
    );
    return { previous };
  },
  onError: (err, newUser, context) => {
    queryClient.setQueryData(['users'], context?.previous);
  },
});
```

### 4. Prefetch Data

```typescript
// Prefetch on hover
const handleHover = () => {
  queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: () => apiManager.get(`/users/${userId}`),
  });
};
```
