# Note-Taking App - Implementation Plan

## Overview

A full-featured note-taking application with rich text editing, hierarchical organization, offline-first storage with cloud sync, and collaborative features.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + TypeScript + MUI |
| State Management | Redux Toolkit + React Query |
| Rich Text Editor | BlockNote |
| Local Storage | IndexedDB (via Dexie.js) |
| Backend API | REST API (Orval for generation) |
| Authentication | Keycloak (existing) |

---

## Phase 1: Core Data Model & Infrastructure

### 1.1 Define Data Types (`src/types/notes.ts`)

```typescript
interface Note {
  id: string;
  title: string;
  content: string; // BlockNote JSON
  folderId: string | null;
  tags: string[]; // Tag IDs
  isPinned: boolean;
  isDeleted: boolean;
  sharedWith: SharedUser[];
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SharedUser {
  userId: string;
  permission: 'view' | 'edit';
}
```

### 1.2 Set Up Local Database (IndexedDB via Dexie)

- Create Dexie database schema for notes, folders, tags
- Implement offline-first storage pattern
- Create sync queue for pending API operations

### 1.3 Create Redux Slices

- `notesSlice` - Notes state & CRUD actions
- `foldersSlice` - Folder management
- `tagsSlice` - Tag management
- `syncSlice` - Sync status tracking

### Deliverables
- [ ] `src/features/notes/types/index.ts`
- [ ] `src/features/notes/services/notesDb.ts`
- [ ] `src/features/notes/store/notesSlice.ts`
- [ ] `src/features/notes/store/foldersSlice.ts`
- [ ] `src/features/notes/store/tagsSlice.ts`

---

## Phase 2: Note Editor

### 2.1 Install & Configure BlockNote

Extensions to include:
- Basic formatting (bold, italic, underline, strikethrough)
- Headings (H1, H2, H3)
- Lists (bullet, numbered, task)
- Blockquotes
- Code blocks with syntax highlighting
- Links
- Images
- Tables

### 2.2 Create NoteEditor Component

- Formatting toolbar with icon buttons
- Title input field
- Content area with BlockNote editor
- Auto-save with debounce (2 second delay)
- Word/character count
- Last saved indicator

### Deliverables
- [x] Install BlockNote packages
- [ ] `src/features/notes/components/NoteEditor/index.tsx`
- [ ] `src/features/notes/components/NoteEditor/Toolbar.tsx`
- [ ] `src/features/notes/components/NoteEditor/extensions.ts`
- [ ] `src/features/notes/hooks/useAutoSave.ts`

---

## Phase 3: Organization System

### 3.1 Folder Tree Component

- Hierarchical folder view in sidebar
- Expand/collapse folders
- Create new folder (with name input)
- Rename folder (inline editing)
- Delete folder (with confirmation)
- Drag-and-drop notes into folders
- Drag-and-drop to reorder folders
- Folder color customization

### 3.2 Tag System

- Tag creation modal with color picker
- Tag pills displayed on note cards
- Filter notes by clicking tags
- Tag management (rename, delete, change color)
- Auto-suggest existing tags when typing

### Deliverables
- [ ] `src/features/notes/components/FolderTree/index.tsx`
- [ ] `src/features/notes/components/FolderTree/FolderItem.tsx`
- [ ] `src/features/notes/components/FolderTree/CreateFolderDialog.tsx`
- [ ] `src/features/notes/components/TagManager/index.tsx`
- [ ] `src/features/notes/components/TagManager/TagPill.tsx`
- [ ] `src/features/notes/components/TagManager/TagInput.tsx`
- [ ] `src/features/notes/hooks/useFolders.ts`
- [ ] `src/features/notes/hooks/useTags.ts`

---

## Phase 4: Note List & Navigation

### 4.1 Notes List View

- Grid view (cards) / List view toggle
- Sort options: Date created, Date modified, Title (A-Z), Title (Z-A)
- Filter by: Folder, Tags, Pinned status
- Note card preview showing title + content snippet
- Visual indicators for pinned, shared notes
- Empty state for no notes

### 4.2 Update Sidebar Navigation

- Quick filters section:
  - All Notes
  - Favorites (pinned)
  - Recent (last 7 days)
  - Shared with me
  - Trash
- Folder tree section
- Tags section (collapsible)
- Note count badges

### Deliverables
- [ ] `src/features/notes/components/NoteList/index.tsx`
- [ ] `src/features/notes/components/NoteList/NoteCard.tsx`
- [ ] `src/features/notes/components/NoteList/NoteListItem.tsx`
- [ ] `src/features/notes/components/NoteList/ViewToggle.tsx`
- [ ] `src/features/notes/components/NoteList/SortMenu.tsx`
- [ ] `src/features/notes/components/NotesSidebar/index.tsx`
- [ ] `src/pages/NotesPage/index.tsx`
- [ ] Update `src/components/SideBar/index.tsx`

---

## Phase 5: Search & Features

### 5.1 Search Functionality

- Search bar in header
- Full-text search across title and content
- Search results with highlighted matches
- Filter search by folder/tags
- Recent searches history
- Keyboard shortcut (Cmd/Ctrl + K)

### 5.2 Favorites/Pinning

- Pin/unpin toggle button on note card
- Pin/unpin from note editor toolbar
- Pinned notes appear first in list
- Dedicated "Favorites" view

### 5.3 Note Sharing

- Share button in note editor
- Share modal with:
  - Generate shareable link
  - Add users by email
  - Set permission level (view/edit)
  - View current shares
  - Revoke access
- Shared indicator on note cards
- "Shared with me" section in sidebar

### 5.4 Export Options

