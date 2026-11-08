import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { monthKey } from '@mago/shared';
import { deviceStorage } from './storage';

export type PlanId = 'yearly' | 'monthly';

export interface ReferralEntry {
  id: string;
  label: string;
  status: 'installed' | 'activated' | 'rewarded';
}

interface AccountState {
  /** Mirror of the server's entitlement (server is the source of truth for anything that costs money). */
  isPro: boolean;
  plan: PlanId | null;
  trialEndsAt: string | null;
  renewsAt: string | null;
  usageMonth: string;
  conversionsThisMonth: number;
  simplifyThisMonth: number;
  lastBackupAt: string | null;
  referrals: ReferralEntry[];
  referralMonthsEarned: number;
  recordConversion: () => void;
  recordSimplify: () => void;
  setPro: (plan: PlanId | null, trialEndsAt?: string | null) => void;
  set: (patch: Partial<Omit<AccountState, 'set' | 'reset' | 'recordConversion' | 'recordSimplify' | 'setPro'>>) => void;
  reset: () => void;
}

const fresh = () => ({
  isPro: false,
  plan: null,
  trialEndsAt: null,
  renewsAt: null,
  usageMonth: monthKey(new Date()),
  conversionsThisMonth: 0,
  simplifyThisMonth: 0,
  lastBackupAt: null,
  referrals: [] as ReferralEntry[],
  referralMonthsEarned: 0,
});

export const useAccount = create<AccountState>()(
  persist(
    (set, get) => ({
      ...fresh(),
      recordConversion: () => {
        const m = monthKey(new Date());
        const s = get();
        set(s.usageMonth === m ? { conversionsThisMonth: s.conversionsThisMonth + 1 } : { usageMonth: m, conversionsThisMonth: 1, simplifyThisMonth: 0 });
      },
      recordSimplify: () => set((s) => ({ simplifyThisMonth: s.simplifyThisMonth + 1 })),
      setPro: (plan, trialEndsAt = null) => {
        const renews = new Date();
        if (plan === 'yearly') renews.setFullYear(renews.getFullYear() + 1);
        else renews.setMonth(renews.getMonth() + 1);
        set({ isPro: plan !== null, plan, trialEndsAt, renewsAt: plan ? (trialEndsAt ?? renews.toISOString()) : null });
      },
      set: (patch) => set(patch),
      reset: () => set(fresh()),
    }),
    { name: 'mago.account.v1', storage: deviceStorage },
  ),
);

/** Conversions used this calendar month (resets on month change). */
export function conversionsUsed(s: { usageMonth: string; conversionsThisMonth: number }, now = new Date()): number {
  return s.usageMonth === monthKey(now) ? s.conversionsThisMonth : 0;
}
