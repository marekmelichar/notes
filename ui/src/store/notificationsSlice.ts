import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';

export type NotificationVariant = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  variant: NotificationVariant;
}

interface NotificationsState {
  notifications: Notification[];
}

const initialState: NotificationsState = {
  notifications: [],
};

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: {
      reducer: (state, action: PayloadAction<Notification>) => {
        state.notifications.push(action.payload);
      },
      prepare: (message: string, variant: NotificationVariant = 'info') => ({
        payload: {
          id: nanoid(),
          message,
          variant,
        },
      }),
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const { addNotification, removeNotification, clearNotifications } =
  notificationsSlice.actions;

// Convenience action creators
export const showSuccess = (message: string) =>
  addNotification(message, 'success');
export const showError = (message: string) => addNotification(message, 'error');
export const showInfo = (message: string) => addNotification(message, 'info');
export const showWarning = (message: string) =>
  addNotification(message, 'warning');

// Selectors
export const selectNotifications = (state: { notifications: NotificationsState }) =>
  state.notifications.notifications;
