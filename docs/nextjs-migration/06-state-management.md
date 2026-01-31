# 06 — State Management

The current app uses Redux Toolkit for global state management. This document describes all state slices, their shapes, actions, and persistence — serving as a specification for whatever state management approach you choose in Next.js (Zustand, Redux, React Context, server state, etc.).

---

## State Architecture Overview

```
Store
├── auth        — Authentication state (user, token, access status)
├── ui          — UI state (mobile view, sidebar/notelist collapsed)
├── notifications — Snackbar notification queue
├── tabs        — Open editor tabs and active tab
├── notes       — Notes data, filter, sort, view mode
├── folders     — Folders data, expanded folder IDs
├── tags        — Tags data
└── sync        — Offline sync state (online status, pending changes)
```

---

## Auth Slice

### State Shape

```typescript
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | undefined;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    realmRoles: string[];
  } | null;
  error: string | null;
  accessStatus: 'unknown' | 'authorized' | 'unauthorized';
}
```

### Actions / Thunks

| Action | Type | Description |
|--------|------|-------------|
| `initializeAuth()` | Async thunk | Initialize Keycloak, check SSO, load user |
| `login()` | Async thunk | Redirect to Keycloak login |
| `logout()` | Async thunk | Clear token, cleanup Keycloak, redirect |
| `setAccessStatus(status)` | Reducer | Set to 'authorized' or 'unauthorized' |

### Persistence
- Token stored in `localStorage('LOGGED_CLIENT_TOKEN')` as `"Bearer <jwt>"`
- User data not persisted — loaded from JWT on each init

---

## UI Slice

### State Shape

```typescript
interface UiState {
  mobileView: 'sidebar' | 'list' | 'editor';
  isMobile: boolean;
  sidebarCollapsed: boolean;
  noteListCollapsed: boolean;
  noteListHidden: boolean;
}
```

### Actions

| Action | Description |
|--------|-------------|
| `setMobileView(view)` | Switch mobile panel (sidebar/list/editor) |
| `setIsMobile(boolean)` | Set mobile breakpoint state |
| `setSidebarCollapsed(boolean)` | Set sidebar collapsed state |
| `toggleSidebarCollapsed()` | Toggle sidebar |
| `setNoteListCollapsed(boolean)` | Set note list collapsed state |
| `toggleNoteListCollapsed()` | Toggle note list collapsed |
| `setNoteListHidden(boolean)` | Set note list hidden |
| `toggleNoteListHidden()` | Toggle note list hidden |

### Persistence

| Key | Value | Description |
|-----|-------|-------------|
| `sidebar-collapsed` | `'true'` / `'false'` | Sidebar collapse state |
| `notelist-collapsed` | `'true'` / `'false'` | Note list collapse state |
| `notelist-hidden` | `'true'` / `'false'` | Note list visibility |

---

## Notifications Slice

### State Shape

```typescript
interface NotificationsState {
  notifications: {
    id: string;
    message: string;
    variant: 'success' | 'error' | 'info' | 'warning';
  }[];
}
```

### Actions

| Action | Description |
|--------|-------------|
| `addNotification({ message, variant })` | Add snackbar (auto-generates ID) |
| `removeNotification(id)` | Remove specific notification |
| `clearNotifications()` | Remove all |

### Convenience Helpers

```typescript
showSuccess(message: string)   // dispatch(addNotification({ message, variant: 'success' }))
showError(message: string)     // dispatch(addNotification({ message, variant: 'error' }))
showInfo(message: string)      // dispatch(addNotification({ message, variant: 'info' }))
showWarning(message: string)   // dispatch(addNotification({ message, variant: 'warning' }))
```

---

## Tabs Slice

### State Shape

```typescript
interface TabsState {
  openTabs: {
    id: string;                  // Note ID
    hasUnsavedChanges: boolean;
  }[];
  activeTabId: string | null;
}
```

### Actions

