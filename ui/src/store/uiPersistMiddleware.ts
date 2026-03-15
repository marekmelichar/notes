import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import {
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setNoteListCollapsed,
  toggleNoteListCollapsed,
  setNoteListHidden,
  toggleNoteListHidden,
} from './uiSlice';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const NOTELIST_COLLAPSED_KEY = 'notelist-collapsed';
const NOTELIST_HIDDEN_KEY = 'notelist-hidden';

export const uiPersistMiddleware = createListenerMiddleware();

uiPersistMiddleware.startListening({
  matcher: isAnyOf(setSidebarCollapsed, toggleSidebarCollapsed),
  effect: (_action, api) => {
    const state = api.getState() as { ui: { sidebarCollapsed: boolean } };
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, state.ui.sidebarCollapsed.toString());
  },
});

uiPersistMiddleware.startListening({
  matcher: isAnyOf(setNoteListCollapsed, toggleNoteListCollapsed),
  effect: (_action, api) => {
    const state = api.getState() as { ui: { noteListCollapsed: boolean } };
    localStorage.setItem(NOTELIST_COLLAPSED_KEY, state.ui.noteListCollapsed.toString());
  },
});

uiPersistMiddleware.startListening({
  matcher: isAnyOf(setNoteListHidden, toggleNoteListHidden),
  effect: (_action, api) => {
    const state = api.getState() as { ui: { noteListHidden: boolean } };
    localStorage.setItem(NOTELIST_HIDDEN_KEY, state.ui.noteListHidden.toString());
  },
});
