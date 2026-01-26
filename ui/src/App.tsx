import React, { lazy, Suspense, useEffect } from 'react';
import { IconButton, styled } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { closeSnackbar, MaterialDesignContent, SnackbarProvider } from 'notistack';
import { ErrorBoundary, LoadingFallback, NotificationListener } from './components';
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
const HomePage = lazy(() => import('./pages/HomePage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const NoAccessPage = lazy(() => import('./pages/NoAccessPage'));

const StyledSnackbar = styled(MaterialDesignContent)(() => ({
  '&.notistack-MuiContent': {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    borderRadius: '0.5rem',
    boxShadow: 'none !important',
  },
  '&.notistack-MuiContent-success': {
    backgroundColor: '#2A4631',
    color: '#94D1A5',
    '& .MuiButtonBase-root': { color: '#94D1A5' },
    '& .MuiSvgIcon-root': { marginRight: '0.5rem' },
  },
  '&.notistack-MuiContent-error': {
    backgroundColor: '#462D2D',
    color: '#FF5977',
    '& .MuiButtonBase-root': { color: '#FF5977' },
    '& .MuiSvgIcon-root': { marginRight: '0.5rem' },
  },
  '&.notistack-MuiContent-info': {
    backgroundColor: '#1C4586',
    color: '#C9DAF8',
    '& .MuiButtonBase-root': { color: '#C9DAF8' },
    '& .MuiSvgIcon-root': { marginRight: '0.5rem' },
  },
  '&.notistack-MuiContent-warning': {
    backgroundColor: '#654D01',
    color: '#FFD966',
    '& .MuiButtonBase-root': { color: '#FFD966' },
    '& .MuiSvgIcon-root': { marginRight: '0.5rem' },
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
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>
        </ErrorBoundary>
      </SnackbarProvider>
    </LocalizationProvider>
  );
};
