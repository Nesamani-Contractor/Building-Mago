import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { checkBag } from '@mago/shared';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Eyebrow, LookPhoto, stepCount } from '@/components/Bits';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { routineImage } from '@/design/media';
import { useSessions, plansOn } from '@/data/sessions';
import { useBag } from '@/data/bag';
import { useStreak } from '@/lib/hooks';
import { findRoutine } from '@/lib/routines';

/**
 * Onboarding-flow skill screen 26 (D-27): Home opens with today's look ready — photo, Start, the
 * week strip against her weekly goal, and how much of the look is already in her bag.
 */
export function TodayLook() {
  const router = useRouter();
  const { c } = useTheme();
  const plans = useSessions((s) => s.plans);
  const bag = useBag((s) => s.items);
  const streak = useStreak();
  const today = new Date();
  const plan = plansOn(plans, today)[0];
  const routine = plan ? findRoutine(plan.routineId) : undefined;
  const check = routine && bag.length ? checkBag(routine.products, bag, routine.sections) : null;
  if (!routine) return null;

  // Monday-first week strip.
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + k);
    return d;
  });
  const planned = new Set(plans.map((p) => p.date));
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return (
    <View style={{ marginTop: space.xxl, gap: space.m }}>
      <View>
        <LookPhoto image={routineImage(routine)} style={styles.photo} accessibilityLabel={routine.title} />
        <View style={[styles.label, { backgroundColor: c.glass }]}>
          <Eyebrow>Today</Eyebrow>
          <Txt variant="headline" numberOfLines={1}>
            {routine.title} · {routine.totalTimeMin} min
          </Txt>
        </View>
      </View>
      <Button label="Start look" icon="play" onPress={() => router.push(`/brief/${routine.id}`)} />
      <View style={styles.week} accessible accessibilityLabel={`${streak.thisWeekCount} of ${streak.weeklyGoal} looks this week`}>
        {days.map((d) => {
          const isToday = key(d) === key(today);
          return (
            <View key={key(d)} style={[styles.day, { borderColor: isToday ? c.primary : c.hairlineStrong, backgroundColor: planned.has(key(d)) ? c.surfaceAlt : 'transparent' }]}>
              <Txt variant="caption" tone={isToday ? undefined : 'secondary'} style={isToday ? { color: c.primary } : undefined}>
                {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
              </Txt>
            </View>
          );
        })}
        <Txt variant="footnote" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
          {streak.thisWeekCount}/{streak.weeklyGoal}
        </Txt>
      </View>
      {check ? (
        <View style={[styles.bag, { backgroundColor: c.surface }]}>
          <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
            {check.have + check.swaps}/{check.needed}
          </Txt>
          <Txt variant="callout" tone="secondary" style={{ flex: 1 }}>
            products for today’s look are in your bag
          </Txt>
        </View>
      ) : (
        <Txt variant="footnote" tone="secondary">
          {stepCount(routine)} steps · products shown on every step
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 200, borderRadius: radius.card },
  label: { position: 'absolute', left: space.m, right: space.m, bottom: space.m, borderRadius: radius.thumb, padding: space.m, gap: 2 },
  week: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  day: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bag: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.thumb },
});
