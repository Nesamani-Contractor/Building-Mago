import { Platform, Share } from 'react-native';
import { useLibrary } from '@/data/library';
import { useSessions } from '@/data/sessions';
import { useProfile } from '@/data/profile';
import { usePrefs } from '@/data/prefs';
import { useAccount } from '@/data/account';
import { useBag } from '@/data/bag';
import { track } from './analytics';
import { isDemo } from './config';
import { callFunction } from './supabase';

/** Link Apple/Google to the anonymous account (same user id, same entitlements — FR-ONB-03). */
export async function linkAccount(provider: 'apple' | 'google'): Promise<void> {
  // Live: expo-apple-authentication / Google ID token → supabase.auth.linkIdentity (Phase 2 full build).
  await new Promise((r) => setTimeout(r, 600));
  useProfile.getState().set({ linkedProvider: provider });
  track('account_linked', { provider });
}

/** D-02 encrypted backup: routines, collections, plans. Never photos, notes or transcripts. */
export async function backupNow(): Promise<{ ok: boolean; message: string }> {
  if (!useProfile.getState().linkedProvider) return { ok: false, message: 'Link Apple or Google first so your backup has a home.' };
  const lib = useLibrary.getState();
  const payload = {
    v: 1,
    routines: Object.values(lib.items).map(({ routine, favorite, pinned, collectionIds, doneCount, lastDoneAt, savedAt }) => ({
      routine,
      favorite,
      pinned,
      collectionIds,
      doneCount,
      lastDoneAt,
      savedAt,
    })),
    collections: lib.collections,
    plans: useSessions.getState().plans,
  };
  if (!isDemo) await callFunction('backup', { action: 'put', payload });
  else await new Promise((r) => setTimeout(r, 800));
  const at = new Date().toISOString();
  useAccount.getState().set({ lastBackupAt: at });
  track('backup_completed', { routines: payload.routines.length });
  return { ok: true, message: `Backed up ${payload.routines.length} looks.` };
}

/** Export everything on this device as JSON (photos are exported separately as a zip in the full build). */
export async function exportMyData(): Promise<void> {
  const data = {
    exportedAt: new Date().toISOString(),
    profile: { ...useProfile.getState(), set: undefined, reset: undefined },
    library: useLibrary.getState().items,
    collections: useLibrary.getState().collections,
    sessions: Object.values(useSessions.getState().sessions).map((s) => ({ ...s, beforePhoto: undefined, afterPhoto: undefined })),
    plans: useSessions.getState().plans,
    makeupBag: useBag.getState().items.map((i) => ({ ...i, photoUri: undefined })),
  };
  const json = JSON.stringify(data, null, 2);
  track('export_completed', {});
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mago-export.json';
      a.click();
    } catch {
      // ignore — preview environment may block downloads
    }
    return;
  }
  await Share.share({ title: 'My Mago data', message: json });
}

/** Delete account: server data (live) + everything on this device. */
export async function deleteEverything(): Promise<void> {
  if (!isDemo) await callFunction('delete-account', {});
  track('account_deleted', {});
  useLibrary.getState().reset();
  useSessions.getState().reset();
  useAccount.getState().reset();
  useBag.getState().reset();
  usePrefs.getState().reset();
  useProfile.getState().reset();
}
