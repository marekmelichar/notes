import React, { lazy, Suspense, useEffect } from 'react';
import { IconButton, styled } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { closeSnackbar, MaterialDesignContent, SnackbarProvider } from 'notistack';
import { ErrorBoundary, LoadingFallback, NotificationListener } from './components';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { SessionExpiredBanner } from './components/SessionExpiredBanner';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { ROUTE_HOME, ROUTE_NO_ACCESS, SNACKBARS_AUTOHIDE_DURATION } from './config';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import 'dayjs/locale/cs';
import './App.css';
import styles from './App.module.css';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import i18n from './i18n';
import dayjs from 'dayjs';
import { initializeAuth, useAppDispatch } from './store';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';

const MainLayout = lazy(() => import('./components/MainLayout'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const NoAccessPage = lazy(() => import('./pages/NoAccessPage'));

const snackbarVariantStyles = {
  '& .MuiSvgIcon-root': { marginRight: '0.5rem' },
};

const StyledSnackbar = styled(MaterialDesignContent)(({ theme }) => ({
  '&.notistack-MuiContent': {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    borderRadius: '0.5rem',
    boxShadow: 'none !important',
  },
  '&.notistack-MuiContent-success': {
    backgroundColor: theme.palette.success.dark,
    color: theme.palette.success.light,
    '& .MuiButtonBase-root': { color: theme.palette.success.light },
    ...snackbarVariantStyles,
  },
  '&.notistack-MuiContent-error': {
    backgroundColor: theme.palette.error.dark,
    color: theme.palette.error.light,
    '& .MuiButtonBase-root': { color: theme.palette.error.light },
    ...snackbarVariantStyles,
  },
  '&.notistack-MuiContent-info': {
    backgroundColor: theme.palette.info.dark,
    color: theme.palette.info.light,
    '& .MuiButtonBase-root': { color: theme.palette.info.light },
    ...snackbarVariantStyles,
  },
  '&.notistack-MuiContent-warning': {
    backgroundColor: theme.palette.warning.dark,
    color: theme.palette.warning.light,
    '& .MuiButtonBase-root': { color: theme.palette.warning.light },
    ...snackbarVariantStyles,
  },
}));

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTE_HOME,
        element: <MainLayout />,
        children: [
          { index: true, element: <NotesPage /> },
          { path: 'notes/:noteId', element: <NotesPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: ROUTE_NO_ACCESS,
    element: <NoAccessPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export const App = () => {
  const dispatch = useAppDispatch();

  const locale = i18n.language;
  if (locale) {
    dayjs.locale(locale);
  }

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'cs'}>
      <SnackbarProvider
        maxSnack={10}
        preventDuplicate
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        autoHideDuration={SNACKBARS_AUTOHIDE_DURATION}
        action={(snackbarId) => (
          <IconButton
            aria-label="close"
            size="small"
            disableRipple
            onClick={() => closeSnackbar(snackbarId)}
          >
            <CloseOutlinedIcon className={styles.snackbarCloseIcon} />
          </IconButton>
        )}
        iconVariant={{
          success: <CheckCircleOutlineOutlinedIcon />,
          error: <ErrorOutlineOutlinedIcon />,
          info: <InfoOutlinedIcon />,
          warning: <WarningAmberOutlinedIcon />,
        }}
        Components={{
          success: StyledSnackbar,
          error: StyledSnackbar,
          info: StyledSnackbar,
          warning: StyledSnackbar,
        }}
      >
        <NotificationListener />
        <PwaUpdatePrompt />
        <SessionExpiredBanner />
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </SnackbarProvider>
    </LocalizationProvider>
  );
};
