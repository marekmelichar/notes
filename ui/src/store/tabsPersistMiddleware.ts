import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import {
  openTab,
  closeTab,
  setActiveTab,
  reorderTabs,
  closeOtherTabs,
  closeAllTabs,
} from './tabsSlice';
import {
  createNote,
  deleteNote,
  permanentDeleteNote,
} from '@/features/notes/store/notesSlice';

const TABS_STORAGE_KEY = 'editor-open-tabs';
const ACTIVE_TAB_STORAGE_KEY = 'editor-active-tab';

interface TabInfo {
  id: string;
  hasUnsavedChanges: boolean;
}

function saveTabsToStorage(openTabs: TabInfo[], activeTabId: string | null) {
  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(openTabs.map((t) => t.id)));
  if (activeTabId) {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
  } else {
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
  }
}

export const tabsPersistMiddleware = createListenerMiddleware();

tabsPersistMiddleware.startListening({
  matcher: isAnyOf(
    openTab,
    closeTab,
    setActiveTab,
    reorderTabs,
    closeOtherTabs,
    closeAllTabs,
    createNote.fulfilled,
    deleteNote.fulfilled,
    permanentDeleteNote.fulfilled,
  ),
  effect: (_action, api) => {
    const state = api.getState() as { tabs: { openTabs: TabInfo[]; activeTabId: string | null } };
    saveTabsToStorage(state.tabs.openTabs, state.tabs.activeTabId);
  },
});
