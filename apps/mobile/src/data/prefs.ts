import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_VOICE_STYLE, type VoiceStyle } from '@mago/shared';
import { deviceStorage } from './storage';

export type Appearance = 'system' | 'light' | 'dark';
export type Consent = 'unasked' | 'granted' | 'denied';

interface PrefsState {
  appearance: Appearance;
  readAloud: boolean;
  /** Chosen read-aloud voice id; null = automatic (best female English voice). */
  voiceId: string | null;
  /** Soft & husky (default), Natural or Bright. */
  voiceStyle: VoiceStyle;
  voiceCommands: boolean;
  stepPhotos: boolean;
  savePhotosToLibrary: boolean;
  analyticsConsent: Consent;
  notificationsAsked: boolean;
  notifyRoutineReady: boolean;
  notifyPlanner: boolean;
  notifyWeeklyNudge: boolean;
  set: (patch: Partial<Omit<PrefsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = {
  appearance: 'system' as Appearance,
  readAloud: true,
  voiceId: null as string | null,
  voiceStyle: DEFAULT_VOICE_STYLE as VoiceStyle,
  voiceCommands: false,
  stepPhotos: false,
  savePhotosToLibrary: false,
  analyticsConsent: 'unasked' as Consent,
  notificationsAsked: false,
  notifyRoutineReady: true,
  notifyPlanner: true,
  notifyWeeklyNudge: true,
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: 'mago.prefs.v1', storage: deviceStorage },
  ),
);
