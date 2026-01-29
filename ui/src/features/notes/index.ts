// Components
export { NoteEditor } from './components/NoteEditor';
export { NoteList } from './components/NoteList';
export { NotesSidebar } from './components/NotesSidebar';
export { EditorPanel } from './components/EditorPanel';

// Notes Store
export {
  notesSlice,
  loadNotes,
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
  permanentDeleteNote,
  searchNotes,
  setFilter,
  resetFilter,
  setSortBy,
  setSortOrder,
  setViewMode,
  clearError as clearNotesError,
  selectAllNotes,
  selectFilteredNotes,
  selectNotesLoading,
  selectNotesError,
  selectNotesFilter,
  selectNotesSortBy,
  selectNotesSortOrder,
  selectNotesViewMode,
} from './store/notesSlice';

// Folders Store
export {
  foldersSlice,
  loadFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  reorderFolders,
  toggleFolderExpanded,
  setExpandedFolders,
  clearError as clearFoldersError,
  selectAllFolders,
  selectRootFolders,
  selectChildFolders,
  selectFolderById,
  selectExpandedFolderIds,
  selectFoldersLoading,
  selectFoldersError,
} from './store/foldersSlice';

// Tags Store
export {
  tagsSlice,
  loadTags,
  createTag,
  updateTag,
  deleteTag,
  clearError as clearTagsError,
  selectAllTags,
  selectTagById,
  selectTagsByIds,
  selectTagsLoading,
  selectTagsError,
} from './store/tagsSlice';

// Sync Store
export {
  syncSlice,
  checkPendingChanges,
  syncWithServer,
  clearSyncQueue,
  setOnlineStatus,
  clearSyncError,
  selectSyncState,
  selectIsSyncing,
  selectLastSyncedAt,
  selectPendingChanges,
  selectIsOnline,
  selectSyncError,
} from './store/syncSlice';

// Types
export type * from './types';

// Services
export { db, notesDb, foldersDb, tagsDb, syncQueueDb } from './services/notesDb';