| Action | Description |
|--------|-------------|
| `openTab(noteId)` | Open tab or activate if already open. Max 20 tabs — auto-closes oldest tab without unsaved changes |
| `closeTab(noteId)` | Close tab. If closing active tab, switches to adjacent tab |
| `setActiveTab(noteId)` | Activate an already-open tab |
| `reorderTabs({ fromIndex, toIndex })` | Drag-and-drop tab reordering |
| `setTabUnsaved({ id, hasUnsavedChanges })` | Mark tab as having unsaved changes |
| `closeOtherTabs(keepId)` | Close all tabs except the specified one |
| `closeAllTabs()` | Close all tabs |

### Auto-Actions (Extra Reducers)

| Trigger | Action |
|---------|--------|
| `createNote.fulfilled` | Auto-opens new note as a tab |
| `deleteNote.fulfilled` | Auto-closes deleted note's tab |
| `permanentDeleteNote.fulfilled` | Auto-closes permanently deleted note's tab |

### Persistence

| Key | Value | Description |
|-----|-------|-------------|
| `editor-open-tabs` | JSON array of note IDs | Restored on app load |
| `editor-active-tab` | Note ID string | Restored on app load |

---

## Notes Slice

### State Shape

```typescript
interface NotesState {
  notes: Note[];
  filter: {
    folderId: string | null;
    tagIds: string[];
    isPinned: boolean | null;
    isDeleted: boolean;
    searchQuery: string;
  };
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  error: string | null;
}
```

### Async Thunks

| Thunk | API Call | Description |
|-------|----------|-------------|
| `loadNotes()` | `GET /api/v1/notes` | Fetch all notes for user |
| `createNote({ title?, folderId? })` | `POST /api/v1/notes` | Create note (auto-calculates max order in folder) |
| `updateNote({ id, updates })` | `PUT /api/v1/notes/{id}` | Update note |
| `deleteNote(id)` | `DELETE /api/v1/notes/{id}` | Soft delete |
| `restoreNote(id)` | `POST /api/v1/notes/{id}/restore` | Restore from trash |
| `permanentDeleteNote(id)` | `DELETE /api/v1/notes/{id}/permanent` | Hard delete |
| `searchNotes(query)` | `GET /api/v1/notes/search?q={query}` | Full-text search |
| `reorderNotes({ noteOrders })` | `POST /api/v1/notes/reorder` | Batch reorder |

### Reducers

| Action | Description |
|--------|-------------|
| `setFilter(filterUpdate)` | Merge partial filter update |
| `resetFilter()` | Reset all filters to defaults |
| `setSortBy(field)` | Change sort field |
| `setSortOrder(order)` | Change sort direction |
| `setViewMode(mode)` | Switch grid/list view |

### Selectors

| Selector | Description |
|----------|-------------|
| `selectAllNotes()` | All notes in state |
| `selectFilteredNotes()` | **Memoized** — applies filter + sort logic |
| `selectNotesLoading()` | Loading state |
| `selectNotesError()` | Error state |

### Filtered Notes Logic (selectFilteredNotes)

```
1. Start with all notes
2. Filter by isDeleted (active vs trash view)
3. Filter by folderId (if set)
4. Filter by tagIds (notes must have ALL selected tags)
5. Filter by isPinned (if set)
6. Filter by searchQuery (client-side title match)
7. Sort:
   a. Pinned notes always first
   b. Within groups: folder order (if viewing folder)
   c. Then: user-selected sort (updatedAt/createdAt/title, asc/desc)
```

---

## Folders Slice

### State Shape

```typescript
interface FoldersState {
  folders: Folder[];
  expandedFolderIds: string[];
  isLoading: boolean;
  error: string | null;
}
```

### Async Thunks

| Thunk | API Call | Description |
|-------|----------|-------------|
| `loadFolders()` | `GET /api/v1/folders` | Fetch all folders |
| `createFolder({ name, parentId?, color? })` | `POST /api/v1/folders` | Create folder |
| `updateFolder({ id, updates })` | `PUT /api/v1/folders/{id}` | Update folder |
| `deleteFolder(id)` | `DELETE /api/v1/folders/{id}` | Delete folder |
| `reorderFolders(folderIds)` | `POST /api/v1/folders/reorder` | Batch reorder |

