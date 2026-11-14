import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { LoopVideo } from '@/components/Wow';
import { Head } from '@/components/OnboardingBits';
import { useTheme } from '@/design/theme';
import { layout, palette, radius, space } from '@/design/tokens';
import { WELCOME_REEL } from '@/design/media';
import { track } from '@/services/analytics';

/**
 * Onboarding-flow skill screen 1 (D-27) / S-02 Welcome (PRD J1): full-bleed 33 s reel with its own music of the app in use — the look she saw → share to Mago →
 * follow step by step → do the look. One idea, one primary button (book cr-1), product shown in the
 * first three seconds (va-9). No sign-up, no permission prompts (FR-ONB-01/02). If the reel can't
 * play (Reduce Motion, error) its poster shows instead.
 */
export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = insets.top;
  const reduced = useReducedMotion();

  useEffect(() => {
    track('onb_welcome_viewed');
  }, []);

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <View style={[styles.media, { backgroundColor: palette.ink, marginTop: 0, paddingTop: topPad }]}>
        <LoopVideo sound video={WELCOME_REEL.video} poster={WELCOME_REEL.poster} style={styles.video} accessibilityLabel="A short film: a saved makeup look turns into calm, step-by-step instructions in Mago" />
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, space.l) + space.xs }]}>
        <Animated.View entering={reduced ? undefined : FadeInDown.delay(250).duration(500)} style={{ gap: space.s }}>
          <Head size="display" lead="Every look you save, " em="finally on your face." />
          <Txt variant="callout" tone="secondary">
            Turn the tutorials you save into looks you actually do — step by step, hands-free.
          </Txt>
        </Animated.View>
        <Animated.View entering={reduced ? undefined : FadeInDown.delay(450).duration(500)} style={{ gap: space.xs, marginTop: space.l }}>
          <Button
            label="Get started"
            onPress={() => {
              track('onb_get_started');
              router.push('/onboarding/flow');
            }}
          />
          <Button variant="ghost" label="I already have an account" onPress={() => router.push('/onboarding/signin')} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  media: { flex: 1, borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet, overflow: 'hidden' },
  video: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bottom: { paddingHorizontal: space.xl, paddingTop: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
});
