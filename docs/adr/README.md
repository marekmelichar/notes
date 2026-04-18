# Architecture Decision Records

ADRs capture the *why* behind significant choices in this codebase. They give future you (and future agents) the context to understand current structure and the criteria to revisit it intelligently.

## When to write one

Write an ADR when you:

- Introduce a new runtime dependency (framework, library that touches multiple files)
- Adopt a new architectural pattern (state mgmt approach, error model, auth model)
- Reverse a previous decision (deprecating an approach, removing a library)
- Make a trade-off where the runner-up was non-trivially close

You don't need an ADR for: bug fixes, refactors that don't change shape, version bumps, additive features inside existing patterns.

## Template

Copy from [`_template.md`](./_template.md). Number is the next available `NNNN-`.

```md
# NNNN. Title (verb-first, terse)

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded by NNNN | Deprecated

## Context
What problem are we solving? What constraints and forces are at play?

## Decision
What did we decide to do?

## Consequences
Positive, negative, and neutral effects of this decision.

## Alternatives considered
What else did we look at? Why did we reject each?
```

## Index

| # | Title | Status |
|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](./0002-redux-toolkit-not-rtk-query.md) | Use Redux Toolkit thunks, not RTK Query | Accepted (retroactive) |
| [0003](./0003-tiptap-for-rich-text.md) | Use TipTap for rich text editing | Accepted (retroactive) |
| [0004](./0004-keycloak-for-auth.md) | Use Keycloak for authentication | Accepted (retroactive) |
| [0005](./0005-no-offline-first-sync.md) | Stay server-backed; no offline-first sync layer | Accepted (retroactive) |
| [0006](./0006-pwa-via-vite-plugin-pwa.md) | Ship as a PWA via vite-plugin-pwa | Accepted (retroactive) |
| [0007](./0007-feature-folders-frontend.md) | Organize frontend by feature folders | Accepted (retroactive) |
| [0008](./0008-soft-delete-with-trash-cleanup.md) | Soft-delete notes with a sweeper service | Accepted (retroactive) |

## "Retroactive" status

Most current ADRs are marked **Accepted (retroactive)** — they document decisions made before the ADR practice started. They reflect inferred reasoning from the code; treat the *Context* sections as best-effort reconstruction rather than verbatim history. For new decisions going forward, write the ADR before or with the implementation.
