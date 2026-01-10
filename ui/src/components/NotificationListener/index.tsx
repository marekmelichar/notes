import { useEffect, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectNotifications,
  removeNotification,
} from '@/store/notificationsSlice';

/**
 * Component that listens to Redux notification state and displays snackbars.
 * This bridges Redux actions with notistack's snackbar system.
 */
export const NotificationListener = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);
  const { enqueueSnackbar } = useSnackbar();
  const displayedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    notifications.forEach((notification) => {
      // Skip if already displayed
      if (displayedIds.current.has(notification.id)) {
        return;
      }

      // Display the snackbar
      enqueueSnackbar(notification.message, {
        variant: notification.variant,
        key: notification.id,
      });

      // Mark as displayed
      displayedIds.current.add(notification.id);

      // Remove from Redux state
      dispatch(removeNotification(notification.id));
    });
  }, [notifications, enqueueSnackbar, dispatch]);

  return null;
};
