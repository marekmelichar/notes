export interface Note {
  id: string;
  title: string;
  content: string; // BlockNote JSON stringified
  folderId: string | null;
  tags: string[]; // Tag IDs
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt: number | null; // Timestamp when moved to trash
  sharedWith: SharedUser[];
  order: number; // Position order within folder
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface SharedUser {
  userId: string;
  email: string;
  permission: "view" | "edit";
}

export interface SyncQueueItem {
  id: string;
  type: "note" | "folder" | "tag";
  action: "create" | "update" | "delete";
  entityId: string;
  data: unknown;
  createdAt: number;
  retries: number;
}

export type NotesSortBy = "createdAt" | "updatedAt" | "title";
export type NotesSortOrder = "asc" | "desc";
export type NotesViewMode = "grid" | "list";

export interface NotesFilter {
  folderId: string | null;
  tagIds: string[];
  isPinned: boolean | null;
  isDeleted: boolean;
  searchQuery: string;
}

export interface NotesState {
  notes: Note[];
  selectedNoteId: string | null;
  filter: NotesFilter;
  sortBy: NotesSortBy;
  sortOrder: NotesSortOrder;
  viewMode: NotesViewMode;
  isLoading: boolean;
  error: string | null;
}

export interface FoldersState {
  folders: Folder[];
  expandedFolderIds: string[];
  isLoading: boolean;
  error: string | null;
}

export interface TagsState {
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChanges: number;
  isOnline: boolean;
  error: string | null;
}
