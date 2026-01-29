// ========================================================
// Tabs state slice - manages open editor tabs
// ========================================================

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createNote,
  deleteNote,
  permanentDeleteNote,
} from "@/features/notes/store/notesSlice";

const TABS_STORAGE_KEY = "editor-open-tabs";
const ACTIVE_TAB_STORAGE_KEY = "editor-active-tab";
const MAX_TABS = 20;

interface TabInfo {
  id: string;
  hasUnsavedChanges: boolean;
}

interface TabsState {
  openTabs: TabInfo[];
  activeTabId: string | null;
}

function loadTabsFromStorage(): { tabIds: string[]; activeTabId: string | null } {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    const tabIds = raw ? JSON.parse(raw) : [];
    const activeTabId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || null;
    return { tabIds: Array.isArray(tabIds) ? tabIds : [], activeTabId };
  } catch {
    return { tabIds: [], activeTabId: null };
  }
}

function saveTabsToStorage(tabs: TabInfo[], activeTabId: string | null) {
  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs.map((t) => t.id)));
  if (activeTabId) {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
  } else {
    localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
  }
}

const stored = loadTabsFromStorage();
const initialState: TabsState = {
  openTabs: stored.tabIds.map((id) => ({ id, hasUnsavedChanges: false })),
  activeTabId: stored.activeTabId,
};

export const tabsSlice = createSlice({
  name: "tabs",
  initialState,
  reducers: {
    openTab: (state, action: PayloadAction<string>) => {
      const noteId = action.payload;
      const existing = state.openTabs.find((t) => t.id === noteId);
      if (!existing) {
        if (state.openTabs.length >= MAX_TABS) {
          // Remove the oldest tab that isn't active and has no unsaved changes
          const removableIndex = state.openTabs.findIndex(
            (t) => t.id !== state.activeTabId && !t.hasUnsavedChanges
          );
          if (removableIndex !== -1) {
            state.openTabs.splice(removableIndex, 1);
          }
        }
        state.openTabs.push({ id: noteId, hasUnsavedChanges: false });
      }
      state.activeTabId = noteId;
      saveTabsToStorage(state.openTabs, state.activeTabId);
    },
    closeTab: (state, action: PayloadAction<string>) => {
      const noteId = action.payload;
      const index = state.openTabs.findIndex((t) => t.id === noteId);
      if (index === -1) return;

      state.openTabs.splice(index, 1);

      // If closing the active tab, activate the nearest remaining tab
      if (state.activeTabId === noteId) {
        if (state.openTabs.length === 0) {
          state.activeTabId = null;
        } else {
          // Prefer the tab to the right, then to the left
          const newIndex = Math.min(index, state.openTabs.length - 1);
          state.activeTabId = state.openTabs[newIndex].id;
        }
      }
      saveTabsToStorage(state.openTabs, state.activeTabId);
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      const noteId = action.payload;
      if (state.openTabs.some((t) => t.id === noteId)) {
        state.activeTabId = noteId;
        saveTabsToStorage(state.openTabs, state.activeTabId);
      }
    },
    reorderTabs: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      const { fromIndex, toIndex } = action.payload;
      if (
        fromIndex < 0 ||
        fromIndex >= state.openTabs.length ||
        toIndex < 0 ||
        toIndex >= state.openTabs.length
      ) {
        return;
      }
      const [moved] = state.openTabs.splice(fromIndex, 1);
      state.openTabs.splice(toIndex, 0, moved);
      saveTabsToStorage(state.openTabs, state.activeTabId);
    },
    setTabUnsaved: (
      state,
      action: PayloadAction<{ id: string; hasUnsavedChanges: boolean }>
    ) => {
      const tab = state.openTabs.find((t) => t.id === action.payload.id);
      if (tab) {
        tab.hasUnsavedChanges = action.payload.hasUnsavedChanges;
      }
    },
    closeOtherTabs: (state, action: PayloadAction<string>) => {
      const keepId = action.payload;
      state.openTabs = state.openTabs.filter((t) => t.id === keepId);
      state.activeTabId = keepId;
      saveTabsToStorage(state.openTabs, state.activeTabId);
    },
    closeAllTabs: (state) => {
      state.openTabs = [];
      state.activeTabId = null;
      saveTabsToStorage(state.openTabs, state.activeTabId);
    },
  },
  extraReducers: (builder) => {
    builder
      // Auto-open new notes in a tab
      .addCase(createNote.fulfilled, (state, action) => {
        const noteId = action.payload.id;
        const existing = state.openTabs.find((t) => t.id === noteId);
        if (!existing) {
          state.openTabs.push({ id: noteId, hasUnsavedChanges: false });
        }
        state.activeTabId = noteId;
        saveTabsToStorage(state.openTabs, state.activeTabId);
      })
      // Auto-close deleted notes
      .addCase(deleteNote.fulfilled, (state, action) => {
        const noteId = action.payload;
        const index = state.openTabs.findIndex((t) => t.id === noteId);
        if (index !== -1) {
          state.openTabs.splice(index, 1);
          if (state.activeTabId === noteId) {
            if (state.openTabs.length === 0) {
              state.activeTabId = null;
            } else {
              const newIndex = Math.min(index, state.openTabs.length - 1);
              state.activeTabId = state.openTabs[newIndex].id;
            }
          }
          saveTabsToStorage(state.openTabs, state.activeTabId);
        }
      })
      // Auto-close permanently deleted notes
      .addCase(permanentDeleteNote.fulfilled, (state, action) => {
        const noteId = action.payload;
        const index = state.openTabs.findIndex((t) => t.id === noteId);
        if (index !== -1) {
          state.openTabs.splice(index, 1);
          if (state.activeTabId === noteId) {
            if (state.openTabs.length === 0) {
              state.activeTabId = null;
            } else {
              const newIndex = Math.min(index, state.openTabs.length - 1);
              state.activeTabId = state.openTabs[newIndex].id;
            }
          }
          saveTabsToStorage(state.openTabs, state.activeTabId);
        }
      });
  },
});

export const {
  openTab,
  closeTab,
  setActiveTab,
  reorderTabs,
  setTabUnsaved,
  closeOtherTabs,
  closeAllTabs,
} = tabsSlice.actions;

// Selectors
export const selectOpenTabs = (state: { tabs: TabsState }) =>
  state.tabs.openTabs;
export const selectActiveTabId = (state: { tabs: TabsState }) =>
  state.tabs.activeTabId;
export const selectTabById = (id: string) => (state: { tabs: TabsState }) =>
  state.tabs.openTabs.find((t) => t.id === id);
