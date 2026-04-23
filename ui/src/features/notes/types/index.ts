export interface NoteListItem {
  id: string;
  title: string;
  folderId: string | null;
  tags: string[];
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Note extends NoteListItem {
  content: string;
  syncedAt: number | null;
}

export const toListItem = ({ content: _, syncedAt: __, ...item }: Note): NoteListItem => item;

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

export type NotesSortBy = "createdAt" | "updatedAt" | "title";
export type NotesSortOrder = "asc" | "desc";
export type NotesViewMode = "grid" | "list";

export interface NotesFilter {
  folderId: string | null;
  tagIds: string[];
  isPinned: boolean | null;
  isDeleted: boolean;
}

export interface NotesState {
  notes: NoteListItem[];
  noteDetails: Record<string, Note>;
  filter: NotesFilter;
  sortBy: NotesSortBy;
  sortOrder: NotesSortOrder;
  viewMode: NotesViewMode;
  isLoading: boolean;
  isCreating: boolean;
  isSearchActive: boolean;
  error: string | null;
  // Note ids locked out from further autosaves after a 409 conflict, keyed
  // to the user-visible message. Cleared by reloading the detail or via
  // the clearNoteConflict reducer.
  conflictedNoteIds: Record<string, string>;
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
