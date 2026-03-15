# CLAUDE.md - AI Assistant Guide for notes.nettio.eu

## Project Overview

A server-backed note-taking application with rich text editing, folder and tag organization, and Keycloak authentication.

## Architecture Reality

The current shipped product is:

- single-owner
- API-backed
- Redux-managed on the frontend
- TipTap-based for rich text editing

It is not currently:

- offline-first
- collaborative
- powered by a generated API client
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

## Frontend Patterns

- domain state lives in Redux slices
- API calls go through `ui/src/lib/apiManager.tsx`
- feature services are hand-written, not generated
- CSS Modules handle static styling
- MUI is used for layout and component primitives
- one active editor tab is mounted at a time

## Backend Patterns

- REST endpoints live under `/api/v1`
- create and update flows return authoritative entities
- ownership checks are enforced server-side for notes, folders, and tags
- auto-migrations only run in development

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
