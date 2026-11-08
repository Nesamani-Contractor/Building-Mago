import Constants from 'expo-constants';

/**
 * Demo vs live.
 * - demo: everything runs on the device with sample data and simulated services. No keys needed.
 * - live: talks to Supabase (Auth, Edge Functions). Requires EXPO_PUBLIC_SUPABASE_URL and
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY. AI keys NEVER live in the app — only in Supabase secrets.
 */
export type AppMode = 'demo' | 'live';

const extraMode = (Constants.expoConfig?.extra as { mode?: AppMode } | undefined)?.mode;
const envMode = process.env.EXPO_PUBLIC_MAGO_MODE as AppMode | undefined;

export const config = {
  mode: (envMode ?? extraMode ?? 'demo') as AppMode,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  termsUrl: 'https://mago.app/terms',
  privacyUrl: 'https://mago.app/privacy',
  referralBaseUrl: 'https://mago.app/r/',
};

export const isDemo = config.mode === 'demo' || !config.supabaseUrl;
