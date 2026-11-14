import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Eyebrow, LookPhoto, stepCount } from '@/components/Bits';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { routineImage } from '@/design/media';
import { useProfile } from '@/data/profile';
import { useLibrary } from '@/data/library';
import { startersForGoals } from '@/lib/routines';
import { track } from '@/services/analytics';

/**
 * S-07 "Your Mago is ready" (PRD J1): looks matched to her answers (pe-9, personalization-5/6), then
 * the core action before any sign-up or paywall — unveil a sample look (va-8, value-6). Ends on a
 * populated Home (va-11). No permission prompts here (notifications come after her first import).
 */
export default function Preview() {
  const router = useRouter();
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const goals = useProfile((s) => s.goals);
  const skill = useProfile((s) => s.skill);
  const set = useProfile((s) => s.set);
  const save = useLibrary((s) => s.save);
  const looks = useMemo(() => startersForGoals(goals), [goals]);
  const first = looks[0];

  useEffect(() => {
    track('onb_preview_viewed');
  }, []);

  function goHome() {
    set({ onboarded: true });
    track('onb_completed', { path: 'home' });
    router.replace('/(tabs)');
  }

  return (
    <Screen
      mood="warm"
      footer={
        <View style={{ gap: space.xs }}>
          {first ? (
            <Button
              label="Unveil my first look"
              onPress={() => {
                track('unveil_sample_started');
                router.push(`/unveil/${first.id}?onboarding=1`);
              }}
            />
          ) : null}
          <Button variant="ghost" label="Go to Home" onPress={goHome} />
        </View>
      }
    >
      <View style={{ gap: space.s, marginTop: space.xxl }}>
        <Eyebrow>Picked for you</Eyebrow>
        <Txt variant="title1" accessibilityRole="header">
          Your Mago is ready
        </Txt>
        <Txt variant="callout" tone="secondary">
          {skill === 'beginner' ? 'Every step explains what to do and how much. ' : skill === 'pro' ? 'Short, one-line steps. ' : ''}
          Tap one to see it unveiled.
        </Txt>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m }}>
        {looks.map((r, i) => (
          <Animated.View key={r.id} entering={reduced ? undefined : FadeInRight.delay(i * 110).springify().damping(18)}>
            <PressableScale
              accessibilityLabel={`${r.title}. ${r.totalTimeMin} minutes, ${stepCount(r)} steps. Unveil it`}
              onPress={() => {
                save(r);
                router.push(`/unveil/${r.id}?onboarding=1`);
              }}
              scaleTo={0.98}
              style={{ width: 230, gap: space.s }}
            >
              <LookPhoto image={routineImage(r)} style={styles.photo} />
              <View style={[styles.chip, { backgroundColor: c.glass }]}>
                <Txt variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
                  {r.totalTimeMin} min · {stepCount(r)} steps
                </Txt>
              </View>
              <Txt variant="headline" numberOfLines={1}>
                {r.title}
              </Txt>
            </PressableScale>
          </Animated.View>
        ))}
      </ScrollView>

      <Animated.View entering={reduced ? undefined : FadeInDown.delay(400)} style={[styles.note, { backgroundColor: c.surface }]}>
        <Txt variant="headline">Free to start</Txt>
        <Txt variant="footnote" tone="secondary">
          5 new looks a month, and every look you save stays free. No sign-up needed. Your looks stay on your phone.
        </Txt>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: 230, height: 300, borderRadius: radius.card },
  chip: { position: 'absolute', left: 10, top: 10, height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  note: { marginTop: space.xl, padding: space.l, borderRadius: radius.card, gap: space.xs },
});
