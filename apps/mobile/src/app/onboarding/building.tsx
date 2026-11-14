import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { LookPhoto } from '@/components/Bits';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { routineImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { useProfile, type Goal } from '@/data/profile';
import { startersForGoals } from '@/lib/routines';
import { track } from '@/services/analytics';

const GOAL_WORDS: Record<Goal, string> = {
  recreate: 'recreating saved looks',
  everyday: 'quick everyday makeup',
  events: 'events and nights out',
  learn: 'learning new techniques',
  glowup: 'your glow-up',
};

/**
 * "Building your Mago" (book ch. 6): plays her answers back one line at a time (li-4, labor-illusion-2),
 * and every line is something the app really does with that answer (li-7). No invented stats.
 * Auto-continues to the personalised preview.
 */
export default function Building() {
  const router = useRouter();
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const p = useProfile();
  const [done, setDone] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const goals = p.goals.length ? p.goals : (['recreate'] as Goal[]);
  const looks = startersForGoals(goals);
  const lines = [
    `Choosing your first looks for ${goals.map((g) => GOAL_WORDS[g]).slice(0, 2).join(' and ')}`,
    'Setting up sharing from YouTube, TikTok and Instagram',
    p.skill === 'beginner' ? 'Adding extra detail to every step' : p.skill === 'pro' ? 'Keeping every step to one line' : 'Adding tips where they help',
    `Your goal: ${p.weeklyGoal} ${p.weeklyGoal === 1 ? 'look' : 'looks'} a week, no daily pressure`,
  ];

  useEffect(() => {
    track('onb_building_viewed');
    const step = reduced ? 350 : 700;
    timers.current = lines.map((_, i) =>
      setTimeout(() => {
        setDone(i + 1);
        haptic.select();
      }, step * (i + 1)),
    );
    timers.current.push(
      setTimeout(() => {
        haptic.success();
        router.replace('/onboarding/preview');
      }, step * (lines.length + 1) + 300),
    );
    const t = timers.current;
    return () => t.forEach(clearTimeout);
    // Runs once on arrival; answers are fixed by now.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen mood="warm">
      <View style={styles.stack} accessible accessibilityLabel="Showing the looks we're preparing for you">
        {looks.slice(0, 3).map((r, i) => (
          <Animated.View
            key={r.id}
            entering={reduced ? undefined : FadeInDown.delay(i * 120).springify().damping(16)}
            style={[styles.card, { transform: [{ rotate: `${(i - 1) * 7}deg` }, { translateY: i === 1 ? -12 : 6 }], zIndex: i === 1 ? 2 : 1, shadowColor: c.shadow }]}
          >
            <LookPhoto image={routineImage(r)} style={styles.cardPhoto} />
          </Animated.View>
        ))}
      </View>

      <Txt variant="title1" align="center" accessibilityRole="header" style={{ marginTop: space.xl }}>
        Building your Mago
      </Txt>

      <View style={{ gap: space.m, marginTop: space.xl }}>
        {lines.map((l, i) => {
          const ok = done > i;
          return (
            <Animated.View key={l} entering={reduced ? undefined : FadeIn.delay(i * 120)} style={styles.row} accessibilityLiveRegion={ok ? 'polite' : 'none'}>
              <View style={[styles.tick, { backgroundColor: ok ? c.primary : c.surfaceAlt }]}>{ok ? <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.4} /> : null}</View>
              <Txt variant="callout" style={{ flex: 1, color: ok ? c.ink : c.inkSecondary }}>
                {l}
              </Txt>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { height: 230, marginTop: space.x4, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  card: { width: 120, height: 170, marginHorizontal: -14, borderRadius: radius.card, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  cardPhoto: { width: 120, height: 170, borderRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 32 },
  tick: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
