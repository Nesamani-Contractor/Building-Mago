import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Eyebrow, LookHero, RoutineRow, RoutineTile, SectionHeader, StreakRing, stepCount } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import { useLibrary, IMPORT_STAGES } from '@/data/library';
import { useSessions, resumableSession, plansOn } from '@/data/sessions';
import { useProfile } from '@/data/profile';
import { useAccount } from '@/data/account';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { greeting, todayLabel, useStreak } from '@/lib/hooks';
import { findRoutine, startersFor } from '@/lib/routines';
import { useBag } from '@/data/bag';

function lookOfTheMoment(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'This morning’s look';
  if (h < 17) return 'Today’s look';
  return 'Tonight’s look';
}

/**
 * Today (Porter editorial): date + greeting, ONE hero look on a full photo, a quiet paste
 * field, then "pick up where you left off" and photo rails. At most one contextual tip.
 */
export default function Today() {
  const router = useRouter();
  const { c } = useTheme();
  const items = useLibrary((s) => s.items);
  const imports = useLibrary((s) => s.imports);
  const sessions = useSessions((s) => s.sessions);
  const plans = useSessions((s) => s.plans);
  const goal = useProfile((s) => s.goal);
  const name = useProfile((s) => s.name);
  const isPro = useAccount((s) => s.isPro);
  const streak = useStreak();
  const bagCount = useBag((s) => s.items.length);

  const saved = useMemo(() => Object.values(items).sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [items]);
  const completed = useMemo(() => Object.values(sessions).filter((s) => s.completedAt).length, [sessions]);
  const resume = resumableSession(sessions);
  const resumeRoutine = resume ? findRoutine(resume.routineId) : undefined;
  const todayPlan = plansOn(plans, new Date()).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))[0];
  const planRoutine = todayPlan ? findRoutine(todayPlan.routineId) : undefined;
  const inFlight = Object.values(imports).filter((j) => j.status === 'processing' || j.status === 'pending_offline');
  const starters = startersFor(goal);

  const hero = planRoutine ?? saved.find((s) => s.routine.id !== resumeRoutine?.id)?.routine ?? starters[0] ?? SAMPLE_ROUTINES[0];
  const heroEyebrow = planRoutine
    ? todayPlan?.time
      ? `Today at ${todayPlan.time}`
      : 'Planned for today'
    : saved.length === 0
      ? 'Your first look'
      : lookOfTheMoment();
  const yourLooks = saved.filter((s) => s.routine.id !== hero?.id).map((s) => s.routine);
  const picked = (saved.length === 0 ? starters : []).filter((r) => r.id !== hero?.id);
  const fromDiscover = SAMPLE_ROUTINES.filter((r) => !items[r.id] && r.id !== hero?.id && !picked.some((p) => p.id === r.id)).slice(0, 6);

  // One contextual tip at most, and only once she has done a look or two.
  const tip: 'pro' | 'bag' | null = !isPro && completed >= 2 ? 'pro' : bagCount === 0 && completed >= 1 ? 'bag' : null;

  return (
    <Screen mood="warm" bottomInset={layout.tabBarSpace}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 6 }}>
          <Eyebrow>{todayLabel()}</Eyebrow>
          <Txt variant="display" accessibilityRole="header">
            {name ? `${greeting()}, ${name}` : greeting()}
          </Txt>
        </View>
        {completed > 0 ? (
          <PressableScale onPress={() => router.push('/(tabs)/me')} accessibilityLabel={`${streak.thisWeekCount} of ${streak.weeklyGoal} looks this week. Open your progress`}>
            <StreakRing done={streak.thisWeekCount} goal={streak.weeklyGoal} size={44} />
          </PressableScale>
        ) : null}
      </View>

      {hero ? (
        <LookHero
          routine={hero}
          eyebrow={heroEyebrow}
          meta={`${hero.totalTimeMin} min · ${stepCount(hero)} steps`}
          action="Start"
          onPress={() => router.push(`/routine/${hero.id}`)}
          onAction={() => router.push(`/brief/${hero.id}`)}
        />
      ) : null}

      <PressableScale
        onPress={() => router.push('/add')}
        accessibilityLabel="Paste a tutorial link to turn it into steps"
        scaleTo={0.985}
        style={[styles.paste, { backgroundColor: c.surfaceAlt }]}
      >
        <Icon name="link" size={20} color={c.inkSecondary} />
        <Txt variant="body" tone="secondary" style={{ flex: 1 }}>
          Paste a tutorial link
        </Txt>
        <Icon name="plus" size={20} color={c.inkSecondary} />
      </PressableScale>

      {inFlight.map((j) => (
        <PressableScale
          key={j.id}
          onPress={() => router.push(`/import/${j.id}`)}
          accessibilityLabel="Open import in progress"
          style={[styles.notice, { backgroundColor: c.surface }]}
        >
          <Icon name={j.status === 'pending_offline' ? 'wifiOff' : 'sparkle'} size={20} color={c.inkSecondary} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{j.status === 'pending_offline' ? 'Waiting for a connection' : 'Writing your steps…'}</Txt>
            <Txt variant="footnote" tone="secondary">
              {j.status === 'pending_offline' ? 'We’ll start as soon as you’re online.' : IMPORT_STAGES[j.stage]}
            </Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.inkSecondary} />
        </PressableScale>
      ))}

      {resume && resumeRoutine ? (
        <>
          <SectionHeader title="Pick up where you left off" />
          <View style={{ marginTop: space.m }}>
            <RoutineRow
              routine={resumeRoutine}
              subtitle={`Step ${resume.stepIndex + 1} of ${stepCount(resumeRoutine)}`}
              progress={(resume.stepIndex + 1) / stepCount(resumeRoutine)}
              onPress={() => router.push(`/follow/${resumeRoutine.id}?session=${resume.id}`)}
            />
          </View>
        </>
      ) : null}

      {yourLooks.length > 0 ? (
        <>
          <SectionHeader title="Your looks" action="See all" onAction={() => router.push('/(tabs)/library')} />
          <Rail>
            {yourLooks.slice(0, 8).map((r) => (
              <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}

      {picked.length > 0 ? (
        <>
          <SectionHeader title="Picked for you" />
          <Rail>
            {picked.map((r) => (
              <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}

      {tip ? (
        <PressableScale
          onPress={() => router.push(tip === 'pro' ? '/paywall?from=today' : '/bag/scan')}
          accessibilityLabel={tip === 'pro' ? 'Try Mago Pro free for 7 days' : 'Scan your makeup bag'}
          style={[styles.notice, { backgroundColor: c.surface, marginTop: space.x4 }]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>{tip === 'pro' ? 'Mago Pro' : 'Your makeup bag'}</Eyebrow>
            <Txt variant="headline">{tip === 'pro' ? 'Every tutorial, no monthly limit' : 'See what you already own'}</Txt>
            <Txt variant="footnote" tone="secondary">
              {tip === 'pro' ? '7 days free, then $39.99 a year.' : 'Scan once — every look shows have, swap or missing.'}
            </Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.inkSecondary} />
        </PressableScale>
      ) : null}

      {fromDiscover.length > 0 ? (
        <>
          <SectionHeader title="From Discover" action="See all" onAction={() => router.push('/(tabs)/discover')} />
          <Rail>
            {fromDiscover.map((r) => (
              <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}

      {planRoutine === undefined && saved.length > 0 ? (
        <PressableScale onPress={() => router.push('/planner')} accessibilityLabel="Open planner" style={styles.planner}>
          <Icon name="calendar" size={18} color={c.inkSecondary} />
          <Txt variant="subhead" tone="secondary">
            Plan a look for later this week
          </Txt>
        </PressableScale>
      ) : null}
    </Screen>
  );
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.xl }}
      contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m, paddingTop: space.m }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.m, marginTop: space.l, marginBottom: space.xxl },
  paste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: 52,
    paddingHorizontal: space.l,
    borderRadius: radius.pill,
    marginTop: space.l,
  },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.thumb, marginTop: space.m },
  planner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, minHeight: 44, marginTop: space.x3 },
});
