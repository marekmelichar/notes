import { createSlice, createAsyncThunk, type PayloadAction, createSelector } from '@reduxjs/toolkit';
import { foldersApi } from '../services/notesApi';
import { showSuccess, showError } from '@/store/notificationsSlice';
import type { Folder, FoldersState } from '../types';

const initialState: FoldersState = {
  folders: [],
  expandedFolderIds: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const loadFolders = createAsyncThunk('folders/loadFolders', async () => {
  return await foldersApi.getAll();
});

export const createFolder = createAsyncThunk(
  'folders/createFolder',
  async (data: { name: string; parentId?: string | null; color?: string }, { dispatch }) => {
    try {
      const folders = await foldersApi.getAll();
      const maxOrder = folders.reduce((max, f) => Math.max(max, f.order), -1);

      const now = Date.now();
      const folderData = {
        name: data.name,
        parentId: data.parentId ?? null,
        color: data.color || '#6366f1',
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      };
      // Use the server-generated ID
      const id = await foldersApi.create(folderData);
      dispatch(showSuccess('Folder created'));
      return { ...folderData, id } as Folder;
    } catch (error) {
      dispatch(showError('Failed to create folder'));
      throw error;
    }
  },
);

export const updateFolder = createAsyncThunk(
  'folders/updateFolder',
  async ({ id, updates }: { id: string; updates: Partial<Folder> }, { dispatch }) => {
    try {
      await foldersApi.update(id, updates);
      const folder = await foldersApi.getById(id);
      dispatch(showSuccess('Folder updated'));
      return folder;
    } catch (error) {
      dispatch(showError('Failed to update folder'));
      throw error;
    }
  },
);

export const deleteFolder = createAsyncThunk(
  'folders/deleteFolder',
  async (id: string, { dispatch }) => {
    try {
      await foldersApi.delete(id);
      dispatch(showSuccess('Folder deleted'));
      return id;
    } catch (error) {
      dispatch(showError('Failed to delete folder'));
      throw error;
    }
  },
);

export const reorderFolders = createAsyncThunk(
  'folders/reorderFolders',
  async (folderIds: string[]) => {
    const updates = folderIds.map((id, index) => foldersApi.update(id, { order: index }));
    await Promise.all(updates);
    return await foldersApi.getAll();
  },
);

export const foldersSlice = createSlice({
  name: 'folders',
  initialState,
  reducers: {
    toggleFolderExpanded: (state, action: PayloadAction<string>) => {
      const folderId = action.payload;
      const index = state.expandedFolderIds.indexOf(folderId);
      if (index === -1) {
        state.expandedFolderIds.push(folderId);
      } else {
        state.expandedFolderIds.splice(index, 1);
      }
    },
    expandFolder: (state, action: PayloadAction<string>) => {
      const folderId = action.payload;
      if (!state.expandedFolderIds.includes(folderId)) {
        state.expandedFolderIds.push(folderId);
      }
    },
    setExpandedFolders: (state, action: PayloadAction<string[]>) => {
      state.expandedFolderIds = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load folders
      .addCase(loadFolders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadFolders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.folders = action.payload;
      })
      .addCase(loadFolders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load folders';
      })
      // Create folder
      .addCase(createFolder.fulfilled, (state, action) => {
        state.folders.push(action.payload);
      })
      // Update folder
      .addCase(updateFolder.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.folders.findIndex((f) => f.id === action.payload!.id);
          if (index !== -1) {
            state.folders[index] = action.payload;
          }
        }
      })
      // Delete folder
      .addCase(deleteFolder.fulfilled, (state, action) => {
        state.folders = state.folders.filter((f) => f.id !== action.payload);
        state.expandedFolderIds = state.expandedFolderIds.filter((id) => id !== action.payload);
      })
      // Reorder folders
      .addCase(reorderFolders.fulfilled, (state, action) => {
        state.folders = action.payload;
      });
  },
});

export const { toggleFolderExpanded, expandFolder, setExpandedFolders, clearError } = foldersSlice.actions;

// Selectors
export const selectAllFolders = (state: { folders: FoldersState }) => state.folders.folders;

export const selectRootFolders = createSelector(
  [selectAllFolders],
  (folders) => folders.filter((f) => f.parentId === null).sort((a, b) => a.order - b.order)
);

// Memoized selector factory for child folders
type ChildFoldersSelector = (state: { folders: FoldersState }) => Folder[];
const childFoldersCache = new Map<string, ChildFoldersSelector>();
export const selectChildFolders = (parentId: string): ChildFoldersSelector => {
  if (!childFoldersCache.has(parentId)) {
    childFoldersCache.set(
      parentId,
      createSelector(
        [selectAllFolders],
        (folders) => folders.filter((f) => f.parentId === parentId).sort((a, b) => a.order - b.order)
      )
    );
  }
  return childFoldersCache.get(parentId)!;
};

export const selectFolderById = (id: string) => (state: { folders: FoldersState }) =>
  state.folders.folders.find((f) => f.id === id);

export const selectExpandedFolderIds = (state: { folders: FoldersState }) =>
  state.folders.expandedFolderIds;

export const selectFoldersLoading = (state: { folders: FoldersState }) => state.folders.isLoading;
export const selectFoldersError = (state: { folders: FoldersState }) => state.folders.error;
