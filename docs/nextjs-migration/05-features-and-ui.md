# 05 — Features & UI Specification

This document describes every feature, page, and UI component in the application. Use it as a specification for rebuilding in Next.js.

---

## Page Structure

### Route Map

```
/                     → NotesPage (main app, protected)
/notes/:noteId        → NotesPage with specific note open (protected)
/settings             → SettingsPage (protected)
/no-access            → NoAccessPage (public)
*                     → Redirect to /
```

All protected routes are wrapped in a layout that includes the Header and (on mobile) the bottom MobileNavigation bar.

---

## Page: Notes (`/` and `/notes/:noteId`)

This is the main application page. It displays a 3-panel layout on desktop and a single-panel layout on mobile.

### Desktop Layout (>768px / >48rem)

```
┌─────────────────────────────────────────────────────────────┐
│                        Header (64px)                         │
├───────────┬──────────────┬──────────────────────────────────┤
│  Sidebar  │  Note List   │         Editor Panel              │
│  (240px)  │  (350px)     │         (remaining)               │
│           │              │                                    │
│ Folders   │ [Sort] [+]   │  ┌─────────────────────────────┐ │
│ Tags      │              │  │  Tab1 | Tab2 | Tab3    [x]  │ │
│ Filters   │ Note Item 1  │  ├─────────────────────────────┤ │
│           │ Note Item 2  │  │  [Title Input]              │ │
│           │ Note Item 3  │  │  [Folder] [Pin] [Export]    │ │
│           │ ...          │  │  [Tags: tag1, tag2, +]      │ │
│           │              │  │                              │ │
│           │              │  │  BlockNote Rich Text Editor  │ │
│           │              │  │                              │ │
│           │              │  │                              │ │
│           │              │  ├─────────────────────────────┤ │
│           │              │  │  42 words · 256 chars        │ │
│           │              │  │  Saved: 2 min ago            │ │
│           │              │  └─────────────────────────────┘ │
└───────────┴──────────────┴──────────────────────────────────┘
```

**Panel widths are resizable** via drag handles:
- Sidebar: 180–800px, default 240px, persisted in `localStorage('sidebar-width')`
- Note List: 200–600px, default 350px, persisted in `localStorage('notelist-width')`
- Editor: Takes remaining space

**Panels can be collapsed:**
- Sidebar: Toggled via button, persisted in `localStorage('sidebar-collapsed')`
- Note List: Toggled via button, persisted in `localStorage('notelist-collapsed')`
- Note List can also be hidden entirely: `localStorage('notelist-hidden')`

At 1024px width, the sidebar auto-collapses.

### Mobile Layout (<=768px / <=48rem)

Single panel view controlled by bottom navigation:

```
┌──────────────────────┐
│     Header (64px)     │
├──────────────────────┤
│                       │
│   [Active Panel]      │
│   (one of 3 views)    │
│                       │
│                       │
│                       │
├──────────────────────┤
│ [Folders][Notes][Edit]│  ← Bottom Navigation (56px)
└──────────────────────┘
```

**Mobile View States:** `'sidebar' | 'list' | 'editor'`
- **Folders** (`sidebar`): Shows NotesSidebar
- **Notes** (`list`): Shows NoteList
- **Editor** (`editor`): Shows EditorPanel (tab disabled if no note selected)

Selecting a note auto-switches to `editor` view.

### URL Synchronization

- Active tab note ID is synced to URL: `/notes/{noteId}`
- Browser back/forward navigates between tabs
- Deep linking works: visiting `/notes/{id}` opens that note

---

## Component: Header

Fixed at top, 64px height.

**Contents:**
- **Logo** (left) — links to `/`
- **Search input** — opens SearchDialog on click, focused by `Ctrl+K` / `Cmd+K`
- **"New Note" button** — creates note in current folder, opens in editor
- **Language switch dropdown** — Czech / English
- **User avatar menu** (right):
  - User info (avatar + username)
  - Dark mode toggle switch
  - Show/hide note list toggle (desktop only)
  - Settings link → `/settings`
  - Logout button
  - App version (fetched from `/version.txt`)

---

## Component: NotesSidebar

The left panel with navigation and organization.

### Quick Filters Section
Three clickable filter buttons:
- **All Notes** — shows all non-deleted notes (with count)
- **Favorites** — shows pinned notes only (with count)
- **Trash** — shows deleted notes (with count)

### Recent Section
- Shows last 18 updated notes (sorted by `updatedAt` desc)
- Each item shows note title (or "Untitled")
- Click to open note in editor
- Section height is **resizable** via drag handle: 60–500px, default 180px

### Folders Section
- **Header:** "Folders" label + Expand All / Collapse All buttons + Tree View toggle
- **Tree View Toggle:**
  - "Folders only" — shows folder tree without notes inside
  - "With notes" — shows folder tree with notes nested under each folder
