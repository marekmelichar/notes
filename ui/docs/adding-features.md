# Adding Features

This guide explains how to add new features to the starter template following established patterns and best practices.

## Feature Structure

Each feature is a self-contained module in `src/features/`:

```
src/features/
└── users/                    # Feature name (plural, lowercase)
    ├── components/           # Feature-specific components
    │   ├── UserList/
    │   │   ├── index.tsx
    │   │   └── index.module.css
    │   └── UserForm/
    │       └── index.tsx
    ├── hooks/               # Feature-specific hooks
    │   └── useUsers.ts
    ├── types/               # Feature types
    │   └── user.ts
    ├── utils/               # Feature utilities
    │   └── userValidation.ts
    └── index.ts             # Barrel export
```

## Step-by-Step Guide

### 1. Create Feature Directory

```bash
mkdir -p src/features/users/{components,hooks,types,utils}
```

### 2. Define Types

`src/features/users/types/user.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
}

export interface UpdateUserInput extends Partial<CreateUserInput> {
  id: string;
}
```

### 3. Create Components

#### List Component

`src/features/users/components/UserList/index.tsx`:

```typescript
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useGetUsers } from '@/api/generated/users';
import { UserCard } from '../UserCard';
import styles from './index.module.css';

export const UserList = () => {
  const { t } = useTranslation();
  const { data: users, isLoading, error } = useGetUsers();

  if (isLoading) {
    return (
      <Box className={styles.loading}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper className={styles.error}>
        <Typography color="error">{t('Users.LoadError')}</Typography>
      </Paper>
    );
  }

  if (!users?.length) {
    return (
      <Paper className={styles.empty}>
        <Typography>{t('Users.NoUsers')}</Typography>
      </Paper>
    );
  }

  return (
    <Box className={styles.container}>
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </Box>
  );
};
```

#### Form Component

`src/features/users/components/UserForm/index.tsx`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CreateUserInput } from '../../types/user';

const userSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'user']),
});

interface UserFormProps {
  onSubmit: (data: CreateUserInput) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<CreateUserInput>;
}

export const UserForm = ({
  onSubmit,
  isSubmitting,
  defaultValues,
}: UserFormProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'user',
      ...defaultValues,
    },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TextField
        {...register('email')}
        label={t('Users.Email')}
        error={!!errors.email}
        helperText={errors.email?.message}
      />

      <TextField
        {...register('firstName')}
        label={t('Users.FirstName')}
        error={!!errors.firstName}
        helperText={errors.firstName?.message}
      />

      <TextField
        {...register('lastName')}
        label={t('Users.LastName')}
        error={!!errors.lastName}
        helperText={errors.lastName?.message}
      />

      <FormControl>
        <InputLabel>{t('Users.Role')}</InputLabel>
        <Select {...register('role')} label={t('Users.Role')}>
          <MenuItem value="user">{t('Users.RoleUser')}</MenuItem>
          <MenuItem value="admin">{t('Users.RoleAdmin')}</MenuItem>
        </Select>
      </FormControl>

      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {isSubmitting ? t('Common.Saving') : t('Common.Save')}
      </Button>
    </Box>
  );
};
```

### 4. Create Custom Hooks

`src/features/users/hooks/useUsers.ts`:

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useTranslation } from 'react-i18next';
import {
  useGetUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '@/api/generated/users';

export const useUsers = () => {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const usersQuery = useGetUsers();

  const createMutation = useCreateUser({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar(t('Users.CreateSuccess'), { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar(t('Users.CreateError'), { variant: 'error' });
    },
  });

  const updateMutation = useUpdateUser({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar(t('Users.UpdateSuccess'), { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar(t('Users.UpdateError'), { variant: 'error' });
    },
  });

  const deleteMutation = useDeleteUser({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      enqueueSnackbar(t('Users.DeleteSuccess'), { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar(t('Users.DeleteError'), { variant: 'error' });
    },
  });

  return {
    users: usersQuery.data,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    createUser: createMutation.mutate,
    updateUser: updateMutation.mutate,
    deleteUser: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
```

### 5. Create Barrel Export

`src/features/users/index.ts`:

```typescript
// Components
export { UserList } from './components/UserList';
export { UserForm } from './components/UserForm';
export { UserCard } from './components/UserCard';

// Hooks
export { useUsers } from './hooks/useUsers';

// Types
export type { User, CreateUserInput, UpdateUserInput } from './types/user';
```

### 6. Create Page Component

`src/pages/UsersPage/index.tsx`:

```typescript
import { useState } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { UserList, UserForm, useUsers, CreateUserInput } from '@/features/users';

const UsersPage = () => {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { createUser, isCreating } = useUsers();

  const handleCreate = (data: CreateUserInput) => {
    createUser(data, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{t('Users.Title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsFormOpen(true)}
        >
          {t('Users.AddUser')}
        </Button>
      </Box>

      <UserList />

      <Dialog open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <DialogTitle>{t('Users.AddUser')}</DialogTitle>
        <DialogContent>
          <UserForm onSubmit={handleCreate} isSubmitting={isCreating} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
```

