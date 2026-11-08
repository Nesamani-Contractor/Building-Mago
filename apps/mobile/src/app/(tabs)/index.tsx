import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, RoundButton } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card, Badge } from '@/components/Surface';
import { Carousel, ProgressBar, RoutineRow, RoutineThumb, RoutineTile, SectionHeader, StreakRing, routineMeta, stepCount } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, space } from '@/design/tokens';
import { useLibrary, IMPORT_STAGES } from '@/data/library';
import { useSessions, resumableSession, plansOn } from '@/data/sessions';
import { useProfile } from '@/data/profile';
import { useAccount } from '@/data/account';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { greeting, todayLabel, useStreak } from '@/lib/hooks';
import { findRoutine, startersFor } from '@/lib/routines';

type Banner = 'week' | 'share' | 'pro';

/** Today (home). Ulta structure — greeting, banner carousel, rails — in the warm luxury skin. */
export default function Today() {
  const router = useRouter();
  const { c } = useTheme();
  const items = useLibrary((s) => s.items);
  const imports = useLibrary((s) => s.imports);
  const sessions = useSessions((s) => s.sessions);
  const plans = useSessions((s) => s.plans);
  const goal = useProfile((s) => s.goal);
  const isPro = useAccount((s) => s.isPro);
  const streak = useStreak();

  const saved = useMemo(() => Object.values(items).sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [items]);
  const pinned = saved.filter((s) => s.pinned);
  const resume = resumableSession(sessions);
  const resumeRoutine = resume ? findRoutine(resume.routineId) : undefined;
  const todayPlan = plansOn(plans, new Date()).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))[0];
  const planRoutine = todayPlan ? findRoutine(todayPlan.routineId) : undefined;
  const inFlight = Object.values(imports).filter((j) => j.status === 'processing' || j.status === 'pending_offline');
  const starters = startersFor(goal);
  const pick = SAMPLE_ROUTINES.find((r) => !items[r.id]) ?? SAMPLE_ROUTINES[0];
  const banners: Banner[] = isPro ? ['week', 'share'] : ['week', 'share', 'pro'];

  return (
    <Screen mood="warm" bottomInset={layout.tabBarSpace}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: space.xs }}>
          <Txt variant="subhead" tone="secondary">
            {todayLabel()}
          </Txt>
          <Txt variant="display" accessibilityRole="header">
            {greeting()}
          </Txt>
        </View>
        <RoundButton icon="search" label="Search your looks" onPress={() => router.push('/(tabs)/library')} />
      </View>

      <Carousel<Banner>
        data={banners}
        height={128}
        render={(b) =>
          b === 'week' ? (
            <Card style={styles.banner}>
              <StreakRing done={streak.thisWeekCount} goal={streak.weeklyGoal} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="headline">
                  {streak.thisWeekMet ? 'Your week is complete' : `${streak.thisWeekCount} of ${streak.weeklyGoal} looks this week`}
                </Txt>
                <Txt variant="callout" tone="secondary" numberOfLines={2}>
                  {streak.thisWeekMet
                    ? `${streak.streakWeeks} ${streak.streakWeeks === 1 ? 'week' : 'weeks'} in a row. Lovely.`
                    : streak.shouldNudge
                      ? 'Two days left — a quick 5-minute look counts.'
                      : `${streak.weeklyGoal - streak.thisWeekCount} more and your week is complete.`}
                </Txt>
              </View>
            </Card>
          ) : b === 'share' ? (
            <Card style={styles.banner}>
              <View style={[styles.bannerIcon, { borderColor: c.hairlineStrong }]}>
                <Icon name="share" size={24} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="headline">Saw a look you love?</Txt>
                <Txt variant="callout" tone="secondary" numberOfLines={2}>
                  Tap Share in YouTube, TikTok or Instagram, then Mago.
                </Txt>
              </View>
            </Card>
          ) : (
            <PressableScale onPress={() => router.push('/paywall?from=today')} accessibilityLabel="Try Mago Pro free for 7 days">
              <Card style={styles.banner}>
                <View style={[styles.bannerIcon, { borderColor: c.accent }]}>
                  <Icon name="sparkle" size={24} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt variant="headline">Mago Pro</Txt>
                  <Txt variant="callout" tone="secondary" numberOfLines={2}>
                    Unlimited looks and Simplify. 7 days free.
                  </Txt>
                </View>
                <Icon name="chevronRight" size={18} />
              </Card>
            </PressableScale>
          )
        }
      />

      {inFlight.map((j) => (
        <PressableScale key={j.id} onPress={() => router.push(`/import/${j.id}`)} accessibilityLabel="Open import in progress">
          <Card style={[styles.row, { marginTop: space.l }]}>
            <Icon name={j.status === 'pending_offline' ? 'wifiOff' : 'sparkle'} size={22} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{j.status === 'pending_offline' ? 'Waiting for a connection' : 'Writing your steps…'}</Txt>
              <Txt variant="footnote" tone="secondary">
                {j.status === 'pending_offline' ? 'We’ll start as soon as you’re online.' : IMPORT_STAGES[j.stage]}
              </Txt>
            </View>
            <Icon name="chevronRight" size={18} />
          </Card>
        </PressableScale>
      ))}

      {resume && resumeRoutine ? (
        <Card style={{ marginTop: space.l, gap: space.m }}>
          <View style={styles.row}>
            <RoutineThumb routine={resumeRoutine} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="footnote" tone="secondary">
                Pick up where you left off
              </Txt>
              <Txt variant="headline" numberOfLines={1}>
                {resumeRoutine.title}
              </Txt>
              <Txt variant="footnote" tone="secondary">
                Step {resume.stepIndex + 1} of {stepCount(resumeRoutine)}
              </Txt>
            </View>
            <Button variant="secondary" label="Resume" onPress={() => router.push(`/follow/${resumeRoutine.id}?session=${resume.id}`)} style={{ alignSelf: 'center', flexShrink: 0 }} />
          </View>
          <ProgressBar value={(resume.stepIndex + 1) / stepCount(resumeRoutine)} />
        </Card>
      ) : null}

      {planRoutine && todayPlan ? (
        <Card variant="porcelain" style={{ marginTop: space.l, gap: space.l }}>
          <View style={styles.between}>
            <Txt variant="subhead" tone="secondary">
              {todayPlan.time ? `Today at ${todayPlan.time}` : 'Planned for today'}
            </Txt>
            <Badge label={todayPlan.occasion} />
          </View>
          <View style={{ gap: space.xs }}>
            <Txt variant="title2">{planRoutine.title}</Txt>
            <Txt variant="callout" tone="secondary">
              {routineMeta(planRoutine)}
            </Txt>
          </View>
          <Button variant="hero" label="Start this look" onPress={() => router.push(`/follow/${planRoutine.id}`)} />
        </Card>
      ) : saved.length === 0 ? (
        <Card variant="porcelain" style={{ marginTop: space.l, gap: space.m }}>
          <Txt variant="title2">Your first look</Txt>
          <Txt variant="callout" tone="secondary">
            Start with one of these, or add a tutorial you love with the + button.
          </Txt>
          {starters.map((r) => (
            <RoutineRow key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} />
          ))}
        </Card>
      ) : (
        <Card variant="porcelain" style={{ marginTop: space.l, gap: space.l }}>
          <Txt variant="subhead" tone="secondary">
            Nothing planned today
          </Txt>
          <Txt variant="title2">{(saved[0] as (typeof saved)[number]).routine.title}</Txt>
          <Txt variant="callout" tone="secondary">
            {routineMeta((saved[0] as (typeof saved)[number]).routine)}
          </Txt>
          <Button variant="hero" label="Start this look" onPress={() => router.push(`/follow/${(saved[0] as (typeof saved)[number]).routine.id}`)} />
          <Button variant="ghost" label="Open planner" icon="calendar" onPress={() => router.push('/planner')} />
        </Card>
      )}

      {pinned.length > 0 ? (
        <>
          <SectionHeader title="Pinned" />
          <Rail>
            {pinned.map((s) => (
              <RoutineTile key={s.routine.id} routine={s.routine} onPress={() => router.push(`/routine/${s.routine.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}

      {saved.length > 0 ? (
        <>
          <SectionHeader title="Recently saved" action="See all" onAction={() => router.push('/(tabs)/library')} />
          <Rail>
            {saved.slice(0, 8).map((s) => (
              <RoutineTile key={s.routine.id} routine={s.routine} onPress={() => router.push(`/routine/${s.routine.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}

      {pick ? (
        <>
          <SectionHeader title="From Discover" action="More looks" onAction={() => router.push('/(tabs)/discover')} />
          <Card style={{ paddingVertical: space.xs }}>
            <RoutineRow routine={pick} onPress={() => router.push(`/routine/${pick.id}`)} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.l, paddingTop: space.m }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space.m, marginTop: space.xl, marginBottom: space.xxl },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.l, height: 128 },
  bannerIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
