import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deviceStorage } from './storage';

export type Appearance = 'system' | 'light' | 'dark';
export type Consent = 'unasked' | 'granted' | 'denied';

interface PrefsState {
  appearance: Appearance;
  readAloud: boolean;
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