- Export menu in note editor
- Export formats:
  - Markdown (.md)
  - PDF
  - Plain text (.txt)
  - HTML
- Bulk export (selected notes or folder)

### Deliverables
- [ ] `src/features/notes/components/SearchBar/index.tsx`
- [ ] `src/features/notes/components/SearchResults/index.tsx`
- [ ] `src/features/notes/hooks/useSearch.ts`
- [ ] `src/features/notes/components/ShareModal/index.tsx`
- [ ] `src/features/notes/components/ExportMenu/index.tsx`
- [ ] `src/features/notes/utils/exporters.ts`

---

## Phase 6: Sync & Backend Integration

### 6.1 API Endpoints (OpenAPI Spec)

```yaml
# Notes
GET    /api/notes           # List notes (with pagination, filters)
POST   /api/notes           # Create note
GET    /api/notes/{id}      # Get single note
PUT    /api/notes/{id}      # Update note
DELETE /api/notes/{id}      # Soft delete note

# Folders
GET    /api/folders         # List folders
POST   /api/folders         # Create folder
PUT    /api/folders/{id}    # Update folder
DELETE /api/folders/{id}    # Delete folder

# Tags
GET    /api/tags            # List tags
POST   /api/tags            # Create tag
PUT    /api/tags/{id}       # Update tag
DELETE /api/tags/{id}       # Delete tag

# Search
GET    /api/notes/search    # Full-text search

# Sharing
POST   /api/notes/{id}/share      # Share note
DELETE /api/notes/{id}/share/{userId}  # Revoke share
GET    /api/notes/shared-with-me  # Notes shared with current user

# Sync
POST   /api/sync            # Sync local changes
GET    /api/sync/changes    # Get changes since timestamp
```

### 6.2 Sync Logic

- Background sync when online (every 30 seconds)
- Immediate sync on note save (debounced)
- Offline queue processing when connection restored
- Conflict resolution strategy:
  - Last-write-wins for simple fields
  - Merge for content (if possible)
  - User prompt for unresolvable conflicts
- Sync status indicator in UI

### Deliverables
- [ ] `openapi/notes-api.yaml`
- [ ] Run `npm run api:generate` for client generation
- [ ] `src/features/notes/services/syncService.ts`
- [ ] `src/features/notes/hooks/useSync.ts`
- [ ] `src/features/notes/components/SyncStatus/index.tsx`

---

## File Structure

```
src/
├── features/
│   └── notes/
│       ├── components/
│       │   ├── NoteEditor/
│       │   │   ├── index.tsx
│       │   │   ├── index.module.css
│       │   │   ├── Toolbar.tsx
│       │   │   └── extensions.ts
│       │   ├── NoteList/
│       │   │   ├── index.tsx
│       │   │   ├── index.module.css
│       │   │   ├── NoteCard.tsx
│       │   │   ├── NoteListItem.tsx
│       │   │   ├── ViewToggle.tsx
│       │   │   └── SortMenu.tsx
│       │   ├── FolderTree/
│       │   │   ├── index.tsx
│       │   │   ├── index.module.css
│       │   │   ├── FolderItem.tsx
│       │   │   └── CreateFolderDialog.tsx
│       │   ├── TagManager/
│       │   │   ├── index.tsx
│       │   │   ├── TagPill.tsx
│       │   │   └── TagInput.tsx
│       │   ├── SearchBar/
│       │   │   └── index.tsx
│       │   ├── SearchResults/
│       │   │   └── index.tsx
│       │   ├── ShareModal/
│       │   │   └── index.tsx
│       │   ├── ExportMenu/
│       │   │   └── index.tsx
│       │   ├── SyncStatus/
│       │   │   └── index.tsx
│       │   └── NotesSidebar/
│       │       └── index.tsx
│       ├── hooks/
│       │   ├── useNotes.ts
│       │   ├── useFolders.ts
│       │   ├── useTags.ts
│       │   ├── useSearch.ts
│       │   ├── useSync.ts
│       │   └── useAutoSave.ts
│       ├── store/
│       │   ├── notesSlice.ts
│       │   ├── foldersSlice.ts
│       │   ├── tagsSlice.ts
│       │   └── syncSlice.ts
│       ├── services/
│       │   ├── notesDb.ts
│       │   └── syncService.ts
│       ├── utils/
│       │   └── exporters.ts
│       ├── types/
│       │   └── index.ts
│       └── index.ts
├── pages/
│   ├── NotesPage/
│   │   └── index.tsx
│   └── ...
└── ...
```

---

## Dependencies to Install

```bash
# Rich text editor
npm install @blocknote/core @blocknote/react @blocknote/mantine

# Local database
npm install dexie dexie-react-hooks

# PDF export
npm install @react-pdf/renderer

# Drag and drop (for folders)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | NotesPage | Main notes view with list |
| `/notes/:id` | NotesPage | View/edit specific note |
| `/notes/new` | NotesPage | Create new note |
| `/settings` | SettingsPage | App settings (existing) |

---

## Implementation Order

1. **Phase 1** - Data types, IndexedDB setup, Redux slices
2. **Phase 2** - BlockNote editor with basic functionality
3. **Phase 4** - Note list and navigation (to see notes)
4. **Phase 3** - Folders and tags
5. **Phase 5** - Search, pinning, sharing, export
6. **Phase 6** - Backend sync (when API is ready)

---

## Notes

- The app follows offline-first architecture - all data is stored locally first
- Sync happens in background when online
- Rich text is stored as BlockNote JSON for easy manipulation
- All timestamps are Unix timestamps (milliseconds)
- IDs are UUIDs generated client-side
