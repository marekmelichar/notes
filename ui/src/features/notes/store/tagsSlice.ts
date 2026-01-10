import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tagsApi } from '../services/notesApi';
import { showSuccess, showError } from '@/store/notificationsSlice';
import type { Tag, TagsState } from '../types';

const initialState: TagsState = {
  tags: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const loadTags = createAsyncThunk('tags/loadTags', async () => {
  return await tagsApi.getAll();
});

export const createTag = createAsyncThunk(
  'tags/createTag',
  async (data: { name: string; color?: string }, { dispatch }) => {
    try {
      const tagData = {
        name: data.name,
        color: data.color || '#6366f1',
      };
      // Use the server-generated ID
      const id = await tagsApi.create(tagData);
      dispatch(showSuccess('Tag created'));
      return { ...tagData, id } as Tag;
    } catch (error) {
      dispatch(showError('Failed to create tag'));
      throw error;
    }
  },
);

export const updateTag = createAsyncThunk(
  'tags/updateTag',
  async ({ id, updates }: { id: string; updates: Partial<Tag> }, { dispatch }) => {
    try {
      await tagsApi.update(id, updates);
      const tag = await tagsApi.getById(id);
      dispatch(showSuccess('Tag updated'));
      return tag;
    } catch (error) {
      dispatch(showError('Failed to update tag'));
      throw error;
    }
  },
);

export const deleteTag = createAsyncThunk(
  'tags/deleteTag',
  async (id: string, { dispatch }) => {
    try {
      await tagsApi.delete(id);
      dispatch(showSuccess('Tag deleted'));
      return id;
    } catch (error) {
      dispatch(showError('Failed to delete tag'));
      throw error;
    }
  },
);

export const tagsSlice = createSlice({
  name: 'tags',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load tags
      .addCase(loadTags.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadTags.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tags = action.payload;
      })
      .addCase(loadTags.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load tags';
      })
      // Create tag
      .addCase(createTag.fulfilled, (state, action) => {
        state.tags.push(action.payload);
      })
      // Update tag
      .addCase(updateTag.fulfilled, (state, action) => {
        if (action.payload) {
          const index = state.tags.findIndex((t) => t.id === action.payload!.id);
          if (index !== -1) {
            state.tags[index] = action.payload;
          }
        }
      })
      // Delete tag
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.tags = state.tags.filter((t) => t.id !== action.payload);
      });
  },
});

export const { clearError } = tagsSlice.actions;

// Selectors
export const selectAllTags = (state: { tags: TagsState }) => state.tags.tags;

export const selectTagById = (id: string) => (state: { tags: TagsState }) =>
  state.tags.tags.find((t) => t.id === id);

export const selectTagsByIds = (ids: string[]) => (state: { tags: TagsState }) =>
  state.tags.tags.filter((t) => ids.includes(t.id));

export const selectTagsLoading = (state: { tags: TagsState }) => state.tags.isLoading;
export const selectTagsError = (state: { tags: TagsState }) => state.tags.error;
