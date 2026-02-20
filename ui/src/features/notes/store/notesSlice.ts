import {
  createSlice,
  createAsyncThunk,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { notesApi } from "../services/notesApi";
import { showSuccess, showError } from "@/store/notificationsSlice";
import { updateItemById, removeItemById } from "@/store/reducerUtils";
import type {
  Note,
  NotesState,
  NotesFilter,
  NotesSortBy,
  NotesSortOrder,
  NotesViewMode,
} from "../types";

const initialFilter: NotesFilter = {
  folderId: null,
  tagIds: [],
  isPinned: null,
  isDeleted: false,
  searchQuery: "",
};

const initialState: NotesState = {
  notes: [],
  filter: initialFilter,
  sortBy: "updatedAt",
  sortOrder: "desc",
  viewMode: "grid",
  isLoading: false,
  isCreating: false,
  error: null,
};

// Async thunks
export const loadNotes = createAsyncThunk("notes/loadNotes", async () => {
  return await notesApi.getAll();
});

export const createNote = createAsyncThunk(
  "notes/createNote",
  async (data: { title?: string; folderId?: string | null }, { dispatch }) => {
    try {
      const now = Date.now();
      // Get the max order in the folder and add 1
      const maxOrder = await notesApi.getMaxOrderInFolder(data.folderId ?? null);
      const noteData = {
        title: data.title || "Untitled",
        content: "",
        folderId: data.folderId ?? null,
        tags: [] as string[],
        isPinned: false,
        isDeleted: false,
        deletedAt: null,
        sharedWith: [],
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
      };
      // Use the server-generated ID
      const id = await notesApi.create(noteData);
      return { ...noteData, id } as Note;
    } catch (error) {
      dispatch(showError("Failed to create note"));
      throw error;
    }
  }
);

export const updateNote = createAsyncThunk(
  "notes/updateNote",
  async ({ id, updates }: { id: string; updates: Partial<Note> }, { dispatch }) => {
    try {
      await notesApi.update(id, updates);
      const updatedNote = await notesApi.getById(id);
      return updatedNote;
    } catch (error) {
      dispatch(showError("Failed to save note"));
      throw error;
    }
  }
);

export const deleteNote = createAsyncThunk(
  "notes/deleteNote",
  async (id: string, { dispatch }) => {
    try {
      await notesApi.delete(id);
      dispatch(showSuccess("Note moved to trash"));
      return id;
    } catch (error) {
      dispatch(showError("Failed to delete note"));
      throw error;
    }
  }
);

export const restoreNote = createAsyncThunk(
  "notes/restoreNote",
  async (id: string, { dispatch }) => {
    try {
      await notesApi.restore(id);
      const note = await notesApi.getById(id);
      dispatch(showSuccess("Note restored"));
      return note;
    } catch (error) {
      dispatch(showError("Failed to restore note"));
      throw error;
    }
  }
);

export const permanentDeleteNote = createAsyncThunk(
  "notes/permanentDeleteNote",
  async (id: string, { dispatch }) => {
    try {
      await notesApi.permanentDelete(id);
      dispatch(showSuccess("Note permanently deleted"));
      return id;
    } catch (error) {
      dispatch(showError("Failed to delete note"));
      throw error;
    }
  }
);

export const searchNotes = createAsyncThunk(
  "notes/searchNotes",
  async (query: string) => {
    return await notesApi.search(query);
  }
);

export const reorderNotes = createAsyncThunk(
  "notes/reorderNotes",
  async (data: { noteOrders: { id: string; order: number }[] }) => {
    await notesApi.reorderNotes(data.noteOrders);
    // Return the updated orders so we can update state
    return data.noteOrders;
  }
);

export const notesSlice = createSlice({
  name: "notes",
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<NotesFilter>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    resetFilter: (state) => {
      state.filter = initialFilter;
    },
    setSortBy: (state, action: PayloadAction<NotesSortBy>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<NotesSortOrder>) => {
      state.sortOrder = action.payload;
    },
    setViewMode: (state, action: PayloadAction<NotesViewMode>) => {
      state.viewMode = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load notes
      .addCase(loadNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload;
      })
      .addCase(loadNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to load notes";
      })
      // Create note
      .addCase(createNote.pending, (state) => {
        state.isCreating = true;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.isCreating = false;
        state.notes.push(action.payload);
      })
      .addCase(createNote.rejected, (state) => {
        state.isCreating = false;
      })
      // Update note
      .addCase(updateNote.fulfilled, (state, action) => {
        updateItemById(state.notes, action.payload);
      })
      // Delete note
      .addCase(deleteNote.fulfilled, (state, action) => {
        const note = state.notes.find((n) => n.id === action.payload);
        if (note) {
          note.isDeleted = true;
        }
      })
      // Restore note
      .addCase(restoreNote.fulfilled, (state, action) => {
        updateItemById(state.notes, action.payload);
      })
      // Permanent delete
      .addCase(permanentDeleteNote.fulfilled, (state, action) => {
        state.notes = removeItemById(state.notes, action.payload);
      })
      // Search notes
      .addCase(searchNotes.fulfilled, (state, action) => {
        // Search results are handled separately, this just updates the notes that match
        state.notes = state.notes.map((note) => {
          const searchResult = action.payload.find((n) => n.id === note.id);
          return searchResult || note;
        });
      })
      // Reorder notes
      .addCase(reorderNotes.fulfilled, (state, action) => {
        // Update order for each note in the payload
        for (const { id, order } of action.payload) {
          const note = state.notes.find((n) => n.id === id);
          if (note) {
            note.order = order;
            note.updatedAt = Date.now();
          }
        }
      });
  },
});

