import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks';

const HomePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('Common.Welcome')}, {user?.firstName || 'User'}!
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          {t('HomePage.Description')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default HomePage;
