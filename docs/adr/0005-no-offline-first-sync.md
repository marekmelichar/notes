# 0005. Stay server-backed; no offline-first sync layer

Date: 2026-04-18
Status: Accepted (retroactive)

## Context

A note-taking app is an obvious candidate for offline-first design — users want to jot ideas on the train, reconcile when they get back online, and not lose work to flaky networks. The standard playbook is some combination of:

- IndexedDB / SQLite (WASM) as a local store of record
- Background-sync queue for writes
- CRDTs or operational transforms for conflict resolution
- Service worker stale-while-revalidate caching for reads

This is a significant engineering investment. It also adds a meaningful surface area: schema migrations on the client, data versioning, conflict UI, queue debugging.

## Decision

**Stay server-backed. No offline-first sync layer.** The server is the single source of truth; the client is a thin renderer over it. The PWA caches the app shell and provides ~1 hour of stale read access via Workbox `NetworkFirst` for `/api/*`, but **writes always require a network round-trip**.

## Consequences

**Positive:**
- Dramatically simpler codebase — no client-side store, no sync engine, no conflict resolution logic, no queue UI.
- One canonical state. The user can open the app on a different device and see exactly what they last left.
- Server-side validation is authoritative. We don't need to duplicate validation rules on the client just to make optimistic mutations safe.
- Easy to test, easy to debug — what you see in the DB is what the user sees.

**Negative:**
- Offline editing fails. The auto-save retries, but if the tab closes before reconnect, the edit is lost. (TipTap state is in memory only.)
- "Spotty Wi-Fi" UX is mediocre — users see save-failed errors during transient outages.
- Limits the product positioning — we can't honestly market this as "works offline."

**Neutral:**
- The 1h NetworkFirst cache is a soft offline mode for *reading*, which covers the most common offline use case (look something up in your notes).

## Alternatives considered

- **IndexedDB + background sync (Workbox `BackgroundSyncPlugin`)**: doable, smaller scope than full offline-first. Would queue write requests, replay on reconnect. Doesn't solve content conflicts (two devices, both offline, both editing same note). Decided cost wasn't justified for a single-user, single-device-at-a-time app.
- **Full CRDT / Yjs sync**: industry-standard for collaborative docs. Would unblock multi-device + multi-user but adds a large library and a new mental model. Disproportionate for current scope.
- **Local-first databases (Replicache, ElectricSQL, Triplit)**: each interesting; each a major architectural rewrite.

## Notes

If this decision is reversed:

1. Start with IndexedDB-backed mutation queue (Workbox `BackgroundSyncPlugin`).
2. Use a single-user, last-write-wins strategy initially (we're single-tenant per user).
3. Defer CRDTs until / unless multi-device editing of the *same* note becomes a real complaint.

See [docs/pwa.md](../pwa.md) for the current offline behavior in detail.
