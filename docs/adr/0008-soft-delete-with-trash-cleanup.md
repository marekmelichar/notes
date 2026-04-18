# 0008. Soft-delete notes with a sweeper service

Date: 2026-04-18
Status: Accepted (retroactive)

## Context

Users delete notes by accident. Two design options:

- **Hard delete**: gone immediately. Simple. Unforgiving.
- **Soft delete**: flag-based. Restorable. Eventually swept by a background job.

We chose soft delete for `Note` only. `Folder` and `Tag` are hard-deleted (with cascade rules) because they're cheap to recreate and don't represent significant user content.

## Decision

**Notes use a soft-delete model: `IsDeleted: bool` + `DeletedAt: long?`** (Unix milliseconds). A `DELETE /api/v1/notes/{id}` flips `IsDeleted=true` and stamps `DeletedAt`. A `POST /api/v1/notes/{id}/restore` reverses it.

A hosted background service, **`TrashCleanupService`**, periodically removes soft-deleted notes whose `DeletedAt` is older than the retention window (configurable). It also removes attached `FileUpload` rows and their on-disk files via `OrphanFileCleanupService`.

**Permanent deletion** is also exposed: `DELETE /api/v1/notes/{id}/permanent` skips the trash and removes immediately, including attached files.

## Consequences

**Positive:**
- Accidental delete is recoverable through normal UI ("Restore from trash").
- Permanent delete is opt-in and explicit.
- Sweeping reclaims storage without manual intervention.
- File attachments stay consistent with note lifetime — orphan files are detected and cleaned.

**Negative:**
- Every list query needs a `WHERE IsDeleted = false` filter (indexed, but easy to forget on a new query).
- Soft-deleted rows count against quota / influence stats unless explicitly excluded.
- Requires the sweeper service to keep running — silent failure mode if it crashes.
- Compound index on `(UserId, IsDeleted)` is the workhorse — must stay in `AppDbContext.cs`.

**Neutral:**
- The "trash" UI is a real feature, not just an implementation detail. Users expect to see/empty/restore from it.

## Alternatives considered

- **Hard delete + client-side undo toast**: simpler model, but the undo only lasts as long as the toast. Doesn't survive page reload, doesn't work for "I deleted this last week and need it back."
- **Full audit log + revision history**: would enable point-in-time restore. Overkill for current product; meaningful storage cost.
- **Database triggers for cascade**: would couple business rules to the schema. Service-layer logic is more portable and testable.
- **Cron job instead of hosted service**: fine in principle, but introduces an out-of-process dependency. Hosted service stays in the API container's lifecycle.

## Notes

Retention window for `TrashCleanupService` should be documented and made configurable via env var if it isn't already. If a user deletes by mistake and reports it 30 days later, the answer ("we have backups" — see [docs/operations.md](../operations.md)) should be unambiguous.
