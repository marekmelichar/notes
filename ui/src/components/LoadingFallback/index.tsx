import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Loading fallback component used as Suspense fallback for lazy-loaded routes.
 * Provides a consistent loading experience across the application.
 */
export const LoadingFallback = ({ message, fullScreen = true }: LoadingFallbackProps) => {
  const { t } = useTranslation();

  return (
    <Box
      className={fullScreen ? styles.containerFullScreen : styles.container}
      data-testid="loading-fallback"
    >
      <Box className={styles.content}>
        <CircularProgress size={48} className={styles.spinner} data-testid="loading-spinner" />
        <Typography variant="body1" color="text.secondary" className={styles.message}>
          {message ?? t('Common.Loading')}
        </Typography>
      </Box>
    </Box>
  );
};

export default LoadingFallback;
