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

/**
 * FR-GRT: greeting from HER local time. `getHours()` uses the phone's own time zone, which follows
 * the country she is in — no location permission needed.
 * 5:00–11:59 morning · 12:00–16:59 afternoon · 17:00–4:59 evening.
 */
export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Good evening, Maya" (or just "Good evening" before she tells us her name). Refreshes each minute. */
export function useGreeting(): string {
  const name = useProfile((s) => s.name);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const first = name?.trim();
  return first ? `${greeting(now)}, ${first}` : greeting(now);
}

/** FR-PIN: "Last tried today" / "Last tried 3 days ago" / "Not tried yet". */
export function lastTriedLabel(iso: string | undefined, now = new Date()): string {
  if (!iso) return 'Not tried yet';
  const then = new Date(iso);
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(then).getTime()) / 86_400_000);
  if (days <= 0) return 'Last tried today';
  if (days === 1) return 'Last tried yesterday';
  if (days < 7) return `Last tried ${days} days ago`;
  if (days < 14) return 'Last tried last week';
  return `Last tried ${then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function todayLabel(now = new Date()): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
