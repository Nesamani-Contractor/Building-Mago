import { useAccount, type PlanId } from '@/data/account';
import { track } from './analytics';
import { isDemo } from './config';

/**
 * Subscriptions. Production: RevenueCat (offerings set remotely; server webhook is the source of
 * truth for entitlements). Demo: a simulated purchase that never charges anything.
 */
export interface Offering {
  id: PlanId;
  title: string;
  price: string;
  perMonth: string;
  trialDays: number;
  savings?: string;
}

/** Mirrors PRD OQ-2 (D-03). In production these come from RevenueCat, so prices change without an update. */
export const OFFERINGS: Offering[] = [
  { id: 'yearly', title: 'Yearly', price: '$39.99/year', perMonth: '$3.33/month', trialDays: 7, savings: 'Save 44%' },
  { id: 'monthly', title: 'Monthly', price: '$5.99/month', perMonth: '$5.99/month', trialDays: 0 },
];

export async function purchase(plan: PlanId): Promise<{ ok: boolean; message?: string }> {
  if (!isDemo) return { ok: false, message: 'Purchases need the full Mago build (RevenueCat, Phase 6).' };
  await new Promise((r) => setTimeout(r, 900));
  const offering = OFFERINGS.find((o) => o.id === plan);
  const trialEnds = offering && offering.trialDays > 0 ? new Date(Date.now() + offering.trialDays * 86400000).toISOString() : null;
  useAccount.getState().setPro(plan, trialEnds);
  track(trialEnds ? 'trial_started' : 'purchase_completed', { plan });
  return { ok: true };
}

export async function restore(): Promise<{ ok: boolean; message: string }> {
  track('restore_tapped', {});
  await new Promise((r) => setTimeout(r, 700));
  return useAccount.getState().isPro
    ? { ok: true, message: 'Your Pro membership is active.' }
    : { ok: false, message: 'We didn’t find a previous purchase for this Apple or Google account.' };
}

/** Plain-words trial timeline for the paywall (Apple 3.1.2 disclosure). */
export function trialTimeline(now = new Date()): { today: string; reminder: string; charge: string } {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const remind = new Date(now.getTime() + 5 * 86400000);
  const charge = new Date(now.getTime() + 7 * 86400000);
  return { today: fmt(now), reminder: fmt(remind), charge: fmt(charge) };
}
