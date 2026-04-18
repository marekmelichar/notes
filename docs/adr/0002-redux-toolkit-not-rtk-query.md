# 0002. Use Redux Toolkit thunks, not RTK Query

Date: 2026-04-18
Status: Accepted (retroactive)

## Context

The frontend has a nontrivial amount of API-backed state: notes, folders, tags, plus pinning/sorting/filtering. We needed:

- Predictable reducers for derived UI state (selected note, expanded folders, view mode).
- Cache invalidation tied to mutations (creating a note refreshes the list).
- Consistent error handling that surfaces server `ProblemDetails.detail` to the user.
- Optimistic updates for immediate-feeling actions (pin/unpin, reorder).

Two natural Redux Toolkit options: hand-written `createAsyncThunk`s, or RTK Query.

## Decision

**Use Redux Toolkit `createAsyncThunk` with a hand-written API service layer (`features/notes/services/`). Do not adopt RTK Query.**

All state lives in slices (`notesSlice`, `foldersSlice`, `tagsSlice`, plus global `auth`, `ui`, `notifications`, `tabs`). Thunks call axios via the shared `apiManager` and dispatch action results into reducers explicitly.

## Consequences

**Positive:**
- Full control over loading/error states, optimistic updates, rollback on failure.
- One pattern for everything: thunks dispatch `showError(getApiErrorMessage(error, fallback))` consistently. See `docs/error-handling.md`.
- Easy to test: each thunk is a function with mockable dependencies; slice reducers are pure.
- Easy to reason about: `redux-devtools` shows the entire flow as discrete actions.

**Negative:**
- Boilerplate: every endpoint = thunk + reducer + selector. RTK Query would auto-generate hooks.
- No automatic cache invalidation — manual `dispatch(fetchNotes())` after a mutation.
- No automatic request deduplication — same data fetched twice = two requests.

**Neutral:**
- Familiar Redux mental model; no second framework to learn.

## Alternatives considered

- **RTK Query**: auto-generated hooks, automatic caching, tag-based invalidation. Rejected at the time because the team had a working slice pattern, the entity graph is small (3 main domains), and we wanted full control over optimistic updates and error UX. Worth revisiting when state grows or if list/detail prefetching becomes a pain point.
- **TanStack Query (React Query)**: similar to RTK Query but framework-agnostic. Same trade-off; would have introduced two state systems (Redux for UI, RQ for server).
- **Zustand / Jotai**: lightweight global state. Would have removed Redux but lost devtools and the disciplined slice pattern that's working well for the domain.

## Notes

Migration cost to RTK Query is moderate — slices stay; thunks become endpoints; selectors become hooks. The biggest unknown is replicating optimistic-update behavior in `pin`/`reorder` flows.
