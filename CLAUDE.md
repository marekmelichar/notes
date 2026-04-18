# CLAUDE.md

Orientation file for AI assistants working in this repo. Auto-loaded by Claude Code; followed by other agents via `AGENTS.md` (which points here). Keep this lean — depth lives in [`docs/`](./docs/README.md). When you need details, follow the links.

## Project in one paragraph

`notes.nettio.eu` is a server-backed, single-owner notes app. React 19 + Vite + TypeScript on the frontend (Redux Toolkit, MUI v6, TipTap). .NET 10 + ASP.NET Core on the backend (Entity Framework, PostgreSQL 16). Authentication via self-hosted Keycloak 26 (OIDC/JWT). Shipped as an installable PWA. Deployed via Docker Compose on a single VPS, fronted by Nginx + Let's Encrypt.

## What it is — and isn't

- **Is**: single-tenant per user, API-backed, Redux-managed, TipTap-based, PWA.
- **Isn't**: offline-first, collaborative, powered by a generated API client, backed by IndexedDB sync.

The "isn'ts" are deliberate — see the [ADR log](./docs/adr/) for why.

## Where to look first

| Question | Doc |
|---|---|
| What's the system shape? | [docs/architecture.md](./docs/architecture.md) |
| What does the database look like? | [docs/data-model.md](./docs/data-model.md) |
| What endpoints exist? | [docs/api.md](./docs/api.md) |
| How does auth work? | [docs/auth.md](./docs/auth.md) |
| How is it deployed? | [docs/deployment.md](./docs/deployment.md) |
| How are errors handled end-to-end? | [docs/error-handling.md](./docs/error-handling.md) |
| Why was X chosen over Y? | [docs/adr/](./docs/adr/) |

For frontend specifics: [`ui/docs/`](./ui/docs/) (editor, styling, theming, i18n, performance).

## Quick commands

```bash
# Full stack
docker compose up -d

# Frontend dev
cd ui && npm install && npm run dev

# Frontend checks
cd ui && npm run lint        # tsc + eslint
cd ui && npm run build       # production build
cd ui && npm run test:run    # unit tests

# Backend
cd api && dotnet build
cd api && dotnet test
```

## Code patterns to respect

### Frontend (`ui/`)

- **State**: Redux slices in `ui/src/features/<domain>/store/` (and `ui/src/store/` for global). Hand-written `createAsyncThunk`s, not RTK Query — see [ADR 0002](./docs/adr/0002-redux-toolkit-not-rtk-query.md).
- **API calls**: go through the shared Axios client at `ui/src/lib/apiManager.ts` (handles bearer injection + 401 silent refresh).
- **Feature folders**: each domain owns its components, services, store, hooks, types — see [ADR 0007](./docs/adr/0007-feature-folders-frontend.md).
- **Errors**: `getApiErrorMessage(error, fallback)` then `dispatch(showError(...))` — see [docs/error-handling.md](./docs/error-handling.md).
- **One active editor at a time**: `EditorPanel` mounts a single `SingleNoteEditor`.
- **Don't assume** offline sync, IndexedDB, mock mode, or generated API hooks exist.

### Backend (`api/`)

- **Endpoints under `/api/v1`** (route prefix). One version, hard-coded.
- **Ownership enforced in services**, not just controllers — every query filters by `UserId` from the JWT `sub` claim. Never accept `userId` from request bodies.
- **Service layer pattern**, no interfaces. Concrete types in DI.
- **ProblemDetails (RFC 7807)** for all errors; use `Problem(detail: ..., statusCode: ...)` — never `BadRequest("string")`.
- **Soft delete only on `Note`** (with `TrashCleanupService` sweeper) — see [ADR 0008](./docs/adr/0008-soft-delete-with-trash-cleanup.md).
- **Auto-migrations only in Development**. Production migrations are deliberate.

## Useful files

| Concern | File |
|---|---|
| Notes layout | `ui/src/pages/NotesPage/index.tsx` |
| Notes API client | `ui/src/features/notes/services/notesApi.ts` |
| Axios + auth interceptor | `ui/src/lib/apiManager.ts` |
| Notes slice | `ui/src/features/notes/store/notesSlice.ts` |
| Folders slice | `ui/src/features/notes/store/foldersSlice.ts` |
| Editor orchestration | `ui/src/features/notes/components/EditorPanel/index.tsx` |
| Editor (TipTap) | `ui/src/features/notes/components/NoteEditor/SingleNoteEditor.tsx` |
| Keycloak setup | `ui/src/features/auth/utils/keycloak.ts` |
| Runtime config | `ui/public/env.js` (rewritten by `ui/docker-entrypoint.sh`) |
| API startup | `api/EpoznamkyApi/Program.cs` |
| Notes service | `api/EpoznamkyApi/Services/NoteService.cs` |
| Folders service | `api/EpoznamkyApi/Services/FolderService.cs` |
| DB context | `api/EpoznamkyApi/Data/AppDbContext.cs` |

## When making changes

1. **Read the relevant doc first.** If you're touching auth, read [docs/auth.md](./docs/auth.md) before changing code.
2. **Update the doc in the same PR** if you change architecture, auth, deploy, or a documented contract.
3. **Write an ADR** if you introduce a new dep, new pattern, or reverse a previous decision.
4. **Tests**: at minimum, happy path + one edge case. See [docs/testing.md](./docs/testing.md).
5. **Commits**: `<type>: <subject>`, atomic, no commented-out code or stray `console.log`s. See [CONTRIBUTING.md](./CONTRIBUTING.md).
6. **Pre-commit hook** runs `validate-docs + lint + build`. The docs validator (`scripts/validate-docs.mjs`) fails if any file path or markdown link in a `.md` doesn't resolve — keeps doc rot out of `main`. **Never bypass with `--no-verify`** — fix the hook if it's wrong.

## Things to flag (don't silently ignore)

- Hardcoded secrets or credentials in code or docs
- Endpoints that don't filter by `UserId`
- API errors returned as plain strings (not ProblemDetails)
- New dependencies without an ADR
- `any` types in TypeScript (use `unknown` and narrow)
- SQL string concatenation (use parameterized queries)
- Test gaps in critical paths

## Open todos in the codebase

The doc set notes several known gaps you may encounter:

- **CI doesn't run tests** — only image builds. ([docs/testing.md](./docs/testing.md#ci))
- **No automated backups** — manual `pg_dump` only. ([docs/operations.md](./docs/operations.md#backups))
- **No Content Security Policy** ([docs/security.md](./docs/security.md#http-security-headers))
- **Trash retention window** isn't a configurable env var yet ([ADR 0008](./docs/adr/0008-soft-delete-with-trash-cleanup.md))

If you fix one of these, also remove it from the relevant doc's "open todos" section.

## Don't reinvent

- The doc set is the source of truth. Don't duplicate facts here that live in `docs/`.
- If you find yourself writing a long explanation in a comment or commit, consider whether it belongs in a doc instead.
- If a question keeps coming up, the answer probably belongs in [docs/architecture.md](./docs/architecture.md) or as a new ADR.
