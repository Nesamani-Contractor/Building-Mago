import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deviceStorage } from './storage';
import { uid } from '@/lib/id';

export type Goal = 'everyday' | 'learn' | 'events' | 'glowup';
export type SourceApp = 'tiktok' | 'instagram' | 'youtube' | 'pinterest' | 'other';
export type Skill = 'beginner' | 'comfortable' | 'pro';

export interface ProfileState {
  onboarded: boolean;
  ageConfirmed: boolean;
  /** Anonymous account id (created silently, D-01). */
  userId: string;
  name: string | null;
  goal: Goal | null;
  sources: SourceApp[];
  skill: Skill | null;
  weeklyGoal: number;
  linkedProvider: 'apple' | 'google' | null;
  referralCode: string;
  country: 'US' | 'UK' | 'other';
  createdAt: string;
  set: (patch: Partial<Omit<ProfileState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

function fresh() {
  return {
    onboarded: false,
    ageConfirmed: false,
    userId: uid('anon'),
    name: null,
    goal: null,
    sources: [] as SourceApp[],
    skill: null,
    weeklyGoal: 3,
    linkedProvider: null,
    referralCode: uid('').slice(-6).toUpperCase(),
    country: 'US' as const,
    createdAt: new Date().toISOString(),
  };
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      ...fresh(),
      set: (patch) => set(patch),
      reset: () => set(fresh()),
    }),
    { name: 'mago.profile.v1', storage: deviceStorage },
  ),
);

/** What each onboarding answer changes (SCREENS.md "What each answer changes"). */
export function showHintsByDefault(skill: Skill | null): boolean {
  return skill !== 'pro';
}
