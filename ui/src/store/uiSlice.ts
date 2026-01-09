// ========================================================
// UI state slice - handles mobile navigation and UI state
// ========================================================

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type MobileView = 'sidebar' | 'list' | 'editor';

interface UiState {
  mobileView: MobileView;
  isMobile: boolean;
}

const initialState: UiState = {
  mobileView: 'list',
  isMobile: window.innerWidth <= 768,
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
  },
});

export const { setMobileView, setIsMobile } = uiSlice.actions;
