// Temporary test helper - import this in App.tsx to trigger 403
import { store } from '@/store';
import { setAccessStatus } from '@/store/authSlice';

export const triggerNoAccess = () => {
  store.dispatch(setAccessStatus('unauthorized'));
};

// Call this after login to test
(window as any).testNoAccess = triggerNoAccess;
