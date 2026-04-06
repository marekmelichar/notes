import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button, Snackbar, SnackbarContent } from '@mui/material';
import { useTranslation } from 'react-i18next';

export const PwaUpdatePrompt = () => {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  return (
    <Snackbar open={needRefresh} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <SnackbarContent
        message={t('Common.Pwa.UpdateAvailable')}
        action={
          <>
            <Button color="primary" size="small" onClick={handleUpdate}>
              {t('Common.Pwa.Update')}
            </Button>
            <Button color="inherit" size="small" onClick={handleClose}>
              {t('Common.Pwa.Dismiss')}
            </Button>
          </>
        }
      />
    </Snackbar>
  );
};
