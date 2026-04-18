# Documentation

Welcome. This is the canonical doc set for `notes.nettio.eu` — kept up to date so future-you, future agents, and new contributors can get oriented without spelunking through code.

## Read this first

- **[Architecture](./architecture.md)** — system overview, request flow, components
- **[Data model](./data-model.md)** — entities, relationships, schema
- **[Auth](./auth.md)** — Keycloak realm, OIDC flow, JWT validation
- **[API](./api.md)** — REST conventions, endpoint catalog, error format

## Operating the system

- **[Deployment](./deployment.md)** — CI/CD pipeline, deploy runbook, env vars
- **[Operations](./operations.md)** — logs, backup, restore, troubleshooting
- **[Security](./security.md)** — threat model, secrets, ownership enforcement

## Frontend specifics

- **[PWA](./pwa.md)** — service worker, update prompt, offline behavior
- **[Editor architecture](../ui/docs/editor-architecture.md)** — TipTap setup, extensions
- **[Styling guide](../ui/docs/styling-guide.md)** — CSS Modules + MUI conventions
- **[Theming](../ui/docs/theming.md)** — light/dark mode, dynamic primary color
- **[i18n](../ui/docs/i18n.md)** — translation workflow, supported languages
- **[Performance](../ui/docs/performance.md)** — bundle splitting, lazy loading

## Quality & process

- **[Testing](./testing.md)** — vitest + playwright, coverage thresholds, conventions
- **[Error handling](./error-handling.md)** — ProblemDetails end-to-end (API → UI)
- **[Feature checklist](./feature-checklist.md)** — manual smoke-test grid for releases
- **[Contributing](../CONTRIBUTING.md)** — branches, commits, PRs, review expectations

## Architecture decisions

The **[ADR log](./adr/)** captures *why* we built it this way. Read these before proposing structural changes — most "why don't we just…" questions have answers there.

## Feature guides

- **[No-access flow](./no-access-implementation-guide.md)** — how 403 redirects work end-to-end

## For AI assistants

- **[`CLAUDE.md`](../CLAUDE.md)** at the repo root — the canonical orientation file, auto-loaded by Claude Code. Kept lean; points back here for depth.
- **[`AGENTS.md`](../AGENTS.md)** is a short pointer to `CLAUDE.md` for tooling that follows the AGENTS.md convention.

---

## Doc maintenance rules

These docs are load-bearing. To keep them honest:

1. **Code change → doc check.** If you touch architecture, auth, deployment, or a documented API contract, update the doc in the same PR. Stale docs are worse than missing ones.
2. **One source of truth.** Don't duplicate facts between `CLAUDE.md` and `docs/`. Agent file orients; `docs/` is the depth.
3. **Decisions → ADRs.** New library? New pattern? Reversal of an existing approach? Write an ADR before the code lands. Template in [`adr/README.md`](./adr/README.md).
4. **Diagrams = Mermaid.** Renders natively in GitHub, lives in markdown, diffs cleanly.
5. **Show, don't tell.** Prefer file paths, code references, and concrete examples over abstractions.

### Automated checks

`scripts/validate-docs.mjs` runs in pre-commit and in CI (`.github/workflows/validate.yml`). It fails the build if any markdown reference (file path or internal link) doesn't resolve. Run locally:

```bash
node scripts/validate-docs.mjs
```

This catches mechanical drift (renamed/deleted files, broken nav). It does **not** catch semantic drift (e.g. an endpoint changed shape but the doc wasn't updated). For that, see the [quarterly fact-check](../CONTRIBUTING.md#scheduled-fact-check) procedure in CONTRIBUTING.
