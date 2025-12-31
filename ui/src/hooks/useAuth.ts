import { useAppDispatch, useAppSelector } from '@/store';
import { login, logout } from '@/store/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const token = useAppSelector((state) => state.auth.token);
  const user = useAppSelector((state) => state.auth.user);

  const handleLogin = () => {
    dispatch(login());
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return {
    isAuthenticated,
    isLoading,
    token,
    user,
    login: handleLogin,
    logout: handleLogout,
  };
};
