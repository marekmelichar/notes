import {
  createSlice,
  createAsyncThunk,
  createSelector,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { notesApi, type GetListParams } from "../services/notesApi";
import { showSuccess, showError } from "@/store/notificationsSlice";
import { getApiErrorMessage } from "@/lib";
import i18n from "@/i18n";
import { removeItemById } from "@/store/reducerUtils";
import { toListItem } from "../types";
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import type {
  Note,
  NotesState,
  NotesFilter,
  NotesSortBy,
  NotesSortOrder,
  NotesViewMode,
} from "../types";

interface ThunkApi {
  dispatch: Dispatch<UnknownAction>;
}

// Thunk error handling wrapper — eliminates try/catch duplication
function withApiError<TArg, TResult>(
  errorKey: string,
  fn: (arg: TArg, thunkApi: ThunkApi) => Promise<TResult>,
): (arg: TArg, thunkApi: ThunkApi) => Promise<TResult> {
  return async (arg, thunkApi) => {
    try {
      return await fn(arg, thunkApi);
    } catch (error) {
      thunkApi.dispatch(showError(getApiErrorMessage(error, i18n.t(errorKey))));
      throw error;
    }
  };
}

const initialFilter: NotesFilter = {
  folderId: null,
  tagIds: [],
  isPinned: null,
  isDeleted: false,
};

const initialState: NotesState = {
  notes: [],
  noteDetails: {},
  filter: initialFilter,
  sortBy: "updatedAt",
  sortOrder: "desc",
  viewMode: "grid",
  isLoading: false,
  isCreating: false,
  isSearchActive: false,
  error: null,
};

const buildListParams = (state: NotesState): GetListParams => ({
  filter: state.filter,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
});

// Async thunks
export const loadNotes = createAsyncThunk(
  "notes/loadNotes",
  async (_, { getState }) => {
    const { notes: notesState } = getState() as { notes: NotesState };
    return await notesApi.getList(buildListParams(notesState));
  },
  {
    condition: (_, { getState }) => {
      const { notes } = getState() as { notes: NotesState };
      return !notes.isLoading;
    },
  },
);

export const loadNoteDetail = createAsyncThunk(
  "notes/loadNoteDetail",
  async (id: string) => await notesApi.getById(id),
  {
    condition: (id, { getState }) => {
      const { notes } = getState() as { notes: NotesState };
      return !notes.noteDetails[id];
    },
  },
);

export const createNote = createAsyncThunk(
  "notes/createNote",
  withApiError<{ title?: string; folderId?: string | null }, Note>(
    "Notes.CreateError",
    async (data) => notesApi.create({
      title: data.title || i18n.t("Common.Untitled"),
      content: "",
      folderId: data.folderId ?? null,
      tags: [],
      isPinned: false,
    }),
  ),
);

export const updateNote = createAsyncThunk(
  "notes/updateNote",
  withApiError<{ id: string; updates: Partial<Note> }, Note>(
    "Notes.SaveError",
    async ({ id, updates }) => notesApi.update(id, updates),
  ),
);

export const deleteNote = createAsyncThunk(
  "notes/deleteNote",
  withApiError<string, string>("Notes.DeleteError", async (id, thunkApi) => {
    await notesApi.delete(id);
    thunkApi.dispatch(showSuccess(i18n.t("Notes.MovedToTrash")));
    return id;
  }),
);

export const restoreNote = createAsyncThunk(
  "notes/restoreNote",
  withApiError<string, Note>("Notes.RestoreError", async (id, thunkApi) => {
    const note = await notesApi.restore(id);
    thunkApi.dispatch(showSuccess(i18n.t("Notes.NoteRestored")));
    return note;
  }),
);

export const permanentDeleteNote = createAsyncThunk(
  "notes/permanentDeleteNote",
  withApiError<string, string>("Notes.DeleteError", async (id, thunkApi) => {
    await notesApi.permanentDelete(id);
    thunkApi.dispatch(showSuccess(i18n.t("Notes.PermanentlyDeleted")));
    return id;
  }),
);

export const searchNotes = createAsyncThunk(
  "notes/searchNotes",
  async (query: string) => await notesApi.searchList(query),
);

export const reorderNotes = createAsyncThunk(
  "notes/reorderNotes",
  withApiError<{ noteOrders: { id: string; order: number }[] }, { id: string; order: number }[]>(
    "Notes.SaveError",
    async (data) => {
      await notesApi.reorderNotes(data.noteOrders);
      return data.noteOrders;
    },
  ),
);

export const notesSlice = createSlice({
  name: "notes",
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<NotesFilter>>) => {
      state.filter = { ...state.filter, ...action.payload };
      state.isSearchActive = false;
    },
    resetFilter: (state) => {
      state.filter = initialFilter;
      state.isSearchActive = false;
    },
    setSortBy: (state, action: PayloadAction<NotesSortBy>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<NotesSortOrder>) => {
      state.sortOrder = action.payload;
    },
    setSort: (state, action: PayloadAction<{ sortBy: NotesSortBy; sortOrder: NotesSortOrder }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    setViewMode: (state, action: PayloadAction<NotesViewMode>) => {
      state.viewMode = action.payload;
    },
    clearSearch: (state) => {
      state.isSearchActive = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload.items;
        state.isSearchActive = false;
      })
      .addCase(loadNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to load notes";
      })
      .addCase(loadNoteDetail.fulfilled, (state, action) => {
        state.noteDetails[action.payload.id] = action.payload;
      })
      .addCase(createNote.pending, (state) => {
        state.isCreating = true;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.isCreating = false;
        state.notes.push(toListItem(action.payload));
        state.noteDetails[action.payload.id] = action.payload;
      })
      .addCase(createNote.rejected, (state) => {
        state.isCreating = false;
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.notes.findIndex((n) => n.id === updated.id);
        if (index !== -1) {
          state.notes[index] = toListItem(updated);
        }
        state.noteDetails[updated.id] = updated;
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        const note = state.notes.find((n) => n.id === action.payload);
        if (note) {
          note.isDeleted = true;
        }
        const detail = state.noteDetails[action.payload];
        if (detail) {
          detail.isDeleted = true;
        }
      })
      .addCase(restoreNote.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.notes.findIndex((n) => n.id === updated.id);
        if (index !== -1) {
          state.notes[index] = toListItem(updated);
        }
        state.noteDetails[updated.id] = updated;
      })
      .addCase(permanentDeleteNote.fulfilled, (state, action) => {
        state.notes = removeItemById(state.notes, action.payload);
        delete state.noteDetails[action.payload];
      })
      .addCase(searchNotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(searchNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notes = action.payload;
        state.isSearchActive = true;
      })
      .addCase(searchNotes.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(reorderNotes.fulfilled, (state, action) => {
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
  setSort,
  setViewMode,
  clearSearch,
  clearError,
} = notesSlice.actions;

// Selectors
export const selectAllNotes = (state: { notes: NotesState }) =>
  state.notes.notes;

export const selectNoteById = (state: { notes: NotesState }, id: string) =>
  state.notes.notes.find((n) => n.id === id) ?? null;

export const selectNoteDetail = (state: { notes: NotesState }, id: string) =>
  state.notes.noteDetails[id] ?? null;

// Notes are already filtered/sorted by the server — alias for clarity
export const selectFilteredNotes = selectAllNotes;

export const selectActiveNotesCount = createSelector(
  [selectAllNotes],
  (notes) => notes.filter((n) => !n.isDeleted).length
);

export const selectFavoritesCount = createSelector(
  [selectAllNotes],
  (notes) => notes.filter((n) => n.isPinned && !n.isDeleted).length
);

export const selectTrashCount = createSelector(
  [selectAllNotes],
  (notes) => notes.filter((n) => n.isDeleted).length
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
export const selectIsSearchActive = (state: { notes: NotesState }) =>
  state.notes.isSearchActive;
