import {
  createSlice,
  createAsyncThunk,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { notesApi } from "../services/notesApi";
import { showSuccess, showError } from "@/store/notificationsSlice";
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
  selectedNoteId: null,
  filter: initialFilter,
  sortBy: "updatedAt",
  sortOrder: "desc",
  viewMode: "grid",
  isLoading: false,
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
        sharedWith: [],
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
        syncedAt: null,
      };
      // Use the server-generated ID
      const id = await notesApi.create(noteData);
      dispatch(showSuccess("Note created"));
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
    setSelectedNote: (state, action: PayloadAction<string | null>) => {
      state.selectedNoteId = action.payload;
    },
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
      .addCase(createNote.fulfilled, (state, action) => {
        state.notes.push(action.payload);
        state.selectedNoteId = action.payload.id;
      })
      // Update note
      .addCase(updateNote.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.notes.findIndex(
            (n) => n.id === action.payload!.id
          );
          if (index !== -1) {
            state.notes[index] = action.payload;
          }
        }
      })
      // Delete note
      .addCase(deleteNote.fulfilled, (state, action) => {
        const note = state.notes.find((n) => n.id === action.payload);
        if (note) {
          note.isDeleted = true;
        }
        if (state.selectedNoteId === action.payload) {
          state.selectedNoteId = null;
        }
      })
      // Restore note
      .addCase(restoreNote.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.notes.findIndex(
            (n) => n.id === action.payload!.id
          );
          if (index !== -1) {
            state.notes[index] = action.payload;
          }
        }
      })
      // Permanent delete
      .addCase(permanentDeleteNote.fulfilled, (state, action) => {
        state.notes = state.notes.filter((n) => n.id !== action.payload);
        if (state.selectedNoteId === action.payload) {
          state.selectedNoteId = null;
        }
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
  setSelectedNote,
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
    let filtered = notes.filter((note) => {
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

    // Sort
    filtered.sort((a, b) => {
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

    // Sort by order within the same folder (for manual reordering)
    // This is a secondary sort that preserves the order field when notes are in the same folder
    filtered.sort((a, b) => {
      // Only apply order sort when both notes are in the same folder
      if (a.folderId === b.folderId) {
        const orderA = a.order ?? a.createdAt;
        const orderB = b.order ?? b.createdAt;
        return orderA - orderB;
      }
      return 0;
    });

    // Pinned notes first
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return filtered;
  }
);

export const selectSelectedNote = (state: { notes: NotesState }) => {
  const { notes, selectedNoteId } = state.notes;
  return notes.find((n) => n.id === selectedNoteId) || null;
};

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
