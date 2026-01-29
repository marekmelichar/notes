// ========================================================
// Redux store configuration
// ========================================================

import { useDispatch, TypedUseSelectorHook, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './authSlice';
import { uiSlice } from './uiSlice';
import { notificationsSlice } from './notificationsSlice';
import { tabsSlice } from './tabsSlice';
import { notesSlice } from '@/features/notes/store/notesSlice';
import { foldersSlice } from '@/features/notes/store/foldersSlice';
import { tagsSlice } from '@/features/notes/store/tagsSlice';
import { syncSlice } from '@/features/notes/store/syncSlice';

// Export slices
export * from './authSlice';
export * from './uiSlice';
export * from './notificationsSlice';
export * from './tabsSlice';

/**
 * Application wide data storage
 */
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
    notifications: notificationsSlice.reducer,
    tabs: tabsSlice.reducer,
    notes: notesSlice.reducer,
    folders: foldersSlice.reducer,
    tags: tagsSlice.reducer,
    sync: syncSlice.reducer,
  },
});

/**
 * Data types
 */
type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

// Correctly typed React hooks
// Use these instead of the original ones from react-redux library!
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
