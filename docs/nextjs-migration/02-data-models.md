# 02 — Data Models

All TypeScript interfaces below represent the data shapes used across the application. The backend uses identical shapes (C# classes). All timestamps are **Unix milliseconds** (number/long). All IDs are **UUID strings**.

## Core Entities

### Note

```typescript
interface Note {
  id: string;                    // UUID, auto-generated
  title: string;                 // Plain text title
  content: string;               // BlockNote JSON (stringified array of blocks)
  folderId: string | null;       // UUID of parent folder, null = unfiled
  tags: string[];                // Array of Tag IDs (resolved client-side)
  isPinned: boolean;             // Pinned notes appear first in list
  isDeleted: boolean;            // Soft delete flag
  deletedAt: number | null;      // Unix ms when moved to trash
  sharedWith: SharedUser[];      // Users this note is shared with
  order: number;                 // Sort position within folder (0-based)
  createdAt: number;             // Unix ms
  updatedAt: number;             // Unix ms
  syncedAt: number | null;       // Unix ms of last server sync
}
```

**Notes on `content` field:**
- Stored as a JSON string representing an array of BlockNote blocks
- Example: `"[{\"id\":\"abc\",\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Hello\"}]}]"`
- Empty note: `"[]"` or `""`
- The editor parses this into `PartialBlock[]` (BlockNote type)

### Folder

```typescript
interface Folder {
  id: string;                    // UUID
  name: string;                  // Folder display name
  parentId: string | null;       // UUID of parent folder (hierarchical, self-referential)
  color: string;                 // Hex color string (e.g., "#6366f1")
  order: number;                 // Sort position among siblings
  createdAt: number;             // Unix ms
  updatedAt: number;             // Unix ms
}
```

**Folder hierarchy:**
- Root folders have `parentId: null`
- Unlimited nesting depth supported
- Deleting a parent cascades to all children
- Deleting a folder sets contained notes' `folderId` to `null` (notes are NOT deleted)

### Tag

```typescript
interface Tag {
  id: string;                    // UUID
  name: string;                  // Tag display name
  color: string;                 // Hex color string (e.g., "#6366f1")
  createdAt: number;             // Unix ms (backend only)
  updatedAt: number;             // Unix ms (backend only)
}
```

**Tag relationships:**
- Many-to-many with Notes (junction table: NoteTag)
- Deleting a tag removes all NoteTag associations (notes are NOT deleted)
- Notes store `tags` as an array of tag IDs (resolved to full objects client-side)

### SharedUser

```typescript
interface SharedUser {
  userId: string;                // Keycloak user ID of the recipient
  email: string;                 // Email of the recipient
  permission: 'view' | 'edit';   // Access level
}
```

### User

```typescript
interface User {
  id: string;                    // Keycloak user ID (from JWT 'sub' claim)
  email: string;
  name: string;                  // Display name (preferred_username)
}
```

### FileUpload

```typescript
interface FileUpload {
  id: string;                    // UUID
  originalFilename: string;      // Original file name as uploaded
  storedFilename: string;        // GUID-based filename on disk (backend only)
  contentType: string;           // MIME type (e.g., "image/png")
  size: number;                  // File size in bytes
  userId: string;                // Owner's Keycloak user ID
  noteId: string | null;         // Optional association to a note
  createdAt: number;             // Unix ms
}
```

### SyncQueueItem (Offline)

```typescript
interface SyncQueueItem {
  id: string;                    // UUID
  type: 'note' | 'folder' | 'tag';
  action: 'create' | 'update' | 'delete';
  entityId: string;              // ID of the entity being synced
  data: unknown;                 // Serialized entity data
  createdAt: number;             // Unix ms
  retries: number;               // Retry counter
}
```

## Request DTOs (What the API Accepts)

### CreateNoteRequest

```typescript
interface CreateNoteRequest {
  title: string;                 // Default: ""
  content: string;               // Default: ""
  folderId?: string | null;      // Optional folder placement
  tags: string[];                // Tag IDs to attach
  isPinned: boolean;             // Default: false
}
```

### UpdateNoteRequest

```typescript
interface UpdateNoteRequest {
  title?: string;                // null = no change
  content?: string;              // null = no change
  folderId?: string | null;      // null = no change, "" = remove from folder
  tags?: string[];               // null = no change, [] = remove all tags
  isPinned?: boolean;            // null = no change
  order?: number;                // null = no change
}
```

**Important:** `folderId` has three-state semantics:
- `undefined`/not present: Don't change the folder
- `""` (empty string): Remove from current folder (set to null)
- `"uuid-string"`: Move to specified folder

### CreateFolderRequest

```typescript
interface CreateFolderRequest {
  name: string;
  parentId?: string | null;      // null = root folder
  color: string;                 // Default: "#6366f1"
}
```

### UpdateFolderRequest

```typescript
interface UpdateFolderRequest {
  name?: string;
  parentId?: string | null;
  color?: string;
  order?: number;
}
```

### CreateTagRequest

```typescript
interface CreateTagRequest {
  name: string;
  color: string;                 // Default: "#6366f1"
}
```

### UpdateTagRequest

```typescript
interface UpdateTagRequest {
  name?: string;
  color?: string;
}
```

### ShareNoteRequest

```typescript
interface ShareNoteRequest {
  email: string;                 // Email of user to share with
  permission: 'view' | 'edit';   // Default: "view"
}
```

### ReorderNotesRequest

```typescript
interface ReorderNotesRequest {
  items: NoteOrderItem[];
}

interface NoteOrderItem {
  id: string;                    // Note ID
  order: number;                 // New order value
}
```

### ReorderFoldersRequest

```typescript
interface ReorderFoldersRequest {
  items: FolderOrderItem[];
}

interface FolderOrderItem {
  id: string;                    // Folder ID
  order: number;                 // New order value
}
```

## Response DTOs (What the API Returns)

### FileUploadResponse

```typescript
interface FileUploadResponse {
  id: string;
  url: string;                   // Relative path: "/api/v1/files/{id}"
  originalFilename: string;
  contentType: string;
  size: number;                  // Bytes
}
```

### Note (full response)

Notes returned from the API include populated `tags` (array of tag ID strings) and `sharedWith` (array of SharedUser objects). These are resolved server-side via JOINs on the NoteTag and NoteShare tables.

## Filter Model

```typescript
interface NotesFilter {
  folderId: string | null;       // Filter by folder (null = all folders)
  tagIds: string[];              // Filter by tags (empty = no tag filter)
  isPinned: boolean | null;      // Filter pinned (null = no filter)
  isDeleted: boolean;            // true = show trash, false = show active
  searchQuery: string;           // Full-text search query
}
```

## Database Schema (PostgreSQL)

### Tables

```sql
-- Notes
CREATE TABLE "Notes" (
    "Id"            TEXT PRIMARY KEY,
    "Title"         TEXT NOT NULL DEFAULT '',
    "Content"       TEXT NOT NULL DEFAULT '',
    "FolderId"      TEXT REFERENCES "Folders"("Id") ON DELETE SET NULL,
    "IsPinned"      BOOLEAN NOT NULL DEFAULT FALSE,
    "IsDeleted"     BOOLEAN NOT NULL DEFAULT FALSE,
    "DeletedAt"     BIGINT,
    "Order"         INTEGER NOT NULL DEFAULT 0,
    "CreatedAt"     BIGINT NOT NULL,
    "UpdatedAt"     BIGINT NOT NULL,
    "SyncedAt"      BIGINT,
    "UserId"        TEXT NOT NULL,
    "SearchVector"  TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("Title", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("Content", '')), 'B')
    ) STORED
);

-- Indexes
CREATE INDEX "IX_Notes_UserId" ON "Notes" ("UserId");
CREATE INDEX "IX_Notes_FolderId" ON "Notes" ("FolderId");
CREATE INDEX "IX_Notes_IsDeleted" ON "Notes" ("IsDeleted");
CREATE INDEX "IX_Notes_DeletedAt" ON "Notes" ("DeletedAt");
CREATE INDEX "IX_Notes_UserId_IsDeleted" ON "Notes" ("UserId", "IsDeleted");
CREATE INDEX "IX_Notes_SearchVector" ON "Notes" USING GIN ("SearchVector");

-- Folders (self-referential hierarchy)
CREATE TABLE "Folders" (
    "Id"        TEXT PRIMARY KEY,
    "Name"      TEXT NOT NULL DEFAULT '',
    "ParentId"  TEXT REFERENCES "Folders"("Id") ON DELETE CASCADE,
    "Color"     TEXT NOT NULL DEFAULT '#6366f1',
    "Order"     INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" BIGINT NOT NULL,
    "UpdatedAt" BIGINT NOT NULL,
    "UserId"    TEXT NOT NULL
);

-- Tags
CREATE TABLE "Tags" (
    "Id"        TEXT PRIMARY KEY,
    "Name"      TEXT NOT NULL DEFAULT '',
    "Color"     TEXT NOT NULL DEFAULT '#6366f1',
    "CreatedAt" BIGINT NOT NULL,
    "UpdatedAt" BIGINT NOT NULL,
    "UserId"    TEXT NOT NULL
);

-- NoteTag (many-to-many junction)
CREATE TABLE "NoteTags" (
    "NoteId" TEXT NOT NULL REFERENCES "Notes"("Id") ON DELETE CASCADE,
    "TagId"  TEXT NOT NULL REFERENCES "Tags"("Id") ON DELETE CASCADE,
    PRIMARY KEY ("NoteId", "TagId")
);

-- NoteShare (sharing)
CREATE TABLE "NoteShares" (
    "NoteId"           TEXT NOT NULL REFERENCES "Notes"("Id") ON DELETE CASCADE,
    "SharedWithUserId" TEXT NOT NULL,
    "SharedWithEmail"  TEXT NOT NULL,
    "Permission"       TEXT NOT NULL DEFAULT 'view',
    PRIMARY KEY ("NoteId", "SharedWithUserId")
);

-- Users
CREATE TABLE "Users" (
    "Id"    TEXT PRIMARY KEY,
    "Email" TEXT NOT NULL,
    "Name"  TEXT NOT NULL
);
CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");

-- FileUploads
CREATE TABLE "FileUploads" (
    "Id"               TEXT PRIMARY KEY,
    "OriginalFilename" TEXT NOT NULL,
    "StoredFilename"   TEXT NOT NULL,
    "ContentType"      TEXT NOT NULL,
    "Size"             BIGINT NOT NULL,
    "UserId"           TEXT NOT NULL,
    "NoteId"           TEXT,
    "CreatedAt"        BIGINT NOT NULL
);
```

## IndexedDB Schema (Dexie — Offline Storage)

```typescript
// Dexie database v2
class NotesDatabase extends Dexie {
  notes!: EntityTable<Note, 'id'>;
  folders!: EntityTable<Folder, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
}

// Indices:
// notes:     'id, folderId, isPinned, isDeleted, createdAt, updatedAt, order, *tags'
// folders:   'id, parentId, order'
// tags:      'id, name'
// syncQueue: 'id, type, action, entityId, createdAt'
```

The `*tags` index on notes is a Dexie multi-entry index, allowing efficient queries like "find all notes with tag X".
