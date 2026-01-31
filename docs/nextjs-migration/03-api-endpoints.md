# 03 — API Endpoints

All endpoints are served under `/api/v1/`. All endpoints except file download require a valid JWT Bearer token in the `Authorization` header.

## Authentication Header

```
Authorization: Bearer <keycloak-jwt-token>
```

The API extracts user identity from JWT claims:
- `sub` claim → User ID
- `email` claim → User email
- `preferred_username` claim → User display name

---

## Notes (`/api/v1/notes`)

### GET `/api/v1/notes`
**List all notes for the authenticated user** (owned + shared with user).

- **Auth:** Required
- **Response:** `200 OK` — `Note[]`
- **Notes:** Returns all notes including soft-deleted ones. The `tags` array contains tag IDs. The `sharedWith` array contains full `SharedUser` objects. Client-side filtering is applied for active vs trash view.

### GET `/api/v1/notes/{id}`
**Get a single note by ID.**

- **Auth:** Required
- **Response:** `200 OK` — `Note` | `404 Not Found`
- **Notes:** Returns 404 if note doesn't exist or user lacks access (owns or shared-with).

### GET `/api/v1/notes/search?q={query}`
**Full-text search across user's notes.**

- **Auth:** Required
- **Query params:** `q` — search query string
- **Response:** `200 OK` — `Note[]`
- **Notes:** Uses PostgreSQL `tsvector` with prefix matching. Query "dai" becomes "dai:*". Title matches weighted higher than content. Searches across owned and shared notes.

### POST `/api/v1/notes`
**Create a new note.**

- **Auth:** Required
- **Body:** `CreateNoteRequest`
  ```json
  {
    "title": "My Note",
    "content": "[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Hello\"}]}]",
    "folderId": "uuid-or-null",
    "tags": ["tag-uuid-1", "tag-uuid-2"],
    "isPinned": false
  }
  ```
- **Response:** `201 Created` — `Note` (with `Location` header)
- **Notes:** `order` is auto-calculated as max order in folder + 1. Tags are attached via NoteTag junction table.

### PUT `/api/v1/notes/{id}`
**Update an existing note (partial update).**

- **Auth:** Required
- **Body:** `UpdateNoteRequest`
  ```json
  {
    "title": "Updated Title",
    "content": "...",
    "folderId": "",
    "tags": ["tag-uuid-1"],
    "isPinned": true,
    "order": 5
  }
  ```
- **Response:** `200 OK` — `Note` | `404 Not Found`
- **Notes:** All fields are optional. Only provided fields are updated. `folderId: ""` (empty string) removes from folder. `folderId: null` or omitted means no change. When `tags` is provided, all existing tag associations are replaced.

### DELETE `/api/v1/notes/{id}`
**Soft delete a note (move to trash).**

- **Auth:** Required
- **Response:** `204 No Content` | `404 Not Found`
- **Notes:** Sets `isDeleted = true` and `deletedAt = now()`. Note remains in database. Auto-cleaned after 30 days by background service.

### DELETE `/api/v1/notes/{id}/permanent`
**Permanently delete a note (hard delete).**

- **Auth:** Required
- **Response:** `204 No Content` | `404 Not Found`
- **Notes:** Removes note, all NoteTag associations, and all NoteShare records from database. Irreversible.

### POST `/api/v1/notes/{id}/restore`
**Restore a soft-deleted note from trash.**

- **Auth:** Required
- **Response:** `200 OK` — `Note` | `404 Not Found`
- **Notes:** Sets `isDeleted = false` and `deletedAt = null`.

### POST `/api/v1/notes/reorder`
**Batch update order values for multiple notes.**

- **Auth:** Required
- **Body:** `ReorderNotesRequest`
  ```json
  {
    "items": [
      { "id": "note-uuid-1", "order": 0 },
      { "id": "note-uuid-2", "order": 1 },
      { "id": "note-uuid-3", "order": 2 }
    ]
  }
  ```
- **Response:** `204 No Content`
- **Notes:** Used when drag-and-dropping notes within a folder. Updates only the `order` field.

### POST `/api/v1/notes/{id}/share`
**Share a note with another user by email.**

- **Auth:** Required
- **Body:** `ShareNoteRequest`
  ```json
  {
    "email": "user@example.com",
    "permission": "edit"
  }
  ```
- **Response:** `200 OK` — `Note` (with updated `sharedWith`) | `404 Not Found`
- **Notes:** Looks up user by email in Users table. Creates NoteShare record. The shared user can then see the note in their GET `/api/v1/notes` response.

### DELETE `/api/v1/notes/{id}/share/{userId}`
**Remove sharing from a specific user.**

- **Auth:** Required
- **Response:** `200 OK` — `Note` (with updated `sharedWith`) | `404 Not Found`

---

## Folders (`/api/v1/folders`)

### GET `/api/v1/folders`
**List all folders for the authenticated user.**

- **Auth:** Required
- **Response:** `200 OK` — `Folder[]`

### GET `/api/v1/folders/{id}`
**Get a single folder by ID.**

- **Auth:** Required
- **Response:** `200 OK` — `Folder` | `404 Not Found`

### POST `/api/v1/folders`
**Create a new folder.**

- **Auth:** Required
- **Body:** `CreateFolderRequest`
  ```json
  {
    "name": "Work",
    "parentId": "parent-uuid-or-null",
    "color": "#6366f1"
  }
  ```
- **Response:** `201 Created` — `Folder`

