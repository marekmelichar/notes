import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Box, CircularProgress } from '@mui/material';
import { ROUTE_NO_ACCESS } from '@/config';
import styles from './index.module.css';

export const ProtectedRoute = () => {
  const { isLoading, accessStatus } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <Box className={styles.loadingContainer}>
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to no-access page if user lacks permission (403)
  if (accessStatus === 'unauthorized') {
    return <Navigate to={`/${ROUTE_NO_ACCESS}`} replace />;
  }

  // If not authenticated, keycloak.login() will be called from initKeycloak
  // We don't navigate away, we let Keycloak handle the redirect

  return <Outlet />;
};

export default ProtectedRoute;
