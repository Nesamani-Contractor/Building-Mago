import type { Routine } from '@mago/shared';
import { useLibrary } from '@/data/library';
import { SAMPLE_ROUTINES } from '@/data/samples';
import type { Goal } from '@/data/profile';

/** Find a routine in her library first, then in Discover samples. */
export function findRoutine(id: string): Routine | undefined {
  return useLibrary.getState().items[id]?.routine ?? SAMPLE_ROUTINES.find((r) => r.id === id);
}

export function useRoutine(id: string | undefined): Routine | undefined {
  const saved = useLibrary((s) => (id ? s.items[id]?.routine : undefined));
  return saved ?? SAMPLE_ROUTINES.find((r) => r.id === id);
}

/** Onboarding goal → three starter looks (the goal answer visibly changes these). */
export function startersFor(goal: Goal | null): Routine[] {
  const by: Record<Goal, string[]> = {
    recreate: ['sample-soft-glam', 'sample-party-liner', 'sample-glossy-lips'],
    everyday: ['sample-work-face', 'sample-five-min-brows', 'sample-glossy-lips'],
    learn: ['sample-party-liner', 'sample-soft-glam', 'sample-sunkissed'],
    events: ['sample-wedding-guest', 'sample-soft-glam', 'sample-party-liner'],
    glowup: ['sample-dewy-skin', 'sample-work-face', 'sample-sunkissed'],
  };
  const ids = by[goal ?? 'everyday'];
  return ids.map((id) => SAMPLE_ROUTINES.find((r) => r.id === id)).filter((r): r is Routine => !!r);
}

/** Looks for several goals, first goal first, no repeats (max 4). */
export function startersForGoals(goals: Goal[]): Routine[] {
  const seen = new Set<string>();
  const out: Routine[] = [];
  for (const g of goals.length ? goals : ['recreate' as Goal]) for (const r of startersFor(g))
      if (!seen.has(r.id)) {
        seen.add(r.id);
        out.push(r);
      }
  return out.slice(0, 4);
}

