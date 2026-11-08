import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { config, isDemo } from './config';

/** Session tokens live in the iOS Keychain / Android Keystore via expo-secure-store. */
const secureStorage = {
  getItem: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  setItem: (k: string, v: string) =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v),
  removeItem: (k: string) =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k),
};

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (isDemo) throw new Error('Supabase is not used in demo mode');
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { storage: secureStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }
  return client;
}

/** D-01: silent anonymous account on first launch (live mode). */
export async function ensureAnonymousSession(): Promise<string | null> {
  if (isDemo) return null;
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return signed.user?.id ?? null;
}

/** Call an Edge Function with the user's session. Errors carry a human message for the UI. */
export async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase().functions.invoke<T>(name, { body: body as Record<string, unknown> });
  if (error) throw new Error(error.message);
  return data as T;
}
