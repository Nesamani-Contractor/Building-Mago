import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Online/offline signal. Web: navigator.onLine events. Native: optimistic `true` in demo mode
 * (production adds expo-network; listed in BUILD_PLAN Phase 3).
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function isOnlineNow(): boolean {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') return navigator.onLine !== false;
  return true;
}
