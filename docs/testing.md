# Testing

What we test, how, and where. For the manual release smoke-test grid see [feature-checklist.md](./feature-checklist.md).

## Test pyramid

```
            ┌──────────────┐
            │  Playwright  │   ←  ui/tests/*.spec.ts
            │     E2E      │      Critical user flows
            └──────────────┘
          ┌──────────────────┐
          │  Vitest (UI)     │   ←  Colocated *.test.ts(x)
          │  Slice + util    │      Reducer logic, error handling, hooks
          └──────────────────┘
        ┌──────────────────────┐
        │  xUnit (API)         │   ←  api/EpoznamkyApi.IntegrationTests/
        │  Integration         │      HTTP-level: WebApplicationFactory + Testcontainers
        └──────────────────────┘
```

We don't write API unit tests separately — controllers are thin and the integration suite has the right cost/coverage trade-off.

## Frontend — Vitest

`ui/vitest.config.ts`:

- Environment: `jsdom`
- Setup: `tests/setup.ts` (matchMedia mock, cleanup)
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`
- Coverage threshold: **80%** for lines, functions, branches, statements

### Conventions

- **Colocate** tests with the code: `notesSlice.ts` ↔ `notesSlice.test.ts`.
- **Test behavior, not implementation**: assert on outputs and dispatched actions, not internal `useState` values.
- **Test names**: `should [outcome] when [condition]`.
- **Mock the boundary, not the world**: mock `apiManager` (axios), let the slice/component logic run real.

### Run

```bash
cd ui
npm run test           # watch mode
npm run test:run       # single pass
npm run test:coverage  # with coverage
```

### What's well-covered today

| Area | File |
|---|---|
| Error extraction | `src/lib/apiError.test.ts` |
| Notes slice (CRUD + restore + permanent delete) | `src/features/notes/store/notesSlice.test.ts` |
| Folders slice | `src/features/notes/store/foldersSlice.test.ts` |
| Tags slice | `src/features/notes/store/tagsSlice.test.ts` |
| Editor header | `src/features/notes/components/NoteEditor/EditorHeader.test.tsx` |

### What needs more coverage

- Custom hooks in `src/hooks/` (only some have tests)
- Theme provider edge cases (color validation, fallbacks)
- i18n missing-key behavior

## Frontend — Playwright (E2E)

`ui/playwright.config.ts`:

- Tests in `ui/tests/`
- Runs against `npm run preview` (or a dev server)
- Auth happens via Keycloak — tests use the dev realm's `testuser/testuser`

### Specs

| File | Covers |
|---|---|
| `tests/app.spec.ts` | Smoke: app loads, auth works |
| `tests/notes.spec.ts` | Create/edit/delete/restore note flows |
| `tests/editor.spec.ts` | Rich text formatting, save, autosave |
| `tests/folders.spec.ts` | Folder create, rename, drag-into, delete cascade |

### Run

```bash
cd ui
npm install              # ensure browsers are installed
npx playwright install   # one-time browser download
npx playwright test
npx playwright test --ui # interactive mode
```

E2E tests need the full stack running:

```bash
docker compose up -d   # from repo root
cd ui && npx playwright test
```

### Conventions

- One `*.spec.ts` per high-level feature.
- Use `page.getByRole`, `page.getByLabel` — not CSS selectors.
- Don't seed via UI; seed via API or the SQL fixture if needed.
- Assert on visible text + ARIA attributes, not class names.

## Backend — xUnit integration tests

`api/EpoznamkyApi.IntegrationTests/`:

- Uses `WebApplicationFactory<Program>` to spin up the API in-process.
- Postgres via Testcontainers (real PG container per fixture).
- Auth bypassed via a test JWT scheme (configurable user ID per request).

### Run

```bash
cd api
dotnet test
```

The first run pulls the Postgres image (~150 MB).

### What to write

- **One controller endpoint = one test class.**
- Cover happy path + each documented 4xx + ownership isolation (different `UserId` → 404).
- Test the *contract* (status codes, response shape), not the implementation.

## CI

Today **CI does not run tests** — only image builds. This is a known gap.

- Adding `npm run test:run` and `dotnet test` to `.github/workflows/deploy.yml` (gated before the image build) is on the to-do list.
- Pre-commit hook in this repo already runs `npm run lint && npm run build` — it does **not** run tests, to keep commits fast.

## Adding a test for a bug fix

When fixing a bug:

1. Write the failing test first (or close to first).
2. Fix it.
3. Verify the test fails on the previous commit (`git stash`, run, `git stash pop`).
4. Commit test + fix together.

This keeps regression coverage growing with the bug rate, not behind it.

## Pointers

| Concern | File |
|---|---|
| Vitest config | `ui/vitest.config.ts` |
| Vitest setup | `ui/tests/setup.ts` |
| Playwright config | `ui/playwright.config.ts` |
| E2E specs | `ui/tests/*.spec.ts` |
| Integration test project | `api/EpoznamkyApi.IntegrationTests/` |
| Manual checklist | [feature-checklist.md](./feature-checklist.md) |
