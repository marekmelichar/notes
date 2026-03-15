import { Box, Button, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import styles from './EditorErrorFallback.module.css';

export const EditorErrorFallback = () => {
  const { t } = useTranslation();

  return (
    <Box className={styles.container}>
      <ErrorOutlineIcon className={styles.icon} />
      <Typography variant="h6">{t('ErrorPage.Title')}</Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {t('ErrorPage.Message')}
      </Typography>
      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={() => window.location.reload()}
        data-testid="editor-error-reload-button"
      >
        {t('ErrorPage.ReloadPage')}
      </Button>
    </Box>
  );
};
