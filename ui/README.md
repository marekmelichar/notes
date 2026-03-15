# notes.nettio.eu - Frontend

React frontend for notes.nettio.eu.

## Current Stack

- React 19 + TypeScript
- Vite 7
- MUI 6 + CSS Modules
- Redux Toolkit for app and domain state
- Axios for API requests
- TipTap for rich text editing
- Keycloak for authentication
- Vitest + Playwright for testing

## What This Frontend Does Today

- Loads notes, folders, and tags from the API into Redux slices
- Uses thunk-based CRUD flows for notes, folders, and tags
- Stores UI preferences like panel widths, theme, and open tabs in `localStorage`
- Keeps the auth token in memory and syncs it from Keycloak refreshes
- Renders a single active editor tab at a time

This frontend does not currently include:

- React Query
- generated API hooks
- mock-mode scripts
- offline IndexedDB sync

## Quick Start

```bash
cd ui
npm install
npm run dev
```

The app runs on `http://localhost:5173` and talks to the API configured in `public/env.js`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run dev:ci` | Start Vite bound to the host |
| `npm run build` | Type-check and build the app |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run TypeScript and ESLint |
| `npm run format` | Format frontend source files |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |
| `npm run test:coverage` | Run Vitest with coverage |
| `npm run pw:test` | Run Playwright E2E tests |
| `npm run pw:test:ui` | Run Playwright UI mode |
| `npm run knip` | Check for unused files and exports |

## Important Files

- `src/App.tsx`: app shell, routing, snackbars, auth bootstrapping
- `src/store/`: Redux store, UI state, auth state, notifications, editor tabs
- `src/features/notes/store/`: notes, folders, and tags state
- `src/features/notes/services/notesApi.ts`: hand-written API client
- `src/lib/apiManager.ts`: Axios instance and auth retry logic
- `src/features/notes/components/NoteEditor/`: editor orchestration and TipTap integration
- `src/pages/NotesPage/`: responsive three-panel notes layout

## Docs

- `docs/project-structure.md`
- `docs/state-management.md`
- `docs/api-integration.md`
- `docs/authentication.md`
- `docs/editor-architecture.md`
- `docs/testing.md`
