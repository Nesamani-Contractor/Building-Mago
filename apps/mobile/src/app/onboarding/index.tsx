import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/Txt';
import { LookPhoto } from '@/components/Bits';
import { PressableScale } from '@/components/PressableScale';
import { LoopVideo, PhotoScrim, Segments } from '@/components/Wow';
import { useTheme } from '@/design/theme';
import { layout, palette, space } from '@/design/tokens';
import { LOOPS, photo } from '@/design/media';
import { track } from '@/services/analytics';

const FRAME_MS = 3500;
const FRAMES = [
  { line: 'Saw a look you loved?', media: 'softGlam' as const },
  { line: 'Too fast to follow.', media: 'partyLiner' as const },
  { line: 'Let Mago slow it down.', media: 'eyes' as const },
];

/**
 * S-02 Story opening (WOW v2 Beats 0–1): cold open → three story frames (tap right/left, hold to
 * pause, Skip always visible) → "Try it on a sample look" → The Unveil, before any sign-up (D-01).
 */
export default function Welcome() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const [progress, setProgress] = useState(0);
  const paused = useRef(false);
  const last = frame === FRAMES.length - 1;

  // Wordmark materialises: opacity + scale together, critically damped.
  const mark = useSharedValue(reduced ? 1 : 0);
  const jitter = useSharedValue(0);
  useEffect(() => {
    track('onb_welcome_viewed');
    if (!reduced) mark.set(withSpring(1, { damping: 26, stiffness: 160 }));
  }, [mark, reduced]);

  // Auto-advance every 3.5 s (not on the last frame), pausable by press-and-hold.
  useEffect(() => {
    if (last) return;
    const started = Date.now();
    let acc = 0;
    let prev = started;
    const t = setInterval(() => {
      const now = Date.now();
      if (!paused.current) acc += now - prev;
      prev = now;
      const p = Math.min(1, acc / FRAME_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(t);
        setFrame((f) => Math.min(FRAMES.length - 1, f + 1));
        setProgress(0);
      }
    }, 50);
    return () => clearInterval(t);
  }, [frame, last]);

  // Frame 2's type jitters once — the chaos Mago calms.
  useEffect(() => {
    track('onb_story_viewed', { frame: frame + 1 });
    if (frame === 1 && !reduced) {
      jitter.set(withSequence(withTiming(-3, { duration: 40 }), withTiming(3, { duration: 40 }), withTiming(-2, { duration: 40 }), withTiming(0, { duration: 60, easing: Easing.out(Easing.quad) })));
    }
  }, [frame, jitter, reduced]);

  const markStyle = useAnimatedStyle(() => ({ opacity: mark.get(), transform: [{ scale: 0.92 + mark.get() * 0.08 }] }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: jitter.get() }] }));

  function go(to: number) {
    setFrame(Math.max(0, Math.min(FRAMES.length - 1, to)));
    setProgress(0);
  }

  const current = FRAMES[frame]!;

  return (
    <View style={[styles.fill, { backgroundColor: '#2A1E26' }]}>
      <Animated.View key={frame} entering={reduced ? undefined : FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
        {current.media === 'softGlam' ? (
          <LoopVideo video={LOOPS.softGlam.video} poster={LOOPS.softGlam.poster} style={StyleSheet.absoluteFill} accessibilityLabel="A soft bronze eye being brushed on in window light" />
        ) : current.media === 'eyes' ? (
          <LoopVideo video={LOOPS.eyes.video} poster={LOOPS.eyes.poster} style={StyleSheet.absoluteFill} accessibilityLabel="Slow close-up of shimmer on an eyelid" />
        ) : (
          <LookPhoto image={{ ...photo('partyLiner'), focus: '45% 40%' }} style={StyleSheet.absoluteFill} accessibilityLabel="A sharp graphic liner look" />
        )}
      </Animated.View>
      <PhotoScrim top height={170} />
      <PhotoScrim height={460} />

      {/* Tap zones: left = back, right = next; hold anywhere = pause. */}
      <View style={[StyleSheet.absoluteFill, styles.zones]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous"
          style={styles.zone}
          onPress={() => go(frame - 1)}
          onLongPress={() => (paused.current = true)}
          onPressOut={() => (paused.current = false)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next"
          style={[styles.zone, { flex: 1.6 }]}
          onPress={() => go(frame + 1)}
          onLongPress={() => (paused.current = true)}
          onPressOut={() => (paused.current = false)}
        />
      </View>

      <View style={[styles.top, { top: insets.top + space.s }]} pointerEvents="box-none">
        <Segments count={FRAMES.length} active={frame} progress={last ? 1 : progress} />
        <View style={styles.topRow} pointerEvents="box-none">
          <Animated.View style={markStyle}>
            <Txt variant="eyebrow" style={{ color: c.inkOnPhoto, letterSpacing: 4, fontSize: 13 }}>
              Mago
            </Txt>
          </Animated.View>
          {!last ? (
            <PressableScale accessibilityLabel="Skip the intro" onPress={() => go(FRAMES.length - 1)} style={styles.skip}>
              <Txt variant="subhead" style={{ color: c.inkOnPhoto, fontWeight: '600' }}>
                Skip
              </Txt>
            </PressableScale>
          ) : null}
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, space.l) + space.s }]} pointerEvents="box-none">
        <Animated.View style={lineStyle} pointerEvents="none">
          <Txt variant="display" accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: c.inkOnPhoto, fontSize: 46, lineHeight: 48, letterSpacing: -0.8 }}>
            {current.line}
          </Txt>
        </Animated.View>
        {last ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(400).delay(200)} style={{ gap: space.xs, marginTop: space.x3 }}>
            <Txt variant="body" style={{ color: c.inkOnPhoto, opacity: 0.9, marginBottom: space.l }}>
              Any beauty video becomes calm, follow-along steps — every product, read aloud.
            </Txt>
            <PressableScale
              accessibilityLabel="Try it on a sample look"
              onPress={() => {
                track('unveil_sample_started', { from: 'onboarding' });
                router.push('/unveil/sample-soft-glam?onboarding=1');
              }}
              style={[styles.cta, { backgroundColor: palette.porcelain }]}
            >
              <Txt variant="button" style={{ color: palette.plum }}>
                Try it on a sample look
              </Txt>
            </PressableScale>
            <PressableScale accessibilityLabel="I already have an account" onPress={() => router.push('/onboarding/signin')} style={styles.link}>
              <Txt variant="subhead" style={{ color: c.inkOnPhoto }}>
                I already have an account
              </Txt>
            </PressableScale>
          </Animated.View>
        ) : (
          <Txt variant="footnote" style={{ color: c.inkOnPhoto, opacity: 0.8, marginTop: space.l }}>
            Tap to continue · hold to pause
          </Txt>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  zones: { flexDirection: 'row' },
  zone: { flex: 1 },
  top: { position: 'absolute', left: space.l, right: space.l, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  cta: { height: layout.buttonHeight, borderRadius: layout.buttonHeight / 2, alignItems: 'center', justifyContent: 'center' },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.l },
});
