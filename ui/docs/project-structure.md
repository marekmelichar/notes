# Project Structure

This document explains the folder organization and architecture of the starter template.

## Overview

The project follows a feature-based architecture with clear separation of concerns:

```
src/
├── components/    # Shared UI components
├── config/        # Application configuration
├── features/      # Feature modules (domain logic)
├── hooks/         # Custom React hooks
├── i18n/          # Internationalization
├── lib/           # Shared libraries
├── mocks/         # API mocking (MSW)
├── pages/         # Page components
├── store/         # Redux store
├── theme/         # MUI theming
├── types/         # TypeScript types
└── utils/         # Utility functions
```

## Directory Details

### `/src/components`

Reusable UI components that are not tied to specific features.

```
components/
├── ErrorBoundary/     # React error boundary
│   ├── index.tsx
│   └── index.module.css
├── Header/            # App header with user menu
├── LanguageSwitch/    # Language selector dropdown
├── LoadingFallback/   # Suspense fallback component
├── MainLayout/        # App shell (header + sidebar + content)
├── SideBar/           # Navigation sidebar
├── ThemeToggle/       # Dark/light mode toggle
└── index.ts           # Barrel export
```

**Usage:**
```typescript
import { Header, SideBar, LoadingFallback } from '@/components';
```

### `/src/config`

Application-wide configuration and constants.

```
config/
├── app.ts         # App constants (timeouts, dimensions)
├── endpoints.ts   # API endpoint constants
├── env.ts         # Environment variable validation
├── routes.ts      # Route path constants
└── index.ts       # Barrel export
```

**Example - `routes.ts`:**
```typescript
export const ROUTE_HOME = '/';
export const ROUTE_SETTINGS = 'settings';
```

**Example - `app.ts`:**
```typescript
export const SNACKBARS_AUTOHIDE_DURATION = 10000;
export const HEADER_HEIGHT = 64;
export const SIDEBAR_WIDTH = 80;
```

### `/src/features`

Feature modules containing domain-specific logic. Each feature is self-contained.

```
features/
└── auth/
    ├── components/
    │   └── ProtectedRoute/    # Route guard component
    ├── utils/
    │   └── keycloak.ts        # Keycloak initialization
    └── index.ts               # Feature exports
```

**Adding a new feature:**
```
features/
└── users/
    ├── components/
    │   ├── UserList/
    │   └── UserForm/
    ├── hooks/
    │   └── useUsers.ts
    ├── types/
    │   └── user.ts
    └── index.ts
```

### `/src/hooks`

Custom React hooks for shared logic.

```
hooks/
├── createStateHook.ts    # Factory for Redux state hooks
├── useAppVersion.ts      # Fetch app version
├── useAuth.ts            # Authentication state & actions
├── useAuthMutation.ts    # Auth-aware mutations
├── useAuthQuery.ts       # Auth-aware queries
├── useDebouncedValue.ts  # Debounce values
├── useQueryParams.ts     # URL query parameters
└── index.ts
```

**Example - `useAuth.ts`:**
```typescript
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  return {
    isAuthenticated,
    user,
    login: () => dispatch(login()),
    logout: () => dispatch(logout()),
  };
};
```

### `/src/lib`

Shared libraries and utilities that don't fit elsewhere.

```
lib/
├── apiManager.tsx    # Axios instance with auth interceptors
└── index.ts
```

**Key features of `apiManager.tsx`:**
- Automatic Bearer token injection
- Token refresh on 401 errors
- Request queuing during token refresh
- Session expiration handling

### `/src/mocks`

Mock Service Worker (MSW) configuration for API mocking.

```
mocks/
├── browser.ts     # MSW worker setup
├── handlers.ts    # API mock handlers
└── index.ts
```

**Adding mock handlers:**
```typescript
// handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
    ]);
  }),
];
```

### `/src/pages`

Page-level components, one per route.

```
pages/
├── HomePage/
│   └── index.tsx
├── SettingsPage/
│   └── index.tsx
└── NotFoundPage/
    └── index.tsx
```

Pages are lazy-loaded in `App.tsx`:
```typescript
const HomePage = lazy(() => import('./pages/HomePage'));
```

### `/src/store`

Redux store configuration.

```
store/
├── authSlice.ts    # Authentication state
└── index.ts        # Store setup & typed hooks
```

**Typed hooks:**
```typescript
// Use these instead of useDispatch/useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### `/src/theme`

MUI theme customization.

```
theme/
├── ThemeProvider.tsx   # Theme context & provider
├── lightTheme.ts       # Light theme config
├── darkTheme.ts        # Dark theme config
├── lightPalette.ts     # Light color palette
├── darkPalette.ts      # Dark color palette
├── typography.ts       # Typography settings
├── components.ts       # Component overrides
└── index.ts
```

### `/src/types`

Shared TypeScript types.

```
types/
├── apiErrors.ts    # API error types
└── index.ts
```

### `/src/utils`

Utility functions.

```
utils/
├── errorHandler.ts              # Error handling utilities
├── formatDate.ts                # Date formatting
├── formatUnixTimestamp.ts       # Unix timestamp formatting
├── logger.ts                    # Logging utility
├── parseFormattedDateToTimestamp.ts
└── index.ts
```

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase folder | `Header/index.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | camelCase | `apiErrors.ts` |
| Styles | `*.module.css` | `index.module.css` |
| Tests | `*.test.tsx` or `*.spec.tsx` | `Header.test.tsx` |

## Import Order

Follow this import order for consistency:

```typescript
// 1. React
import React, { useState, useEffect } from 'react';

// 2. External libraries
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

// 3. Internal absolute imports (@/)
import { useAuth } from '@/hooks';
import { ROUTE_HOME } from '@/config';

// 4. Relative imports
import styles from './index.module.css';
```

## Adding New Directories

When adding new directories, update:
1. `tsconfig.json` if adding path aliases
2. `vite.config.ts` for build configuration
3. Relevant barrel exports (`index.ts`)
