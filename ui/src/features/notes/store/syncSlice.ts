import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { syncQueueDb } from '../services/notesDb';
import type { SyncState } from '../types';

const initialState: SyncState = {
  isSyncing: false,
  lastSyncedAt: null,
  pendingChanges: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  error: null,
};

// Async thunks
export const checkPendingChanges = createAsyncThunk('sync/checkPendingChanges', async () => {
  return await syncQueueDb.count();
});

export const syncWithServer = createAsyncThunk('sync/syncWithServer', async (_, { dispatch }) => {
  const pendingItems = await syncQueueDb.getAll();

  // TODO: Implement actual API sync when backend is ready
  // For now, just clear the queue (simulating successful sync)
  for (const item of pendingItems) {
    // await api.sync(item);
    await syncQueueDb.remove(item.id);
  }

  dispatch(checkPendingChanges());
  return Date.now();
});

export const clearSyncQueue = createAsyncThunk('sync/clearSyncQueue', async () => {
  await syncQueueDb.clear();
  return 0;
});

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    clearSyncError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check pending changes
      .addCase(checkPendingChanges.fulfilled, (state, action) => {
        state.pendingChanges = action.payload;
      })
      // Sync with server
      .addCase(syncWithServer.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
      })
      .addCase(syncWithServer.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.lastSyncedAt = action.payload;
        state.pendingChanges = 0;
      })
      .addCase(syncWithServer.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.error.message || 'Sync failed';
      })
      // Clear sync queue
      .addCase(clearSyncQueue.fulfilled, (state) => {
        state.pendingChanges = 0;
      });
  },
});

export const { setOnlineStatus, clearSyncError } = syncSlice.actions;

// Selectors
export const selectSyncState = (state: { sync: SyncState }) => state.sync;
export const selectIsSyncing = (state: { sync: SyncState }) => state.sync.isSyncing;
export const selectLastSyncedAt = (state: { sync: SyncState }) => state.sync.lastSyncedAt;
export const selectPendingChanges = (state: { sync: SyncState }) => state.sync.pendingChanges;
export const selectIsOnline = (state: { sync: SyncState }) => state.sync.isOnline;
export const selectSyncError = (state: { sync: SyncState }) => state.sync.error;
