import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks';
import styles from './index.module.css';

const HomePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <Box className={styles.container}>
      <Typography variant="h4" gutterBottom>
        {t('Common.Welcome')}, {user?.firstName || 'User'}!
      </Typography>
      <Paper className={styles.paper}>
        <Typography variant="body1">
          {t('HomePage.Description')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default HomePage;
