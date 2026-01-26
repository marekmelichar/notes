# CLAUDE.md - AI Assistant Guide for notes.nettio.eu

## Project Overview

A full-stack note-taking application (Czech: "e-poznámky" = "e-notes") with offline-first architecture, rich text editing, and folder/tag organization.

## Tech Stack

**Frontend (ui/)**: React 19, TypeScript, Vite, MUI v6, Redux Toolkit, React Query, BlockNote editor, Dexie (IndexedDB)

**Backend (api/)**: .NET 10, Entity Framework Core, PostgreSQL 16

**Auth**: Keycloak 26 (OIDC/JWT)

**Infrastructure**: Docker Compose, Nginx, GitHub Actions CI/CD

## Quick Commands

```bash
# Run locally (requires Docker for API/DB/Keycloak)
docker compose up -d

# Frontend dev (from ui/)
npm install && npm run dev    # Runs on http://localhost:5173

# Lint (TypeScript + ESLint)
npm run lint

# Build
npm run build

# Run tests (from ui/)
npm test              # Vitest watch mode
npm run test:run      # Single run
npm run pw:test       # Playwright E2E
```

## Pre-commit Hooks

Husky runs automatically on every commit:
1. `npm run lint` - TypeScript check + ESLint
2. `npm run build` - Full production build

If either fails, the commit is rejected. To bypass (not recommended):
```bash
git commit --no-verify -m "message"
```

## Git Flow

We use **GitHub Flow** - see `docs/git-flow.md` for full details.

```bash
# Start new feature
git checkout main && git pull && git checkout -b feature/name

# Commit changes
git add . && git commit -m "feat: Description"

# Push and create PR
git push -u origin feature/name
```

**Branch naming:** `feature/`, `fix/`, `refactor/`, `style/`, `docs/`, `chore/`

**Commit types:** `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`

## Styling Guide

Follow `ui/docs/styling-guide.md` for all CSS/styling work:

- **Use `rem` instead of `px`** for spacing, sizing, font-size, border-radius
- **Use CSS Modules** for static styles (not `sx` props)
- **Use MUI CSS variables** in CSS: `var(--mui-palette-text-primary)`
- **Only use `sx` prop** for dynamic/calculated values (e.g., `sx={{ color: tag.color }}`)
- **Media queries**: Use `48rem` not `768px`

## Project Structure

```
notes.nettio.eu/
├── ui/                      # React frontend
│   ├── docs/                # Frontend documentation
│   │   ├── styling-guide.md # CSS/styling conventions
│   │   └── PLAN.md          # Implementation plan
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
│       ├── Controllers/     # REST endpoints (route: /api/v1/[controller])
│       ├── Models/          # Entities & DTOs
│       ├── Services/        # Business logic (DataService)
│       └── Data/            # EF Core DbContext, migrations
├── docs/                    # Project documentation
│   └── git-flow.md          # Git branching strategy
└── deploy/                  # Nginx config, deployment scripts
```

## Key Architecture Patterns

### State Management
- **Redux slices**: `uiSlice` (mobile view, theme), `notesSlice`, `foldersSlice`, `tagsSlice`
- **Mobile view states**: `'sidebar' | 'list' | 'editor'` - controls which panel is visible on mobile

### Mobile Navigation
The app has a bottom navigation bar on mobile (< 48rem) with three views:
- **Folders** (`sidebar`): Shows NotesSidebar
- **Notes** (`list`): Shows NoteList
- **Editor** (`editor`): Shows NoteEditor (disabled if no note selected)

Key file: `ui/src/components/MobileNavigation/index.tsx`

### Responsive Layout
- Desktop: 3-column grid (sidebar | note list | editor)
- Mobile: Single panel with bottom nav switching between views
- Breakpoint: 48rem (768px)

### Offline-First
- Dexie (IndexedDB) for local storage
- Sync state tracked in `syncSlice`
- API services in `ui/src/features/notes/services/`

### API Configuration
- **Base URL**: Configured in `ui/public/env.js`
- **API prefix**: `/api/v1` (defined in `ui/src/features/notes/services/notesApi.ts`)
- **Routes**: `/api/v1/notes`, `/api/v1/folders`, `/api/v1/tags`

## Common Issues & Fixes

### Mobile Navigation Not Working
Check `ui/src/pages/NotesPage/index.tsx` for useEffect hooks that auto-switch views. Use `useRef` to track previous state when only reacting to actual changes, not re-renders.

### State Persistence
The `mobileView` state is managed in Redux (`uiSlice`). When debugging navigation issues, check what triggers `setMobileView` dispatches.

### API Connection Issues
- Check `ui/public/env.js` for correct `API_URL` (should be `http://localhost:5001` for local dev)
- API routes use `/api/v1` prefix (e.g., `/api/v1/notes`)

## Testing

- **Unit tests**: Vitest + React Testing Library (files: `*.test.tsx`)
- **E2E tests**: Playwright (in `ui/tests/`)
- **Coverage target**: 80%

## Environment URLs

| Service | Local Dev | Docker | Production |
|---------|-----------|--------|------------|
| Frontend | http://localhost:5173 | http://localhost:3000 | https://notes.nettio.eu |
| API | http://localhost:5001 | http://localhost:5001 | https://notes.nettio.eu/api |
| Keycloak | http://localhost:8080 | http://localhost:8080 | https://notes.nettio.eu/auth |

## Data Model

```
User -> Notes, Folders, Tags
Note -> folderId?, Tags (many-to-many), SharedWith
Folder -> parentId? (hierarchical)
```

Note content is stored as **BlockNote JSON** (stringified array of blocks).

## Useful Files to Know

| Purpose | File |
|---------|------|
| Mobile navigation | `ui/src/components/MobileNavigation/index.tsx` |
| Notes page layout | `ui/src/pages/NotesPage/index.tsx` |
| Note editor | `ui/src/features/notes/components/NoteEditor/index.tsx` |
| UI state (mobile view) | `ui/src/store/uiSlice.ts` |
| Notes state | `ui/src/features/notes/store/notesSlice.ts` |
| Folders state | `ui/src/features/notes/store/foldersSlice.ts` |
| Tags state | `ui/src/features/notes/store/tagsSlice.ts` |
| API client | `ui/src/lib/apiManager.tsx` |
| API services | `ui/src/features/notes/services/notesApi.ts` |
| Environment config | `ui/public/env.js` |
| Theme config | `ui/src/theme/ThemeProvider.tsx` |
| Routes | `ui/src/config/routes.ts` |
| ESLint config | `ui/.eslintrc.cjs` |
| Prettier config | `ui/.prettierrc` |
| Pre-commit hook | `.husky/pre-commit` |
| Styling guide | `ui/docs/styling-guide.md` |
| Git flow | `docs/git-flow.md` |
