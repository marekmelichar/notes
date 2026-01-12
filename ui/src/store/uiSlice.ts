// ========================================================
// UI state slice - handles mobile navigation and UI state
// ========================================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MobileView = 'sidebar' | 'list' | 'editor';

interface UiState {
  mobileView: MobileView;
  isMobile: boolean;
  sidebarCollapsed: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const initialState: UiState = {
  mobileView: 'list',
  isMobile: window.innerWidth <= 768,
  sidebarCollapsed: localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
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
  },
});

export const { setMobileView, setIsMobile, setSidebarCollapsed, toggleSidebarCollapsed } = uiSlice.actions;