- **Folder Tree:**
  - Hierarchical display with expand/collapse arrows
  - Each folder shows: color dot + name + note count badge
  - Click folder → filters note list to that folder
  - Right-side "+" button → add subfolder dialog
  - **Drag-and-drop:**
    - Drag notes between folders
    - Reorder notes within a folder
    - Move folders under other folders
    - Prevent circular references (can't drop parent into child)
- **"Unfiled" drop zone** (in tree view mode): Drop notes here to remove from folder
- **Create Folder dialog:** Name input + parent folder display (read-only)

### Tags Section
- List of all tags with color indicators (border/dot)
- Click tag → toggles tag filter (multi-select, highlighted when active)
- Edit button (pencil icon) → opens edit dialog with name + color picker
- Delete button (x icon) → deletes tag (with confirmation)
- **"+ New Tag" button** → opens create dialog with name + color picker

---

## Component: NoteList

The middle panel showing filtered/sorted notes.

### Header
- **Sort menu:** Modified / Created / Title (ascending/descending toggle)
- **"+" button:** Create new note in current folder

### List Items (NoteListItem)
Each item displays:
- **Title** (or "Untitled" if empty)
- **Content preview** — first 80 characters of plain text content
- **Up to 2 tag chips** — colored, showing tag name
- **Relative time** — "2 hours ago", "yesterday", etc.
- **Pin indicator** — pin icon if note is pinned
- **Trash info** — for deleted notes, shows days remaining ("15 days") until permanent deletion

Click opens the note in the editor.

### Sorting Logic
1. **Pinned notes always first**
2. Within pinned/unpinned groups: **folder order** (if viewing a folder)
3. Then: user-selected sort (updatedAt / createdAt / title, asc/desc)

### Filtering
Applied client-side based on `NotesFilter`:
- Folder filter (from sidebar selection)
- Tag filter (from sidebar tag clicks)
- Pinned filter (from "Favorites" quick filter)
- Deleted filter (from "Trash" quick filter)
- Search query

### Empty States
- **No notes in filter:** "No notes" message with hint
- **Loading:** Spinner

### Virtualization
Uses **Virtuoso** for efficient rendering of large lists.

---

## Component: EditorPanel

The right panel containing tabbed editors.

### EditorTabs (top bar)
- Horizontal scrollable tab bar
- Each tab shows: note title (or "Untitled") + unsaved indicator (dot) + close button (x)
- Click tab → switch active editor
- Middle-click → close tab
- **Drag to reorder** tabs
- **Max 20 tabs** — if limit reached, oldest tab without unsaved changes is auto-closed
- Tab state persisted in `localStorage('editor-open-tabs')` and `localStorage('editor-active-tab')`

### SingleNoteEditor (per tab)

Each open tab renders a full editor instance. Only the active tab is visible.

**Title area:**
- Large text input for note title
- Auto-saves on change (part of the note update)

**Toolbar row:**
- **Save button** — manual save, shows "Saved" / "Saving..." state
- **Folder button** — dropdown menu to move note to a folder or remove from folder
- **Pin button** — toggle pinned state
- **Export menu** — dropdown with: PDF, Word (DOCX), Markdown, HTML
- **Delete button** — soft delete (or "Restore" if in trash, or "Permanent Delete" if in trash)

**Tags row:**
- Displays selected tags as colored chips with delete (x) button
- "+" button opens TagPicker menu:
  - List of all tags with checkmarks for selected
  - Inline "Create new tag" option
  - Click to toggle tag on/off

**Editor area:**
- **BlockNote** rich text editor (block-based, Notion-like)
- Supports: paragraphs, headings (1-3), bullet lists, numbered lists, checklists, code blocks, images, files, tables, quotes, dividers
- **File upload:** Drag-and-drop images/files into editor
  - Uploads via `POST /api/v1/files`
  - Max 100 MB per file
  - Shows error if offline
- **Keyboard shortcut:** `Ctrl+S` / `Cmd+S` for manual save

**Footer:**
- Word count + character count
- Last saved timestamp (relative: "Saved: 2 min ago")
- Auto-save countdown ("Auto-save in 8s")

**Auto-save behavior:**
- Triggers 10 seconds after last content change
- Countdown displayed in footer
- Resets on every new change
- Manual save (`Ctrl+S`) cancels countdown and saves immediately
- Unsaved changes tracked per tab (dot indicator in tab header)

**Export functionality:**
- **PDF:** Uses BlockNote PDF exporter + React PDF renderer → downloads `.pdf`
- **DOCX:** Uses BlockNote DOCX exporter → downloads `.docx`
- **Markdown:** Converts blocks to Markdown text → downloads `.md`
- **HTML:** Converts blocks to full HTML → downloads `.html`
- All exports prepend the note title as a heading

---

## Component: SearchDialog

Global search modal, opened via:
- Click on search input in header
- `Ctrl+K` / `Cmd+K` keyboard shortcut

**Features:**
- Full-width search input with auto-focus
- **Debounced search** (300ms) — calls `GET /api/v1/notes/search?q={query}`
- Results show: note title, content snippet, folder badge
- **Keyboard navigation:** Arrow keys (up/down) to navigate, Enter to select, Escape to close
- Loading spinner while searching
- Empty state: "Type to search" / "No results"
- Selecting a result opens the note in the editor and closes the dialog

---

## Component: MobileNavigation

Bottom navigation bar, visible only on mobile (<768px / <48rem). Height: 56px.

Three tabs:
1. **Folders** (folder icon) → switches to `sidebar` view
2. **Notes** (list icon) → switches to `list` view
3. **Editor** (edit icon) → switches to `editor` view (disabled if no note selected)

---

## Page: Settings (`/settings`)

Application settings page.

### Appearance Section
- **Dark mode toggle** — Light / Dark switch
- **Primary color picker:**
  - 6 preset colors: Blue (#007ACC), Purple, Green, Orange, Pink, Teal
  - Custom hex color input field
  - Live preview (theme updates immediately)
  - "Reset to Default" button (resets to #007ACC)
- Colors persisted in `localStorage('theme')` and `localStorage('primaryColor')`

### Layout Section
- **Show note list toggle** — hides/shows the note list panel on desktop

---

## Page: No Access (`/no-access`)

Shown when user gets a 403 from the API.

- Displays the logged-in user's email
- "Try a different account" button → triggers logout + re-login flow

---

## Page: Not Found (`*`)

All unknown routes redirect to `/`.

---

## Notification System

Snackbar notifications (bottom-left):
- Variants: success, error, info, warning
- Auto-hide after 10 seconds
- Custom icons per variant
- Managed via Redux `notificationsSlice`
- Convenience methods: `showSuccess()`, `showError()`, `showInfo()`, `showWarning()`

---

## Error Boundary

Catches React component crashes and displays:
- "Something went wrong" message
- Error details (in development mode)
- "Reload" button (reloads page)
- "Home" button (navigates to `/`)

---

## Theming

### Dynamic Theme System

The app generates a full MUI theme from two user preferences:
- **Mode:** `'light' | 'dark'`
- **Primary color:** Any hex color (default: `#007ACC`)

From the primary color, the system generates:
- Primary palette (main, light, dark, contrastText)
- Primary container colors
- Secondary palette (hue-shifted from primary)
- Secondary container colors

Light and dark palettes have separate base configurations for backgrounds, surfaces, and text colors.

### Theme Context

```typescript
interface ThemeContext {
  mode: 'light' | 'dark';
  toggleColorMode: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  resetPrimaryColor: () => void;
}
```

### Persistence
- `localStorage('theme')` — `'light'` or `'dark'`
- `localStorage('primaryColor')` — hex string
- Falls back to `prefers-color-scheme` media query if no stored preference

---

## Responsive Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| Mobile | <=768px (48rem) | Single panel + bottom nav |
| Medium | <=1024px | Auto-collapse sidebar |
| Desktop | >1024px | Full 3-column layout |
| Landscape mobile | height <500px | Special compact layout |

---

## Drag-and-Drop

The app uses **dnd-kit** for drag-and-drop interactions in the sidebar:

### Supported Operations
1. **Move note to folder** — drag note, drop on folder
2. **Reorder notes within folder** — drag note, drop between notes in same folder
3. **Move note to unfiled** — drag note, drop on "Unfiled" zone
4. **Move folder under another folder** — drag folder, drop on target folder
5. **Reorder tabs** — drag tab in editor tab bar

### Validation
- Cannot drop a folder into its own descendant (circular reference prevention)
- Reordering only works within the same folder (cross-folder drop = move, not reorder)
- Visual feedback: highlight drop targets during drag

---

## Offline-First Architecture

### Local Storage (IndexedDB via Dexie)
- Notes, folders, and tags are cached in IndexedDB
- Sync queue tracks pending changes when offline

### Sync Queue
- When offline, CRUD operations are queued in `syncQueue` table
- Each queue item tracks: entity type, action, data, retry count
- When online, queue is processed and changes synced to API

### Online/Offline Detection
- Browser `online`/`offline` events monitored
- `isOnline` state tracked in Redux `syncSlice`
- File upload blocked when offline (user-facing error message)

### Sync State

```typescript
interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;   // Unix ms
  pendingChanges: number;        // Count of queued items
  isOnline: boolean;
  error: string | null;
}
```
