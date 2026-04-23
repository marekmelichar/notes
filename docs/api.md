# API Reference

REST API exposed by `api/EpoznamkyApi`. Single version: `v1`. Base path: `/api/v1`.

## Conventions

- **Auth**: every endpoint requires a Keycloak-issued JWT in `Authorization: Bearer <token>`, except where noted (file *download* by ID is intentionally public — see [security.md](./security.md#file-attachments)).
- **Identity**: server reads `sub` from the JWT as `UserId`. Never trust a `UserId` from the request body.
- **IDs**: 36-char Guid strings (`Guid.ToString()` / `text` columns).
- **Timestamps**: `long` Unix milliseconds.
- **Error envelope**: RFC 7807 ProblemDetails with `traceId`. See [error-handling.md](./error-handling.md).
- **Versioning**: hard-coded route prefix. No header/query negotiation. New version = new prefix (e.g. `/api/v2/...`).
- **Rate limits**: 100 req/min/user globally, 10 req/min for file uploads.

## Discovery

OpenAPI spec is exposed in **Development only**:

```
GET /openapi/v1.json   →  OpenAPI 3 document
```

Use it with any client generator or import into Swagger UI / Bruno / Insomnia. Not exposed in production by design.

## Endpoint catalog

### Notes — `/api/v1/notes`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List all notes (paginated; `?limit=`, `?offset=`) |
| `GET` | `/list` | Filtered list (`?folderId=`, `?tagIds=a,b`, `?isPinned=`, `?isDeleted=`, `?sortBy=updatedAt\|createdAt\|title`, `?sortOrder=asc\|desc`). Pinned first. |
| `GET` | `/list/search?q=<text>` | Full-text search returning list-view items. `q` ≤ 200 chars. |
| `GET` | `/search?q=<text>` | Full-text search returning full notes. |
| `GET` | `/{id}` | Fetch single note |
| `POST` | `/` | Create. Body: `CreateNoteRequest` (`title`, `content`, `folderId?`, `tags[]`, `isPinned`). Returns the created `Note`. |
| `PUT` | `/{id}` | Partial update. Body: `UpdateNoteRequest` (any field optional). **Content updates** must include `updatedAt` (ms-epoch of the version the client last observed) as an optimistic-concurrency token — see [ADR 0009](./adr/0009-optimistic-concurrency-on-note-put.md). |
| `DELETE` | `/{id}` | Soft delete (`IsDeleted=true`, `DeletedAt=now`). |
| `DELETE` | `/{id}/permanent` | Hard delete + drop attached files. |
| `POST` | `/{id}/restore` | Undelete (clear `IsDeleted` + `DeletedAt`). |
| `POST` | `/reorder` | Batch reorder. Body: `{ items: [{ id, order }] }` (1–1000 items). |

### Folders — `/api/v1/folders`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List all (returns full tree, client-side flatten) |
| `GET` | `/{id}` | Fetch single |
| `POST` | `/` | Create. Body: `CreateFolderRequest` (`name`, `parentId?`, `color`). |
| `PUT` | `/{id}` | Update. Validates **circular references** and **max depth 5** server-side. |
| `DELETE` | `/{id}` | Delete. Cascades to subfolders; child notes have `FolderId` set to null. |
| `POST` | `/reorder` | Batch reorder (1–500 items). |

### Tags — `/api/v1/tags`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | List all |
| `GET` | `/{id}` | Fetch single |
| `POST` | `/` | Create. Body: `CreateTagRequest` (`name`, `color`). |
| `PUT` | `/{id}` | Update |
| `DELETE` | `/{id}` | Delete (cascades junction table; notes lose the tag) |

### Files — `/api/v1/files`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/` | ✅ | Upload. `multipart/form-data`. Max 100 MB. Allowlist by extension **and** content type. Saved to disk + DB row. Returns `FileUploadResponse` (`id`, `url`, `originalFilename`, `contentType`, `size`). Rate-limited to 10/min. |
| `GET` | `/{id}` | ❌ | Download/inline. `?inline=true` serves with `Content-Disposition: inline` for `<img>` use. **Public** — relies on the unguessable Guid. See [security.md](./security.md#file-attachments). |
| `DELETE` | `/{id}` | ✅ | Delete from DB + disk |

### Users — `/api/v1/users`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/me` | Current user info from JWT claims (`UserId`, `UserEmail`, `UserName`) |

## Health & ops

| Path | Purpose |
|---|---|
| `/health/live` | Liveness — process is up |
| `/health/ready` | Readiness — Postgres reachable |

Used by Docker healthchecks and (optionally) any external monitor.

## Error response shape

All errors are RFC 7807. Example:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Search query must not exceed 200 characters.",
  "traceId": "0HNV76DA8TJHJ:00000001"
}
```

Validation errors include an `errors` map keyed by field. Full table of error sites + how the UI surfaces them: [error-handling.md](./error-handling.md).

## Optimistic concurrency on note content

`PUT /api/v1/notes/{id}` enforces a compare-and-swap on `updatedAt` for any
request that sets `content`. The client supplies the `updatedAt` it last
observed; the server checks it against the row's current value and:

- **Matches** → save, bump `updatedAt`, return `200 OK` with the new `Note`.
- **Mismatch** → `409 Conflict` + ProblemDetails (`detail` describes the
  reason). The caller must reload the note and let the user decide how to
  merge.
- **Missing** (content present, `updatedAt` absent) → `400 Bad Request`.
- **Suspicious shrink** (existing > 256 B, new < 64 B) → `409 Conflict`.
  Belt-and-braces defense against stale-editor wipes.

Metadata-only updates (`title`, `folderId`, `tags`, `isPinned`, `order`) do
not require `updatedAt`. Background: [ADR 0009](./adr/0009-optimistic-concurrency-on-note-put.md);
root-cause incident: 2026-04-23 ghost-tab note wipe.

Example request:

```http
PUT /api/v1/notes/c93f1c18-... HTTP/1.1
Authorization: Bearer …
Content-Type: application/json

{
  "content": "<p>Updated note body</p>",
  "updatedAt": 1745020800000
}
```

Example conflict response:

```json
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.8",
  "title": "Conflict",
  "status": 409,
  "detail": "This note was changed elsewhere. Reload to see the newer version.",
  "traceId": "0HNV76DA8TJHJ:00000003"
}
```

## Request/response examples

### Create a note

```http
POST /api/v1/notes HTTP/1.1
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "title": "Architecture notes",
  "content": "<p>System overview…</p>",
  "folderId": null,
  "tags": ["a4d7…", "b2e9…"],
  "isPinned": false
}
```

```json
HTTP/1.1 201 Created
Location: /api/v1/notes/c93f1c18-…

