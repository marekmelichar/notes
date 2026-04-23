# 0009. Client-supplied `UpdatedAt` as the concurrency token on note PUT

Date: 2026-04-23
Status: Accepted

## Context

On 2026-04-23 13:29:38 UTC a ~36 KB note (id
`598aaef5-c760-4337-93f6-403967812af8`) was silently overwritten with an
empty TipTap document (`"[]"`). Forensics (post-hoc `pg_dump` restore)
showed a single `PUT /api/v1/notes/:id` from a "ghost" editor tab that had
been open since before the user re-edited the note in a second, newer tab.
The ghost tab's autosave cycle fired ten seconds after the newer tab's last
save and clobbered it.

The server accepted the write because:

- `PUT /api/v1/notes/:id` ran a **blind `UPDATE`** — no compare-and-swap, no
  ETag, no row-version. Whichever save arrived last won.
- The client-side 10 s autosave debounce (`useAutoSave`) plus
  `SingleNoteEditor.performSave()` read `editor.getContent()` at *save
  time*, not at *dirty time*. A stale tab produced a valid-looking empty
  TipTap JSON document that differed from its in-memory "last saved"
  snapshot, so it was sent as a legitimate diff.
- The axios interceptor (`ui/src/lib/apiManager.ts`) silently replayed the
  buffered request body after a 401→refresh cycle. If the body was
  captured before re-editing, the replay could re-introduce a stale save.

Contributing factor: React 19 + Vite + PWA means tabs can be parked in a
service-worker-backed state for hours and resurrect without reloading.

The fix has to land on both sides of the wire — a pure client fix is
defeated by any non-browser caller (and by tests), and a pure server fix
is defeated by the client picking up a mismatched token on every save and
incurring 409s in normal use.

## Decision

**Every `PUT /api/v1/notes/:id` whose body sets `content` must include an
`updatedAt` (long, ms-epoch) equal to the server's current `updatedAt` on
that row. The server rejects any mismatched or missing token, and also
refuses a "suspicious shrink" from a non-trivial note to a near-empty
one.**

Precisely:

| Case | Status | Shape |
|---|---|---|
| `content` present + `updatedAt` matches | 200 | New `Note` (bumped `updatedAt`) |
| `content` present + `updatedAt` missing | 400 | ProblemDetails `detail: "Missing UpdatedAt token…"` |
| `content` present + `updatedAt` mismatched | 409 | ProblemDetails `detail: "This note was changed elsewhere…"` |
| `content` present, > 256 B existing → < 64 B new | 409 | ProblemDetails `detail: "Refusing to replace a non-empty note…"` |
| `content` absent (metadata-only update) | 200 | Unchanged — backwards compatible |

The client (`notesSlice`) stashes the server's `updatedAt` per note id when
a detail loads, forwards it on every content PUT, and — on a 409 — latches
the note into a conflict state: the autosave is disabled until the user
reloads or the detail is explicitly re-fetched. A banner (testid
`note-conflict-banner`) surfaces the server's `detail` string.

The frontend `SingleNoteEditor` also gains a **mount-before-load guard**:
no `PUT` is dispatched until (a) `note` is loaded, (b) the editor has been
hydrated for this specific `noteId`, and (c) it isn't reporting "empty but
baseline was never non-empty" — the exact ghost-tab wipe signature.

The `apiManager` 401 interceptor no longer replays mutating requests.
Non-idempotent failures surface to the caller so the next save rebuilds
the body from current editor state.

## Consequences

**Positive:**

- Ghost-tab wipes now 409 instead of silently winning. The user is told
  "this note was changed elsewhere" and the autosave locks out until
  reload.
- Works for any client (CLI, future mobile, integration tests) because
  the guarantee lives in the service, not just the React tree.
- Adds a belt-and-braces "suspicious shrink" check that would have caught
  this exact 2026-04-23 incident even if the concurrency token were
  somehow correct.
- Pairs with the mount-before-load editor guard so even a buggy client
  can't initiate the bad `PUT`.

**Negative:**

- Every content save costs one extra field in the PUT body. Trivial.
- A legitimate multi-device conflict (two real users editing — currently
  impossible because the app is single-tenant per user, but future
  collaborative features would hit this) now requires a client-side
  resolution flow. Today's UI shows the banner and asks for reload;
  there's no merge.
- Metadata vs content PUTs now behave differently. Callers that use the
  "update everything" shape must set `updatedAt` whenever `content` is
  in the payload.
- One extra test axis on the backend (+ concurrency test class).

**Neutral:**

- The database schema is unchanged — we reuse the existing `UpdatedAt`
  (bigint ms-epoch) column rather than adding a `rowversion`.
- No migration required.
- The autosave debounce (10 s) is unchanged. Under normal single-user
  usage you will never observe a 409.

## Alternatives considered

- **PostgreSQL `xmin` / `rowversion`-style optimistic lock** — Use an
  auto-incremented row version separate from `UpdatedAt`. *Rejected* —
  requires a schema migration, an EF Core interceptor or `[Timestamp]`
  mapping, and buys nothing over reusing `UpdatedAt`. The existing column
  already updates on every save and is already returned to the client.
- **ETags via `If-Match: W/"updatedAt"` header** — *Rejected* — requires
  plumbing `If-Match` through the Axios client plus custom middleware to
  surface the header reliably behind CDN and (occasional) nginx
  buffering. Also less visible in logs / Problem payloads. Header-based
  concurrency is the HTTP-correct answer, but this project already uses
  JSON bodies everywhere; an extra field is the path of least surprise.
- **Last-write-wins but with an editor "revision" counter stored in
  IndexedDB per tab** — *Rejected* — couples the fix to the browser, can't
  protect against non-browser clients, and the IndexedDB assumption cuts
  against [ADR 0005](./0005-no-offline-first-sync.md).
- **Server-side heuristic only (reject empty PUT over non-empty note)** —
  Covers the exact incident and nothing else. *Rejected* — too narrow:
  a shrink from 10 KB → 100 B (truncation by stale tab) would still pass.
- **Locking a note on edit (server-held lock + heartbeat)** — *Rejected* —
  latency and failure modes far exceed the benefit for a single-tenant
  app. Dead tabs permanently lock notes.

## Notes

- The incident (note `598aaef5-c760-4337-93f6-403967812af8`, wiped
  2026-04-23 13:29:38 UTC, recovered via `pg_dump` backup) is the direct
  motivation. A dated reference belongs in the commit message too.
- The suspicious-shrink thresholds (256 B existing, 64 B new) are
  conservative: an empty TipTap document serialises to ≈ 49 B
  (`'{"type":"doc","content":[{"type":"paragraph"}]}'`), and any real note
  exceeds 256 B quickly. See `SuspiciousShrink*` constants in
  `api/EpoznamkyApi/Services/NoteService.cs`. If this ever fires a
  false positive in telemetry, revisit the thresholds — don't disable.
- See also: [docs/api.md — optimistic concurrency on note
  content](../api.md#optimistic-concurrency-on-note-content),
  [docs/error-handling.md — note-save 409](../error-handling.md#note-save-409-conflict-optimistic-concurrency),
  and the per-id `conflictedNoteIds` slice state in
  `ui/src/features/notes/store/notesSlice.ts`.
- Auth layer: `ui/src/lib/apiManager.ts` no longer auto-replays
  non-idempotent requests on 401. Callers see the error and re-derive
  the body from current state before retrying. This removes a second
  path that could resurrect stale data.
