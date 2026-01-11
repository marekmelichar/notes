import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import styles from './index.module.css';

const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Box className={styles.container}>
      <Typography variant="h4" gutterBottom>
        {t('Common.Nav.Settings')}
      </Typography>
      <Paper className={styles.paper}>
        <Typography variant="body1">
          {t('SettingsPage.Description')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
