import { Alert, Button, Snackbar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, selectSessionExpired, setSessionExpired } from '@/store/authSlice';

export const SessionExpiredBanner = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const isExpired = useAppSelector(selectSessionExpired);

  const handleLogin = () => {
    dispatch(setSessionExpired(false));
    dispatch(logout());
  };

  return (
    <Snackbar
      open={isExpired}
      anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
      data-testid="session-expired-banner"
    >
      <Alert
        severity="warning"
        variant="filled"
        action={
          <Button color="inherit" size="small" onClick={handleLogin} data-testid="session-expired-login-button">
            {t('Common.Login')}
          </Button>
        }
      >
        {t('Common.SessionExpired')}
      </Alert>
    </Snackbar>
  );
};
