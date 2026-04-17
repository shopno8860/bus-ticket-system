import { useSyncExternalStore } from 'react';
import { getAuthState, subscribe } from '../../../store/authStore';

export function useAuth() {
  return useSyncExternalStore(subscribe, getAuthState, getAuthState);
}
