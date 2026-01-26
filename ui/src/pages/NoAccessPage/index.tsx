import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks';
import styles from './NoAccessPage.module.css';

const NoAccessPage = () => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();

  return (
    <Box className={styles.container}>
      <Box className={styles.content}>
        <Typography variant="h4" component="h1" className={styles.title}>
          {t('NoAccess.Title', 'Access Denied')}
        </Typography>
        <Typography variant="body1" className={styles.message}>
          {t(
            'NoAccess.Message',
            "You don't have permission to access this application.",
          )}
        </Typography>
        {user?.email && (
          <Typography variant="body2" className={styles.userInfo}>
            {t('NoAccess.LoggedInAs', 'Logged in as')}: {user.email}
          </Typography>
        )}
        <Box className={styles.actions}>
          <Button variant="contained" color="primary" onClick={logout}>
            {t('NoAccess.TryDifferentAccount', 'Try a different account')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NoAccessPage;
