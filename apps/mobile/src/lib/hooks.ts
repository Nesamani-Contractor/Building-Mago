import { useEffect, useMemo, useState } from 'react';
import { computeStreak, weekKey } from '@mago/shared';
import { useProfile } from '@/data/profile';
import { usePrefs } from '@/data/prefs';
import { useLibrary } from '@/data/library';
import { useSessions, completionDates } from '@/data/sessions';
import { useAccount } from '@/data/account';
import { useBag } from '@/data/bag';

const stores = [useProfile, usePrefs, useLibrary, useSessions, useAccount, useBag];

/** True once every on-device store has loaded from storage. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (ready) return;
    const check = () => setReady(stores.every((s) => s.persist.hasHydrated()));
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, [ready]);
  return ready;
}

export function useStreak() {
  const sessions = useSessions((s) => s.sessions);
  const frozenWeeks = useSessions((s) => s.frozenWeeks);
  const weeklyGoal = useProfile((s) => s.weeklyGoal);
  return useMemo(
    () => ({ ...computeStreak({ completions: completionDates(sessions), weeklyGoal, frozenWeeks, now: new Date() }), weeklyGoal, currentWeek: weekKey(new Date()) }),
    [sessions, frozenWeeks, weeklyGoal],
  );
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function todayLabel(now = new Date()): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
