import { createJSONStorage } from 'zustand/middleware';
import { Storage } from 'expo-sqlite/kv-store';

/**
 * On-device storage for the library and settings (iOS/Android): SQLite-backed key-value store.
 * Nothing in here is sent to our server except via the explicit encrypted backup (D-02).
 */
export const deviceStorage = createJSONStorage(() => ({
  getItem: (k: string) => Storage.getItem(k),
  setItem: (k: string, v: string) => Storage.setItem(k, v),
  removeItem: (k: string) => Storage.removeItem(k),
}));
