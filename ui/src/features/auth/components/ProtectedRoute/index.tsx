import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { Box, CircularProgress } from '@mui/material';
import styles from './index.module.css';

export const ProtectedRoute = () => {
  const { isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <Box className={styles.loadingContainer}>
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, keycloak.login() will be called from initKeycloak
  // We don't navigate away, we let Keycloak handle the redirect

  return <Outlet />;
};

export default ProtectedRoute;
