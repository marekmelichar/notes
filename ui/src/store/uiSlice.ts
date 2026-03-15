// ========================================================
// UI state slice - handles mobile navigation and UI state
// ========================================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MOBILE_BREAKPOINT } from '@/config';

export type MobileView = 'sidebar' | 'list' | 'editor';

interface UiState {
  mobileView: MobileView;
  isMobile: boolean;
  sidebarCollapsed: boolean;
  noteListCollapsed: boolean;
  noteListHidden: boolean;
  scrollHidden: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const NOTELIST_COLLAPSED_KEY = 'notelist-collapsed';
const NOTELIST_HIDDEN_KEY = 'notelist-hidden';

const initialState: UiState = {
  mobileView: 'list',
  isMobile: window.innerWidth <= MOBILE_BREAKPOINT,
  sidebarCollapsed: localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  noteListCollapsed: localStorage.getItem(NOTELIST_COLLAPSED_KEY) === 'true',
  noteListHidden: localStorage.getItem(NOTELIST_HIDDEN_KEY) === 'true',
  scrollHidden: false,
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
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setNoteListCollapsed: (state, action: PayloadAction<boolean>) => {
      state.noteListCollapsed = action.payload;
    },
    toggleNoteListCollapsed: (state) => {
      state.noteListCollapsed = !state.noteListCollapsed;
    },
    setNoteListHidden: (state, action: PayloadAction<boolean>) => {
      state.noteListHidden = action.payload;
    },
    toggleNoteListHidden: (state) => {
      state.noteListHidden = !state.noteListHidden;
    },
    setScrollHidden: (state, action: PayloadAction<boolean>) => {
      state.scrollHidden = action.payload;
    },
  },
});

export const { setMobileView, setIsMobile, setSidebarCollapsed, toggleSidebarCollapsed, setNoteListCollapsed, toggleNoteListCollapsed, setNoteListHidden, toggleNoteListHidden, setScrollHidden } = uiSlice.actions;

// Selectors
export const selectIsMobile = (state: { ui: UiState }) => state.ui.isMobile;
export const selectMobileView = (state: { ui: UiState }) => state.ui.mobileView;
export const selectSidebarCollapsed = (state: { ui: UiState }) => state.ui.sidebarCollapsed;
export const selectNoteListCollapsed = (state: { ui: UiState }) => state.ui.noteListCollapsed;
export const selectNoteListHidden = (state: { ui: UiState }) => state.ui.noteListHidden;
export const selectScrollHidden = (state: { ui: UiState }) => state.ui.scrollHidden;