### Reducers

| Action | Description |
|--------|-------------|
| `toggleFolderExpanded(id)` | Toggle folder expand/collapse |
| `expandFolder(id)` | Expand single folder |
| `setExpandedFolders(ids)` | Set all expanded IDs (for expand/collapse all) |

### Selectors

| Selector | Description |
|----------|-------------|
| `selectRootFolders()` | Root-level folders (parentId = null), sorted by order |
| `selectChildFolders(parentId)` | Children of a folder (memoized factory) |
| `selectFolderById(id)` | Single folder lookup |
| `selectExpandedFolderIds()` | Currently expanded folder IDs |

---

## Tags Slice

### State Shape

```typescript
interface TagsState {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
}
```

### Async Thunks

| Thunk | API Call | Description |
|-------|----------|-------------|
| `loadTags()` | `GET /api/v1/tags` | Fetch all tags |
| `createTag({ name, color? })` | `POST /api/v1/tags` | Create tag |
| `updateTag({ id, updates })` | `PUT /api/v1/tags/{id}` | Update tag |
| `deleteTag(id)` | `DELETE /api/v1/tags/{id}` | Delete tag |

### Selectors

| Selector | Description |
|----------|-------------|
| `selectAllTags()` | All tags |
| `selectTagById(id)` | Single tag lookup |
| `selectTagsByIds(ids)` | Multiple tags by ID array (memoized factory) |

---

## Sync Slice

### State Shape

```typescript
interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;   // Unix ms
  pendingChanges: number;
  isOnline: boolean;
  error: string | null;
}
```

### Async Thunks

| Thunk | Description |
|-------|-------------|
| `checkPendingChanges()` | Count items in IndexedDB sync queue |
| `syncWithServer()` | Process sync queue (currently clears queue) |
| `clearSyncQueue()` | Clear all pending sync items |

### Reducers

| Action | Description |
|--------|-------------|
| `setOnlineStatus(boolean)` | Update online/offline status |

---

## localStorage Keys Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `LOGGED_CLIENT_TOKEN` | string | — | JWT token with "Bearer " prefix |
| `theme` | `'light'` / `'dark'` | system pref | Color mode |
| `primaryColor` | hex string | `#007ACC` | Custom accent color |
| `sidebar-collapsed` | `'true'` / `'false'` | `'false'` | Sidebar state |
| `notelist-collapsed` | `'true'` / `'false'` | `'false'` | Note list state |
| `notelist-hidden` | `'true'` / `'false'` | `'false'` | Note list visibility |
| `sidebar-width` | number (px) | `240` | Sidebar panel width |
| `notelist-width` | number (px) | `350` | Note list panel width |
| `recent-height` | number (px) | `180` | Recent section height |
| `editor-open-tabs` | JSON string[] | `[]` | Open tab note IDs |
| `editor-active-tab` | string | `null` | Active tab note ID |

---

## Data Flow Example: Creating a Note

```
1. User clicks "+" in NoteList header
2. dispatch(createNote({ folderId: currentFilter.folderId }))
3. Thunk: Calculate max order in folder → POST /api/v1/notes
4. API returns new Note with ID
5. notesSlice: Adds note to notes array
6. tabsSlice (extra reducer): Auto-opens new tab with note ID
7. URL updates to /notes/{newNoteId}
8. SingleNoteEditor renders for the new note
9. User types title + content
10. After 10 seconds of inactivity → auto-save
    → dispatch(updateNote({ id, updates: { title, content } }))
    → PUT /api/v1/notes/{id}
11. tabsSlice: setTabUnsaved({ id, hasUnsavedChanges: false })
```

## Data Flow Example: Filtering Notes

```
1. User clicks a folder in sidebar
2. dispatch(setFilter({ folderId: 'uuid' }))
3. selectFilteredNotes() recomputes (memoized)
4. NoteList re-renders with filtered notes
5. Notes sorted: pinned first → folder order → user sort preference
```