### PUT `/api/v1/folders/{id}`
**Update an existing folder (partial update).**

- **Auth:** Required
- **Body:** `UpdateFolderRequest`
  ```json
  {
    "name": "Updated Name",
    "color": "#ff5722",
    "order": 3
  }
  ```
- **Response:** `200 OK` — `Folder` | `404 Not Found`

### DELETE `/api/v1/folders/{id}`
**Delete a folder.**

- **Auth:** Required
- **Response:** `204 No Content` | `404 Not Found`
- **Notes:** Child folders are cascade-deleted (PostgreSQL ON DELETE CASCADE on `parentId`). Notes in the folder have their `folderId` set to `null` (moved to unfiled). Notes are NOT deleted.

### POST `/api/v1/folders/reorder`
**Batch update order values for multiple folders.**

- **Auth:** Required
- **Body:** `ReorderFoldersRequest`
  ```json
  {
    "items": [
      { "id": "folder-uuid-1", "order": 0 },
      { "id": "folder-uuid-2", "order": 1 }
    ]
  }
  ```
- **Response:** `204 No Content`

---

## Tags (`/api/v1/tags`)

### GET `/api/v1/tags`
**List all tags for the authenticated user.**

- **Auth:** Required
- **Response:** `200 OK` — `Tag[]`

### GET `/api/v1/tags/{id}`
**Get a single tag by ID.**

- **Auth:** Required
- **Response:** `200 OK` — `Tag` | `404 Not Found`

### POST `/api/v1/tags`
**Create a new tag.**

- **Auth:** Required
- **Body:** `CreateTagRequest`
  ```json
  {
    "name": "Important",
    "color": "#ef4444"
  }
  ```
- **Response:** `201 Created` — `Tag`

### PUT `/api/v1/tags/{id}`
**Update a tag (partial update).**

- **Auth:** Required
- **Body:** `UpdateTagRequest`
  ```json
  {
    "name": "Updated Name",
    "color": "#22c55e"
  }
  ```
- **Response:** `200 OK` — `Tag` | `404 Not Found`

### DELETE `/api/v1/tags/{id}`
**Delete a tag.**

- **Auth:** Required
- **Response:** `204 No Content` | `404 Not Found`
- **Notes:** Removes all NoteTag associations for this tag. Notes themselves are NOT deleted.

---

## Users (`/api/v1/users`)

### GET `/api/v1/users/me`
**Get current authenticated user info (from JWT).**

- **Auth:** Required
- **Response:** `200 OK`
  ```json
  {
    "userId": "keycloak-uuid",
    "userEmail": "user@example.com",
    "userName": "johndoe"
  }
  ```

### GET `/api/v1/users/{id}`
**Get a user by ID.**

- **Auth:** Required
- **Response:** `200 OK` — `User` | `404 Not Found`

### GET `/api/v1/users/search?email={query}`
**Search users by email (for sharing feature).**

- **Auth:** Required
- **Query params:** `email` — partial email to search
- **Response:** `200 OK` — `User[]`
- **Notes:** Uses PostgreSQL ILIKE for case-insensitive matching.

---

## Files (`/api/v1/files`)

### POST `/api/v1/files`
**Upload a file.**

- **Auth:** Required
- **Content-Type:** `multipart/form-data`
- **Form fields:**
  - `file` (required) — The file to upload
  - `noteId` (optional) — Associate with a note
- **Response:** `201 Created` — `FileUploadResponse`
  ```json
  {
    "id": "file-uuid",
    "url": "/api/v1/files/file-uuid",
    "originalFilename": "photo.jpg",
    "contentType": "image/jpeg",
    "size": 245760
  }
  ```
- **Validation:**
  - Max size: 100 MB (104,857,600 bytes)
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `image/heic`, `image/heif`, `application/pdf`, `application/vnd.openxmlformats-officedocument.*` (Word, Excel, PowerPoint), `application/zip`, `text/markdown`, `text/x-markdown`, `text/plain`
- **Errors:**
  - `400` — "File is empty.", "File exceeds maximum allowed size.", "File type not allowed."

### GET `/api/v1/files/{id}`
**Download a file.**

- **Auth:** NOT required (public endpoint for file embedding in editor)
- **Response:** File stream with correct `Content-Type` and `Content-Disposition: inline` header
- **Notes:** Returns 404 if file doesn't exist on disk.

### DELETE `/api/v1/files/{id}`
**Delete a file.**

- **Auth:** Required (only the file owner can delete)
- **Response:** `204 No Content` | `404 Not Found`

---

## HTTP Status Code Reference

| Code | Meaning |
|------|---------|
| `200` | Success — resource returned |
| `201` | Created — resource created (includes `Location` header) |
| `204` | No Content — successful deletion or reorder |
| `400` | Bad Request — validation error (file size, type, etc.) |
| `401` | Unauthorized — missing or invalid JWT token |
| `403` | Forbidden — user lacks permission |
| `404` | Not Found — resource doesn't exist or user lacks access |
| `500` | Server Error — unhandled exception |

## Error Handling on Client

The current frontend handles API errors as follows:

1. **401 Unauthorized:** Silently attempts token refresh via Keycloak. If refresh succeeds, queued requests are retried with the new token. If refresh fails, user is redirected to Keycloak login.
2. **403 Forbidden:** Sets `accessStatus = 'unauthorized'` in auth state. ProtectedRoute component redirects to `/no-access` page.
3. **All other errors:** Displayed as error snackbar notifications.
