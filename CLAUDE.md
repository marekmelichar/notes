# CLAUDE.md - AI Assistant Guide for epoznamky.cz

## Project Overview

A full-stack note-taking application (Czech: "e-poznámky" = "e-notes") with offline-first architecture, rich text editing, and folder/tag organization.

## Tech Stack

**Frontend (ui/)**: React 19, TypeScript, Vite, MUI v6, Redux Toolkit, React Query, TipTap editor, Dexie (IndexedDB)

**Backend (api/)**: .NET 10, Entity Framework Core, PostgreSQL 16

**Auth**: Keycloak 26 (OIDC/JWT)

**Infrastructure**: Docker Compose, Nginx, GitHub Actions CI/CD

## Quick Commands

```bash
# Run locally (requires Docker)
docker compose up -d

# Frontend dev (from ui/)
npm install && npm run dev

# Run tests (from ui/)
npm test              # Vitest watch mode
npm run test:run      # Single run
npm run pw:test       # Playwright E2E

# TypeScript check (from ui/)
npx tsc --noEmit

# Build (from ui/)
npm run build
```

## Project Structure

```
epoznamky.cz/
├── ui/                      # React frontend
│   └── src/
│       ├── components/      # Reusable UI (Header, MobileNavigation, etc.)
│       ├── features/        # Feature modules
│       │   ├── auth/        # Keycloak auth, ProtectedRoute
│       │   └── notes/       # Notes, folders, tags (components, store, services)
│       ├── pages/           # Page components (NotesPage, SettingsPage)
│       ├── store/           # Redux store (uiSlice, authSlice, etc.)
│       └── theme/           # MUI theme provider
├── api/                     # .NET backend
│   └── EpoznamkyApi/
│       ├── Controllers/     # REST endpoints
│       ├── Models/          # Entities & DTOs
│       ├── Services/        # Business logic (DataService)
│       └── Data/            # EF Core DbContext, migrations
└── deploy/                  # Nginx config, deployment scripts
```

## Key Architecture Patterns

### State Management
- **Redux slices**: `uiSlice` (mobile view, theme), `notesSlice`, `foldersSlice`, `tagsSlice`
- **Mobile view states**: `'sidebar' | 'list' | 'editor'` - controls which panel is visible on mobile

### Mobile Navigation
The app has a bottom navigation bar on mobile (< 768px) with three views:
- **Folders** (`sidebar`): Shows NotesSidebar
- **Notes** (`list`): Shows NoteList
- **Editor** (`editor`): Shows NoteEditor (disabled if no note selected)

Key file: `ui/src/components/MobileNavigation/index.tsx`

### Responsive Layout
- Desktop: 3-column grid (sidebar | note list | editor)
- Mobile: Single panel with bottom nav switching between views
- Breakpoint: 768px

### Offline-First
- Dexie (IndexedDB) for local storage
- Sync state tracked in `syncSlice`
- API services in `ui/src/features/notes/services/`

## Common Issues & Fixes

### Mobile Navigation Not Working
Check `ui/src/pages/NotesPage/index.tsx` for useEffect hooks that auto-switch views. Use `useRef` to track previous state when only reacting to actual changes, not re-renders.

### State Persistence
The `mobileView` state is managed in Redux (`uiSlice`). When debugging navigation issues, check what triggers `setMobileView` dispatches.

## Testing

- **Unit tests**: Vitest + React Testing Library (files: `*.test.tsx`)
- **E2E tests**: Playwright (in `ui/tests/`)
- **Coverage target**: 80%

## Environment URLs

| Service | Local | Production |
|---------|-------|------------|
| Frontend | http://localhost:3000 | https://epoznamky.cz |
| API | http://localhost:5001 | https://epoznamky.cz/api |
| Keycloak | http://localhost:8080 | https://epoznamky.cz/auth |

## Data Model

```
User -> Notes, Folders, Tags
Note -> folderId?, Tags (many-to-many), SharedWith
Folder -> parentId? (hierarchical)
```

## Useful Files to Know

| Purpose | File |
|---------|------|
| Mobile navigation | `ui/src/components/MobileNavigation/index.tsx` |
| Notes page layout | `ui/src/pages/NotesPage/index.tsx` |
| UI state (mobile view) | `ui/src/store/uiSlice.ts` |
| Notes state | `ui/src/features/notes/store/notesSlice.ts` |
| API client | `ui/src/lib/apiManager.ts` |
| Theme config | `ui/src/theme/ThemeProvider.tsx` |
| Routes | `ui/src/config/routes.ts` |