export const {
  setFilter,
  resetFilter,
  setSortBy,
  setSortOrder,
  setViewMode,
  clearError,
} = notesSlice.actions;

// Selectors
export const selectAllNotes = (state: { notes: NotesState }) =>
  state.notes.notes;

const selectNotesState = (state: { notes: NotesState }) => state.notes;

export const selectFilteredNotes = createSelector(
  [selectNotesState],
  ({ notes, filter, sortBy, sortOrder }) => {
    const filtered = notes.filter((note) => {
      // Filter by deleted status
      if (note.isDeleted !== filter.isDeleted) return false;

      // Filter by folder
      if (filter.folderId !== null && note.folderId !== filter.folderId)
        return false;

      // Filter by tags
      if (
        filter.tagIds.length > 0 &&
        !filter.tagIds.some((tagId) => note.tags.includes(tagId))
      ) {
        return false;
      }

      // Filter by pinned
      if (filter.isPinned !== null && note.isPinned !== filter.isPinned)
        return false;

      // Filter by search query
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        if (
          !note.title.toLowerCase().includes(query) &&
          !note.content.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      return true;
    });

    // Single sort with priority: pinned first → folder order → user sort
    filtered.sort((a, b) => {
      // 1. Pinned notes always first
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      // 2. Within same folder, use manual order
      if (a.folderId === b.folderId) {
        const orderA = a.order ?? a.createdAt;
        const orderB = b.order ?? b.createdAt;
        if (orderA !== orderB) return orderA - orderB;
      }

      // 3. User-selected sort
      let comparison = 0;
      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "createdAt":
          comparison = a.createdAt - b.createdAt;
          break;
        case "updatedAt":
        default:
          comparison = a.updatedAt - b.updatedAt;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }
);

export const selectNotesLoading = (state: { notes: NotesState }) =>
  state.notes.isLoading;
export const selectNotesError = (state: { notes: NotesState }) =>
  state.notes.error;
export const selectNotesFilter = (state: { notes: NotesState }) =>
  state.notes.filter;
export const selectNotesSortBy = (state: { notes: NotesState }) =>
  state.notes.sortBy;
export const selectNotesSortOrder = (state: { notes: NotesState }) =>
  state.notes.sortOrder;
export const selectNotesViewMode = (state: { notes: NotesState }) =>
  state.notes.viewMode;
export const selectNotesCreating = (state: { notes: NotesState }) =>
  state.notes.isCreating;
