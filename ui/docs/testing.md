# Testing

This project uses [Vitest](https://vitest.dev/) for unit and integration testing, and [Playwright](https://playwright.dev/) for end-to-end testing.

## Overview

| Test Type | Tool | Purpose |
|-----------|------|---------|
| **Unit Tests** | Vitest | Test individual functions and components |
| **Integration Tests** | Vitest + Testing Library | Test component interactions |
| **E2E Tests** | Playwright | Test full user flows in real browsers |

## Vitest Setup

### Configuration

`vite.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/api/generated/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

### Test Setup

`src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window properties
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
```

## Running Tests

### Unit Tests

```bash
# Watch mode (development)
npm run test

# Single run
npm run test:run

# With coverage
npm run test:coverage

# Run specific file
npm run test -- src/utils/formatDate.test.ts

# Run tests matching pattern
npm run test -- --grep "formatDate"
```

### E2E Tests

```bash
# Run all E2E tests
npm run pw:test

# Run with UI
npm run pw:test:ui

# Run specific test file
npx playwright test tests/auth.spec.ts

# Debug mode
npx playwright test --debug
```

## Writing Unit Tests

### Testing Utilities

`src/utils/formatDate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('January 15, 2024');
  });

  it('handles invalid date', () => {
    expect(formatDate(null)).toBe('');
  });

  it('accepts custom format', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
  });
});
```

### Testing Hooks

`src/hooks/useDebouncedValue.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });
});
```

## Testing React Components

### Test Utilities

`src/test/utils.tsx`:

```typescript
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { setupStore, RootState } from '@/store';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    route = '/',
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  const store = setupStore(preloadedState);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <MemoryRouter initialEntries={[route]}>
              {children}
            </MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return {
    store,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export * from '@testing-library/react';
```

### Component Tests

`src/components/Header/Header.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { Header } from './index';

describe('Header', () => {
  it('renders logo', () => {
    renderWithProviders(<Header />);
    expect(screen.getByAltText('Logo')).toBeInTheDocument();
  });

  it('displays user name when authenticated', () => {
    renderWithProviders(<Header />, {
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: { firstName: 'John', lastName: 'Doe' },
        },
      },
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('opens user menu on click', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Header />, {
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: { firstName: 'John' },
        },
      },
    });

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
```

### Testing with MSW

`src/components/UserList/UserList.test.tsx`:

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/utils';
import { UserList } from './index';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserList', () => {
  it('displays loading state initially', () => {
    renderWithProviders(<UserList />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays users after loading', async () => {
    renderWithProviders(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json(
          { message: 'Server error' },
          { status: 500 }
        );
      })
    );

    renderWithProviders(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Testing Redux

### Testing Reducers

`src/store/authSlice.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import authSlice, { setToken, clearAuth } from './authSlice';

describe('authSlice', () => {
  const initialState = {
    isAuthenticated: false,
    isLoading: false,
    token: undefined,
    user: null,
    error: null,
  };

  it('should return initial state', () => {
    expect(authSlice.reducer(undefined, { type: 'unknown' })).toEqual(
      initialState
    );
  });

  it('should handle setToken', () => {
    const state = authSlice.reducer(initialState, setToken('test-token'));
    expect(state.token).toBe('test-token');
  });

  it('should handle clearAuth', () => {
    const authenticatedState = {
      ...initialState,
      isAuthenticated: true,
      token: 'some-token',
      user: { firstName: 'John' },
    };

    const state = authSlice.reducer(authenticatedState, clearAuth());
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeUndefined();
    expect(state.user).toBeNull();
  });
});
```

### Testing Async Thunks

```typescript
import { describe, it, expect, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authSlice, { initializeAuth } from './authSlice';

// Mock keycloak
vi.mock('@/features/auth/utils/keycloak', () => ({
  initKeycloak: vi.fn().mockResolvedValue(true),
  keycloak: {
    token: 'mock-token',
    subject: 'user-id',
    tokenParsed: {
      preferred_username: 'john',
      email: 'john@example.com',
    },
  },
}));

describe('initializeAuth thunk', () => {
  it('sets authenticated state on success', async () => {
    const store = configureStore({
      reducer: { auth: authSlice.reducer },
    });

    await store.dispatch(initializeAuth());

    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('mock-token');
  });
});
```

## Playwright E2E Tests

### Configuration

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev:mock',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Writing E2E Tests

`tests/home.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays welcome message', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  });

  test('navigates to settings', async ({ page }) => {
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL('/settings');
  });
});
```

### Testing Authentication Flow

`tests/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    // Clear any stored tokens
    await page.context().clearCookies();

    await page.goto('/');

    // In real app, would redirect to Keycloak
    // With MSW, we simulate authenticated state
  });

  test('shows user menu when authenticated', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /user menu/i }).click();
    await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();
  });
});
```

### Page Object Model

`tests/pages/HomePage.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly userMenu: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.getByRole('heading', { name: /welcome/i });
    this.userMenu = page.getByRole('button', { name: /user menu/i });
    this.settingsLink = page.getByRole('link', { name: /settings/i });
  }

  async goto() {
    await this.page.goto('/');
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async navigateToSettings() {
    await this.settingsLink.click();
  }
}
```

Usage:

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';

test('user can navigate to settings', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.navigateToSettings();
  await expect(page).toHaveURL('/settings');
});
```

## Test Coverage

### Generating Coverage Reports

```bash
npm run test:coverage
```

This generates:
- Terminal output with coverage summary
- HTML report in `coverage/` directory
- LCOV report for CI integration

### Coverage Thresholds

Add to `vite.config.ts`:

```typescript
test: {
  coverage: {
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
}
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Good - Tests behavior
it('shows error when form is invalid', async () => {
  renderWithProviders(<LoginForm />);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});

// Avoid - Tests implementation
it('calls setError with correct params', () => {
  // Don't test internal state changes
});
```

### 2. Use Testing Library Queries Correctly

```typescript
// Priority order (best to worst):
// 1. getByRole - accessible to everyone
screen.getByRole('button', { name: /submit/i });

// 2. getByLabelText - for form elements
screen.getByLabelText(/email/i);

// 3. getByPlaceholderText - if label not available
screen.getByPlaceholderText(/enter email/i);

// 4. getByText - for non-interactive elements
screen.getByText(/welcome/i);

// 5. getByTestId - last resort
screen.getByTestId('custom-element');
```

### 3. Async Testing

```typescript
// Use waitFor for async assertions
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Use findBy* for elements that appear asynchronously
const element = await screen.findByText('Loaded');
```

### 4. Mock Sparingly

```typescript
// Mock external services, not internal logic
vi.mock('@/lib/apiManager'); // OK - external service
vi.mock('@/utils/formatDate'); // Avoid - test real implementation
```
