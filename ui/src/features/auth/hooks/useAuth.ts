import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { login, logout } from '@/store/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, token, user, error, accessStatus } =
    useAppSelector((state) => state.auth);

  const handleLogin = useCallback(() => {
    dispatch(login());
  }, [dispatch]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  return {
    isAuthenticated,
    isLoading,
    token,
    user,
    error,
    accessStatus,
    isUnauthorized: accessStatus === 'unauthorized',
    login: handleLogin,
    logout: handleLogout,
  };
};
