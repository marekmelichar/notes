# 0007. Organize frontend by feature folders

Date: 2026-04-18
Status: Accepted (retroactive)

## Context

React projects typically organize files in one of two ways:

- **By type**: `src/components/`, `src/hooks/`, `src/services/`, `src/store/` — every concern is a top-level folder.
- **By feature**: `src/features/notes/{components,hooks,services,store}/` — every domain is a top-level folder, and concerns live inside.

The first scales poorly: as the app grows, every folder fills with hundreds of unrelated files. Cross-feature navigation is OK; intra-feature navigation requires hopping across the tree. Worse, deletions become risky (does anyone else use `useNoteThing`?).

The second scales by domain: deleting a feature is `rm -rf src/features/<x>`. New contributors learn one feature at a time.

## Decision

**Organize the frontend primarily by feature.** Each `src/features/<domain>/` folder owns its `components/`, `services/`, `store/` (slices + thunks), `hooks/`, and `types/`. Cross-cutting concerns live at the top level: `src/components/` (shared UI primitives), `src/lib/` (utils, apiManager), `src/hooks/` (generic hooks), `src/store/` (global slices: auth, ui, notifications, tabs), `src/theme/`, `src/i18n/`, `src/config/`.

Pages (`src/pages/`) are thin route entry points that compose feature components.

## Consequences

**Positive:**
- High cohesion within a feature. To work on notes, you stay inside `features/notes/`.
- Easy mental model for new contributors and AI assistants — *"where does X live?"* has one answer.
- Refactoring or removing a feature is a single-folder operation.
- Forces a clean import boundary: feature → shared, never feature → other feature internals.

**Negative:**
- Initial cognitive overhead deciding where something belongs ("is this generic or notes-specific?").
- Cross-cutting concerns (theme tokens, shared dialogs, generic hooks) require discipline to keep at the top level.
- Some duplication when two features need similar-but-not-identical helpers — easy to copy when extracting would be cheaper later.

**Neutral:**
- Today there are only two feature folders (`auth`, `notes`). The structure is over-engineered for the current scale but pays off the moment a third feature appears.

## Alternatives considered

- **Pure type-based** (`components/`, `services/`, etc.): faster to start; rots faster.
- **Domain-driven monorepo packages** (Nx, Turborepo, separate workspaces per feature): right for a much larger codebase. Overkill for current scope.
- **Atomic design** (atoms/molecules/organisms): visually disciplined but doesn't help with domain logic locality. Could still be applied *within* `components/`, separately from feature organization.

## Notes

The boundary rule, not always perfectly enforced today: **a feature should not import from another feature's internals.** If you find yourself reaching into `features/notes/store/` from `features/auth/`, that shared concept belongs at the top level. Catch this in code review or via lint rules (boundaries plugin) when it starts costing.
