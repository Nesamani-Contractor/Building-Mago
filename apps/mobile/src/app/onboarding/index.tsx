import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/Txt';
import { LookPhoto } from '@/components/Bits';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, palette, space } from '@/design/tokens';
import { photo } from '@/design/media';
import { track } from '@/services/analytics';

/** S-02 Welcome (Porter editorial): one full-bleed photograph, one headline, one action. No sign-up (D-01). */
export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  useEffect(() => {
    track('onb_welcome_viewed');
  }, []);

  return (
    <View style={[styles.fill, { backgroundColor: '#000' }]}>
      <Animated.View entering={reduced ? undefined : FadeIn.duration(600)} style={StyleSheet.absoluteFill}>
        <LookPhoto image={photo('brows')} style={StyleSheet.absoluteFill} accessibilityLabel="A woman shaping her brows with a fine brush" />
      </Animated.View>
      <LinearGradient colors={['rgba(14,8,11,0)', 'rgba(14,8,11,0.55)', 'rgba(14,8,11,0.86)']} locations={[0.25, 0.55, 1]} style={StyleSheet.absoluteFill} />

      <Txt variant="eyebrow" style={[styles.wordmark, { top: insets.top + space.l, color: c.inkOnPhoto }]}>
        Mago
      </Txt>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, space.l) + space.s }]}>
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(500).delay(200)} style={{ gap: space.m }}>
          <Txt variant="display" style={{ color: c.inkOnPhoto, fontSize: 44, lineHeight: 46 }} accessibilityRole="header">
            Every tutorial, ready for your mirror.
          </Txt>
          <Txt variant="body" style={{ color: c.inkOnPhoto, opacity: 0.88 }}>
            Save a look from YouTube, TikTok or Instagram. Mago turns it into calm steps you follow one at a time.
          </Txt>
        </Animated.View>
        <View style={{ gap: space.xs, marginTop: space.x3 }}>
          <PressableScale accessibilityLabel="Get started" onPress={() => router.push('/onboarding/age')} style={[styles.cta, { backgroundColor: palette.blush }]}>
            <Txt variant="button" style={{ color: palette.plum }}>
              Get started
            </Txt>
          </PressableScale>
          <PressableScale accessibilityLabel="I already have an account" onPress={() => router.push('/onboarding/signin')} style={styles.link}>
            <Txt variant="subhead" style={{ color: c.inkOnPhoto }}>
              I already have an account
            </Txt>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wordmark: { position: 'absolute', left: space.xl, letterSpacing: 4, fontSize: 13 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  cta: { height: layout.buttonHeight, borderRadius: layout.buttonHeight / 2, alignItems: 'center', justifyContent: 'center' },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.l },
});