### 7. Add Route

`src/App.tsx`:

```typescript
import { lazy } from 'react';

const UsersPage = lazy(() => import('./pages/UsersPage'));

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTE_HOME,
        element: <MainLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'users', element: <UsersPage /> },  // Add route
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
```

### 8. Add Navigation

`src/components/SideBar/index.tsx`:

```typescript
import { People as PeopleIcon } from '@mui/icons-material';

const pages = [
  { title: t('Common.Nav.Home'), href: ROUTE_HOME, component: <HomeIcon /> },
  { title: t('Common.Nav.Users'), href: '/users', component: <PeopleIcon /> },
  { title: t('Common.Nav.Settings'), href: '/settings', component: <SettingsIcon /> },
];
```

### 9. Add Translations

`public/locales/en/translation.json`:

```json
{
  "Common": {
    "Nav": {
      "Users": "Users"
    }
  },
  "Users": {
    "Title": "Users",
    "AddUser": "Add User",
    "Email": "Email",
    "FirstName": "First Name",
    "LastName": "Last Name",
    "Role": "Role",
    "RoleUser": "User",
    "RoleAdmin": "Admin",
    "NoUsers": "No users found",
    "LoadError": "Failed to load users",
    "CreateSuccess": "User created successfully",
    "CreateError": "Failed to create user",
    "UpdateSuccess": "User updated successfully",
    "UpdateError": "Failed to update user",
    "DeleteSuccess": "User deleted successfully",
    "DeleteError": "Failed to delete user"
  }
}
```

### 10. Add Mock Handlers

`src/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

const users = [
  { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe', role: 'admin' },
  { id: '2', email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith', role: 'user' },
];

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json(users);
  }),

  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === params.id);
    if (!user) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    const newUser = { id: crypto.randomUUID(), ...body };
    users.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const body = await request.json();
    const index = users.findIndex((u) => u.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    users[index] = { ...users[index], ...body };
    return HttpResponse.json(users[index]);
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const index = users.findIndex((u) => u.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 });
    }
    users.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
```

## Adding State (Redux)

If your feature needs global state:

### 1. Create Slice

`src/store/usersSlice.ts`:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/features/users';

interface UsersState {
  selectedUser: User | null;
  filters: {
    role: 'all' | 'admin' | 'user';
    search: string;
  };
}

const initialState: UsersState = {
  selectedUser: null,
  filters: {
    role: 'all',
    search: '',
  },
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    selectUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    },
    setRoleFilter: (state, action: PayloadAction<'all' | 'admin' | 'user'>) => {
      state.filters.role = action.payload;
    },
    setSearchFilter: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
    },
  },
});

export const { selectUser, setRoleFilter, setSearchFilter } = usersSlice.actions;
export default usersSlice;
```

### 2. Add to Store

`src/store/index.ts`:

```typescript
import usersSlice from './usersSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    users: usersSlice.reducer,
  },
});
```

## Checklist

When adding a new feature, ensure you have:

- [ ] Created feature directory structure
- [ ] Defined TypeScript types
- [ ] Created reusable components
- [ ] Added custom hooks if needed
- [ ] Created barrel export (`index.ts`)
- [ ] Created page component
- [ ] Added route in `App.tsx`
- [ ] Added navigation link in SideBar
- [ ] Added translations (all languages)
- [ ] Added mock handlers for development
- [ ] Added Redux slice if needed
- [ ] Written unit tests
- [ ] Written E2E tests
- [ ] Updated documentation if needed

## Best Practices

### 1. Keep Features Independent

Features should not import from other features directly. Use shared components and hooks instead:

```typescript
// Good - Import from shared
import { useAuth } from '@/hooks';
import { Button } from '@/components';

// Avoid - Import from another feature
import { SomeComponent } from '@/features/other-feature';
```

### 2. Colocate Related Code

Keep related code together within the feature:

```typescript
// Good - Types near usage
src/features/users/types/user.ts

// Avoid - Types in global folder
src/types/user.ts
```

### 3. Use Barrel Exports

Export only what's needed:

```typescript
// index.ts - Only export public API
export { UserList } from './components/UserList';
export type { User } from './types/user';

// Don't export internal utilities
// export { validateUser } from './utils/validation';
```

### 4. Follow Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Feature folder | plural, lowercase | `users`, `products` |
| Component folder | PascalCase | `UserList`, `UserForm` |
| Hook file | camelCase with `use` | `useUsers.ts` |
| Type file | camelCase | `user.ts` |
| Translation key | PascalCase | `Users.Title` |