{
  "id": "c93f1c18-…",
  "title": "Architecture notes",
  "content": "<p>System overview…</p>",
  "folderId": null,
  "isPinned": false,
  "isDeleted": false,
  "deletedAt": null,
  "order": 0,
  "createdAt": 1745020800000,
  "updatedAt": 1745020800000,
  "syncedAt": null,
  "userId": "f47ac10b-…",
  "tags": ["a4d7…", "b2e9…"]
}
```

### Filter notes by folder + tag

```http
GET /api/v1/notes/list?folderId=abc&tagIds=t1,t2&sortBy=updatedAt&sortOrder=desc
Authorization: Bearer …
```

## Implementation pointers

| Concern | File |
|---|---|
| Routing convention | `api/EpoznamkyApi/Controllers/*Controller.cs` (`[Route("api/v1/[controller]")]`) |
| Notes business logic | `api/EpoznamkyApi/Services/NoteService.cs` |
| Folder business logic (incl. cycle/depth checks) | `api/EpoznamkyApi/Services/FolderService.cs` |
| File upload validation | `api/EpoznamkyApi/Services/FileService.cs` |
| ProblemDetails config | `api/EpoznamkyApi/Program.cs` |
| Rate limiting | `api/EpoznamkyApi/Program.cs` (`AddRateLimiter`) |

## Adding an endpoint

1. Add the action to the right controller (or create a new one mirroring `[Route("api/v1/[controller]")]`).
2. Put real logic in a service. Inject `AppDbContext`, take `userId` from the controller (it gets it from `User.FindFirst("sub")?.Value`).
3. Filter every query by `UserId`. No exceptions — even for "internal" endpoints.
4. Use `Problem(detail: "…", statusCode: 400)` for client errors. Never `BadRequest("string")`.
5. Update [`api.md`](./api.md) (this file) and add tests.
