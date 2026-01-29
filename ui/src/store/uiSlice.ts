// ========================================================
// UI state slice - handles mobile navigation and UI state
// ========================================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MobileView = 'sidebar' | 'list' | 'editor';

interface UiState {
  mobileView: MobileView;
  isMobile: boolean;
  sidebarCollapsed: boolean;
  noteListCollapsed: boolean;
  noteListHidden: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const NOTELIST_COLLAPSED_KEY = 'notelist-collapsed';
const NOTELIST_HIDDEN_KEY = 'notelist-hidden';

const initialState: UiState = {
  mobileView: 'list',
  isMobile: window.innerWidth <= 768,
  sidebarCollapsed: localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  noteListCollapsed: localStorage.getItem(NOTELIST_COLLAPSED_KEY) === 'true',
  noteListHidden: localStorage.getItem(NOTELIST_HIDDEN_KEY) === 'true',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMobileView: (state, action: PayloadAction<MobileView>) => {
      state.mobileView = action.payload;
    },
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, action.payload.toString());
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, state.sidebarCollapsed.toString());
    },
    setNoteListCollapsed: (state, action: PayloadAction<boolean>) => {
      state.noteListCollapsed = action.payload;
      localStorage.setItem(NOTELIST_COLLAPSED_KEY, action.payload.toString());
    },
    toggleNoteListCollapsed: (state) => {
      state.noteListCollapsed = !state.noteListCollapsed;
      localStorage.setItem(NOTELIST_COLLAPSED_KEY, state.noteListCollapsed.toString());
    },
    setNoteListHidden: (state, action: PayloadAction<boolean>) => {
      state.noteListHidden = action.payload;
      localStorage.setItem(NOTELIST_HIDDEN_KEY, action.payload.toString());
    },
    toggleNoteListHidden: (state) => {
      state.noteListHidden = !state.noteListHidden;
      localStorage.setItem(NOTELIST_HIDDEN_KEY, state.noteListHidden.toString());
    },
  },
});

export const { setMobileView, setIsMobile, setSidebarCollapsed, toggleSidebarCollapsed, setNoteListCollapsed, toggleNoteListCollapsed, setNoteListHidden, toggleNoteListHidden } = uiSlice.actions;
