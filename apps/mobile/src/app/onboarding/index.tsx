import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { track } from '@/services/analytics';

const REEL: { icon: IconName; title: string; body: string }[] = [
  { icon: 'share', title: 'Share any tutorial', body: 'From YouTube, TikTok or Instagram — tap Share, then Mago.' },
  { icon: 'sparkle', title: 'Get clear steps', body: 'Every step, product and tip, in order.' },
  { icon: 'play', title: 'Do the look', body: 'One step at a time at your mirror, hands-free.' },
];

const BENEFITS: { icon: IconName; label: string }[] = [
  { icon: 'link', label: 'Any tutorial into steps' },
  { icon: 'speaker', label: 'Follow along at the mirror' },
  { icon: 'camera', label: 'See your glow-up' },
];

/** S-02 Welcome. Value before sign-up: no account screen here (D-01). */
export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    track('onb_welcome_viewed');
    const t = setInterval(() => setI((n) => (n + 1) % REEL.length), 3200);
    return () => clearInterval(t);
  }, []);

  const slide = REEL[i] as (typeof REEL)[number];

  return (
    <Screen
      mood="reveal"
      footer={
        <View style={{ gap: space.s }}>
          <Button variant="hero" label="Get started" onPress={() => router.push('/onboarding/age')} />
          <PressableScale accessibilityLabel="I already have an account" onPress={() => router.push('/onboarding/signin')} style={styles.link}>
            <Txt variant="subhead" style={{ textDecorationLine: 'underline', textDecorationColor: c.accent }}>
              I already have an account
            </Txt>
          </PressableScale>
        </View>
      }
    >
      <View style={styles.top}>
        <Txt variant="caption" tone="secondary" style={{ letterSpacing: 2 }}>
          MAGO
        </Txt>
        <Txt variant="display" accessibilityRole="header">
          Save it.{'\n'}Do it.{'\n'}See the glow-up.
        </Txt>
        <Txt variant="body" tone="secondary">
          Turn the beauty tutorials you love into calm, step-by-step looks you can follow at your mirror.
        </Txt>
      </View>

      <Card style={{ marginTop: space.x3, minHeight: 132 }} accessibilityLiveRegion="polite">
        <Animated.View key={i} entering={reduced ? undefined : FadeIn.duration(400)} style={styles.reel}>
          <View style={[styles.reelIcon, { borderColor: c.hairlineStrong }]}>
            <Icon name={slide.icon} size={24} />
          </View>
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt variant="caption" tone="secondary">{`${i + 1} of ${REEL.length}`}</Txt>
            <Txt variant="title3">{slide.title}</Txt>
            <Txt variant="callout" tone="secondary">
              {slide.body}
            </Txt>
          </View>
        </Animated.View>
      </Card>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.label} style={styles.benefit}>
            <Icon name={b.icon} size={26} />
            <Txt variant="footnote" align="center">
              {b.label}
            </Txt>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { gap: space.l, marginTop: space.x5 },
  reel: { flexDirection: 'row', gap: space.l, alignItems: 'center' },
  reelIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  benefits: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.x3, gap: space.m },
  benefit: { flex: 1, alignItems: 'center', gap: space.s },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.l },
});
