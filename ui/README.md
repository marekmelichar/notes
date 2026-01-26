# notes.nettio.eu - Frontend

React frontend for notes.nettio.eu - a note-taking application with rich text editing, folder organization, and tag management.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Available Scripts](#available-scripts)
- [Tech Stack](#tech-stack)

## Features

| Feature | Technology | Description |
|---------|------------|-------------|
| **UI Framework** | React 19 | Latest React with concurrent features |
| **Build Tool** | Vite 7 | Lightning-fast HMR and builds |
| **Language** | TypeScript 5 | Full type safety |
| **UI Components** | MUI 6 | Material Design components |
| **State Management** | Redux Toolkit | Predictable state container |
| **Data Fetching** | TanStack Query | Powerful async state management |
| **Routing** | React Router 7 | Declarative routing |
| **Authentication** | Keycloak | Enterprise SSO solution |
| **Internationalization** | i18next | Multi-language support |
| **Forms** | React Hook Form + Zod | Type-safe form handling |
| **API Mocking** | MSW | Mock Service Worker for development |
| **API Generation** | Orval | OpenAPI to React Query hooks |
| **Unit Testing** | Vitest | Fast unit testing |
| **E2E Testing** | Playwright | Cross-browser E2E tests |
| **Code Quality** | ESLint + Prettier | Consistent code style |
| **Pre-commit** | Husky | Lint + build checks on commit |
| **Rich Text Editor** | BlockNote | Block-based note editing |
| **Theming** | MUI Theming | Dark/Light mode support |

## Quick Start

```bash
# 1. Start backend services (from repo root)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open http://localhost:5173
```

### Mock Mode (no backend)

```bash
npm run dev:mock
```

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
├── public/
│   ├── env.js              # Runtime environment config
│   ├── locales/            # Translation files
│   │   ├── en/translation.json
│   │   └── cs/translation.json
│   └── mockServiceWorker.js # MSW service worker
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ErrorBoundary/  # Error handling
│   │   ├── Header/         # App header with user menu
│   │   ├── LanguageSwitch/ # Language selector
│   │   ├── LoadingFallback/# Loading states
│   │   ├── MainLayout/     # App shell layout
│   │   ├── SideBar/        # Navigation sidebar
│   │   └── ThemeToggle/    # Dark/light mode toggle
│   ├── config/             # App configuration
│   │   ├── app.ts          # App constants
│   │   ├── endpoints.ts    # API endpoints
│   │   ├── env.ts          # Environment validation
│   │   └── routes.ts       # Route constants
│   ├── features/           # Feature modules
│   │   ├── auth/           # Authentication feature
│   │   │   ├── components/ # Auth components
│   │   │   └── utils/      # Keycloak utilities
│   │   └── notes/          # Notes feature
│   │       ├── components/ # NoteEditor, NoteList, NotesSidebar
│   │       ├── store/      # notesSlice, foldersSlice, tagsSlice
│   │       ├── services/   # API services
│   │       └── types/      # Note, Folder, Tag types
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts      # Authentication hook
│   │   ├── useAuthQuery.ts # Auth-aware data fetching
│   │   └── ...
│   ├── i18n/               # i18next configuration
│   ├── lib/                # Shared libraries
│   │   └── apiManager.tsx  # Axios instance with interceptors
│   ├── mocks/              # MSW mock handlers
│   │   ├── browser.ts      # MSW worker setup
│   │   └── handlers.ts     # API mock handlers
│   ├── pages/              # Page components
│   │   ├── HomePage/
│   │   ├── SettingsPage/
│   │   └── NotFoundPage/
│   ├── store/              # Redux store
│   │   ├── authSlice.ts    # Auth state
│   │   └── index.ts        # Store configuration
│   ├── theme/              # MUI theme
│   │   ├── ThemeProvider.tsx
│   │   ├── lightTheme.ts
│   │   └── darkTheme.ts
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main App component
│   └── main.tsx            # Entry point
├── docs/                   # Documentation
├── orval.config.ts         # API code generation config
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
└── package.json
```

## Configuration

### Environment Variables (`public/env.js`)

```javascript
// API Configuration
window.API_URL = 'https://api.example.com';

// Keycloak Authentication
window.KEYCLOAK_URL = 'https://keycloak.example.com/auth';
window.KEYCLOAK_REALM = 'your-realm';
window.KEYCLOAK_CLIENT_ID = 'your-client-id';

// Development
window.MOCK_MODE = true; // Enable MSW mocking
```

### Path Aliases

The project uses `@/` as an alias to `src/`:

```typescript
import { useAuth } from '@/hooks';
import { Button } from '@/components';
```

## Documentation

Detailed documentation is available in the `docs/` folder:

- [Project Structure](docs/project-structure.md) - Detailed folder organization
- [Authentication](docs/authentication.md) - Keycloak setup and usage
- [Theming](docs/theming.md) - Dark/light mode and customization
- [Internationalization](docs/i18n.md) - Multi-language support
- [State Management](docs/state-management.md) - Redux Toolkit patterns
- [API Integration](docs/api-integration.md) - Data fetching and Orval
- [Testing](docs/testing.md) - Unit and E2E testing guide
- [Adding Features](docs/adding-features.md) - How to add new features

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:mock` | Start with MSW mocking enabled |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint and TypeScript checks |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests in watch mode |
| `npm run test:run` | Run unit tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run pw:test` | Run Playwright E2E tests |
| `npm run pw:test:ui` | Run E2E tests with UI |
| `npm run api:generate` | Generate API hooks from OpenAPI |

## Tech Stack

### Core

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.0.0 | UI library |
| typescript | 5.9.3 | Type safety |
| vite | 7.3.0 | Build tool |

### UI & Styling

| Package | Version | Purpose |
|---------|---------|---------|
| @mui/material | 6.1.6 | UI components |
| @emotion/react | 11.13.3 | CSS-in-JS |
| notistack | 3.0.1 | Snackbar notifications |

### State & Data

| Package | Version | Purpose |
|---------|---------|---------|
| @reduxjs/toolkit | 2.0.0 | State management |
| @tanstack/react-query | 5.90.7 | Data fetching |
| axios | 1.7.7 | HTTP client |

### Forms & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | 7.65.0 | Form handling |
| zod | 4.1.12 | Schema validation |
| @hookform/resolvers | 5.2.2 | Zod integration |

### Routing & Auth

| Package | Version | Purpose |
|---------|---------|---------|
| react-router-dom | 7.5.3 | Routing |
| keycloak-js | 26.2.1 | Authentication |

### Internationalization

| Package | Version | Purpose |
|---------|---------|---------|
| i18next | 25.0.1 | i18n framework |
| react-i18next | 15.5.1 | React bindings |
| i18next-http-backend | 3.0.2 | Load translations |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| vitest | 4.0.6 | Unit testing |
| @playwright/test | 1.56.1 | E2E testing |
| msw | 2.11.6 | API mocking |
| orval | 7.17.0 | API code generation |
| eslint | 8.56.0 | Linting |
| prettier | 3.2.5 | Formatting |

## Pre-commit Hooks

Husky automatically runs on every commit:
1. `npm run lint` - TypeScript + ESLint checks
2. `npm run build` - Production build

Commits are rejected if either check fails.

## License

Private - All rights reserved
