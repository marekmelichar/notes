# Performance Optimization Plan

Identified performance issues and recommended fixes, ordered by impact.

## Critical

### 1. `selectSelectedNote` not memoized

**File**: `src/features/notes/store/notesSlice.ts`

The selector runs `.find()` on every Redux state change and returns a new reference, causing NoteEditor to re-render even when the selected note didn't change.

```ts
// Problem: new reference on every state change
export const selectSelectedNote = (state) => {
  return state.notes.notes.find((n) => n.id === state.notes.selectedNoteId) || null;
};

// Fix: wrap with createSelector
export const selectSelectedNote = createSelector(
  [(state) => state.notes.notes, (state) => state.notes.selectedNoteId],
  (notes, selectedNoteId) => notes.find((n) => n.id === selectedNoteId) || null
);
```

### 2. Triple `.sort()` in `selectFilteredNotes`

**File**: `src/features/notes/store/notesSlice.ts`

Three consecutive `.sort()` calls (O(3n log n)). Each subsequent sort partially undoes the previous one.

```ts
// Problem: three O(n log n) passes
filtered.sort(/* user sort */);
filtered.sort(/* folder order */);
filtered.sort(/* pinned first */);

// Fix: single comparator with priority
filtered.sort((a, b) => {
  // 1. Pinned first
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  // 2. Folder grouping
  if (a.folderId === b.folderId) {
    const orderA = a.order ?? a.createdAt;
    const orderB = b.order ?? b.createdAt;
    if (orderA !== orderB) return orderA - orderB;
  }
  // 3. User-selected sort
  // ... sortBy/sortOrder logic
});
```

### 3. Note counts computed on every render

**File**: `src/features/notes/components/NotesSidebar/index.tsx` (lines 574-576)

Three `.filter()` calls over all notes on every render, even for unrelated state changes.

```ts
// Problem: O(3n) on every render
const allNotesCount = notes.filter((n) => !n.isDeleted).length;
const favoritesCount = notes.filter((n) => n.isPinned && !n.isDeleted).length;
const trashCount = notes.filter((n) => n.isDeleted).length;

// Fix: useMemo or memoized selectors
const { allNotesCount, favoritesCount, trashCount } = useMemo(() => {
  let all = 0, fav = 0, trash = 0;
  for (const n of notes) {
    if (n.isDeleted) { trash++; }
    else { all++; if (n.isPinned) fav++; }
  }
  return { allNotesCount: all, favoritesCount: fav, trashCount: trash };
}, [notes]);
```

### 4. `SortableNote` and `DroppableFolder` not memoized

**File**: `src/features/notes/components/NotesSidebar/index.tsx`

These render in loops for every folder/note. Without `React.memo`, any state change (dialog open, typing) re-renders the entire folder tree.

```ts
// Fix: wrap with React.memo
const SortableNote = React.memo(({ note, isSelected, ... }) => { ... });
SortableNote.displayName = 'SortableNote';

const DroppableFolder = React.memo(({ folder, ... }) => { ... });
DroppableFolder.displayName = 'DroppableFolder';
```

Note: callbacks passed to these components must be stabilized with `useCallback` or the memo won't help.

## High

### 5. Dialog state causes full sidebar re-renders

**File**: `src/features/notes/components/NotesSidebar/index.tsx`

~10 `useState` calls for dialog/form values live in the root component. Typing a character in "new folder name" re-renders the entire tree.

```tsx
// Fix: extract dialogs into separate components
const FolderDialog = ({ open, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  // ... form state stays local to this component
};
```

### 6. `box-shadow` on note card selection triggers layout reflow

**File**: `src/features/notes/components/NoteList/index.module.css`

```css
/* Problem: box-shadow triggers reflow */
.noteCardSelected {
  border-color: var(--mui-palette-primary-main);
  box-shadow: 0 0 0 2px var(--mui-palette-primary-light);
}

/* Fix: use outline (doesn't affect layout) */
.noteCardSelected {
  outline: 2px solid var(--mui-palette-primary-main);
  outline-offset: -1px;
}
```

## Medium

### 7. Unbounded selector caches

**Files**: `src/features/notes/store/foldersSlice.ts`, `tagsSlice.ts`

`selectChildFolders` and `selectTagsByIds` use `Map` caches that never evict entries.

- `selectChildFolders`: bounded by folder count (acceptable)
- `selectTagsByIds`: grows with unique tag combinations (problematic)

```ts
// Fix: limit cache size or use WeakRef
const MAX_CACHE_SIZE = 100;
if (tagsByIdsCache.size > MAX_CACHE_SIZE) {
  const firstKey = tagsByIdsCache.keys().next().value;
  tagsByIdsCache.delete(firstKey);
}
```

### 8. No list virtualization

**Files**: `NoteList/index.tsx`, `NotesSidebar/index.tsx`

All 821 notes render to the DOM simultaneously. Only ~10-20 are visible.

```tsx
// Fix: use @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: notes.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => viewMode === 'grid' ? 180 : 60,
});
```

Libraries to consider:
- `@tanstack/react-virtual` (lightweight, flexible)
- `react-window` (simpler API, less flexible)

### 9. O(n) lookups in render paths

**File**: `src/features/notes/components/NotesSidebar/index.tsx`

Multiple `.find()` and `.filter()` calls on arrays where indexed Maps would give O(1).

```ts
// Fix: create indexed lookups
const foldersById = useMemo(() => {
  const map = new Map<string, Folder>();
  for (const f of allFolders) map.set(f.id, f);
  return map;
}, [allFolders]);
```

## Low

### 10. `selectNotesFilter` returns object reference

**File**: `src/features/notes/store/notesSlice.ts`

If any reducer creates a new filter object (even with same values), all consumers re-render. Use `createSelector` with individual field selectors if this becomes a problem.

## Implementation Order

1. Memoize `selectSelectedNote` — single line change, biggest impact on editor
2. Consolidate triple sort — straightforward refactor, 3x less CPU
3. `useMemo` on note counts — quick win for sidebar renders
4. `React.memo` on SortableNote/DroppableFolder — prevents tree re-renders
5. Extract dialog components — isolates form state from tree
6. Replace `box-shadow` with `outline` — CSS-only fix
7. Add virtualization to note list — biggest DOM reduction
