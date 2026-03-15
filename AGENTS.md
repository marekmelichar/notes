# AGENTS.md - AI Assistant Guide for notes.nettio.eu

## Project Overview

A server-backed note-taking application with rich text editing, folder and tag organization, and Keycloak authentication.

## Architecture Reality

The current product is:

- single-owner
- API-backed
- Redux-managed on the frontend
- TipTap-based for rich text editing

It is not currently:

- offline-first
- collaborative
- powered by generated API hooks
- backed by IndexedDB sync

## Tech Stack

**Frontend (`ui/`)**: React 19, TypeScript, Vite, MUI v6, Redux Toolkit, Axios, TipTap

**Backend (`api/`)**: .NET 10, ASP.NET Core, Entity Framework Core, PostgreSQL 16

**Auth**: Keycloak 26 (OIDC/JWT)

**Infrastructure**: Docker Compose, Nginx, GitHub Actions CI/CD

## Quick Commands

```bash
# Run locally (requires Docker for API/DB/Keycloak)
docker compose up -d

# Frontend dev (from ui/)
npm install && npm run dev

# Frontend checks
npm run lint
npm run build
npm run test:run
```

## Project Structure

```text
notes.nettio.eu/
├── api/                     # .NET API and integration tests
├── ui/                      # React frontend
├── deploy/                  # Deployment scripts and configs
├── docs/                    # Product and operational docs
├── docker-compose.yml       # Local development stack
└── docker-compose.prod.yml  # Production deployment stack
```

## Current Development Patterns

### Frontend

- Keep domain state in Redux slices.
- Use the shared Axios client in `ui/src/lib/apiManager.tsx`.
- Prefer CSS Modules for static styling.
- Treat API responses as authoritative, especially for IDs, timestamps, and order.
- Do not assume offline sync, mock mode, or generated data hooks exist.

### Backend

- Keep REST endpoints under `/api/v1`.
- Enforce ownership checks in services, not only in the UI.
- Return full entities from create and update flows.
- Restrict startup migrations to development environments.

## Useful Files

| Purpose | File |
|---|---|
| Notes layout | `ui/src/pages/NotesPage/index.tsx` |
| Notes services | `ui/src/features/notes/services/notesApi.ts` |
| Axios client | `ui/src/lib/apiManager.tsx` |
| Notes store | `ui/src/features/notes/store/notesSlice.ts` |
| Folders store | `ui/src/features/notes/store/foldersSlice.ts` |
| Editor orchestration | `ui/src/features/notes/components/EditorPanel/index.tsx` |
| Editor implementation | `ui/src/features/notes/components/NoteEditor/SingleNoteEditor.tsx` |
| API startup | `api/EpoznamkyApi/Program.cs` |
| Note service | `api/EpoznamkyApi/Services/NoteService.cs` |
| Folder service | `api/EpoznamkyApi/Services/FolderService.cs` |
