import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Occasion } from '@mago/shared';
import { deviceStorage } from './storage';
import { uid } from '@/lib/id';

/** A Follow-Along session. Resumable for 7 days (PRD). Photos are on-device file URIs only. */
export interface Session {
  id: string;
  routineId: string;
  startedAt: string;
  updatedAt: string;
  stepIndex: number;
  completedAt?: string;
  abandoned?: boolean;
  beforePhoto?: string;
  afterPhoto?: string;
  rating?: number;
  note?: string;
}

export interface Plan {
  id: string;
  routineId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, optional */
  time?: string;
  occasion: Occasion;
  repeatWeekdays: boolean;
  createdAt: string;
}

export const RESUME_DAYS = 7;

interface SessionsState {
  sessions: Record<string, Session>;
  plans: Plan[];
  frozenWeeks: string[];
  start: (routineId: string) => string;
  patch: (id: string, patch: Partial<Session>) => void;
  addPlan: (p: Omit<Plan, 'id' | 'createdAt'>) => void;
  removePlan: (id: string) => void;
  applyFreeze: (weekKey: string) => void;
  reset: () => void;
}

export const useSessions = create<SessionsState>()(
  persist(
    (set) => ({
      sessions: {},
      plans: [],
      frozenWeeks: [],
      start: (routineId) => {
        const id = uid('ses');
        const now = new Date().toISOString();
        set((s) => ({ sessions: { ...s.sessions, [id]: { id, routineId, startedAt: now, updatedAt: now, stepIndex: 0 } } }));
        return id;
      },
      patch: (id, patch) =>
        set((s) => {
          const cur = s.sessions[id];
          return cur
            ? { sessions: { ...s.sessions, [id]: { ...cur, ...patch, updatedAt: new Date().toISOString() } } }
            : s;
        }),
      addPlan: (p) => set((s) => ({ plans: [...s.plans, { ...p, id: uid('plan'), createdAt: new Date().toISOString() }] })),
      removePlan: (id) => set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),
      applyFreeze: (weekKey) => set((s) => ({ frozenWeeks: [...s.frozenWeeks, weekKey] })),
      reset: () => set({ sessions: {}, plans: [], frozenWeeks: [] }),
    }),
    { name: 'mago.sessions.v1', storage: deviceStorage },
  ),
);

export function resumableSession(sessions: Record<string, Session>, now = new Date()): Session | undefined {
  const cutoff = now.getTime() - RESUME_DAYS * 86400000;
  return Object.values(sessions)
    .filter((s) => !s.completedAt && !s.abandoned && s.stepIndex > 0 && new Date(s.updatedAt).getTime() > cutoff)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function completionDates(sessions: Record<string, Session>): Date[] {
  return Object.values(sessions)
    .filter((s) => s.completedAt)
    .map((s) => new Date(s.completedAt as string));
}

/** Plans that fall on a given day (including weekday repeats). */
export function plansOn(plans: Plan[], day: Date): Plan[] {
  const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const weekday = day.getDay() >= 1 && day.getDay() <= 5;
  return plans.filter((p) => p.date === key || (p.repeatWeekdays && weekday && p.date <= key));
}
