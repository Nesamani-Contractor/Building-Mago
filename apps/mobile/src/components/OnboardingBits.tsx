import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';

/**
 * Building blocks for the Onboarding-flow skill screens (D-27), drawn with the app's own
 * WOW v2 tokens: porcelain, plum, Cormorant headlines with one italic emphasis.
 */

/** Serif headline; `em` is the italic, plum-tinted emphasis from the skill ("finally on your face"). */
export function Head({ lead, em, after, center, size = 'title1' }: { lead: string; em?: string; after?: string; center?: boolean; size?: 'display' | 'title1' | 'title2' }) {
  const { c } = useTheme();
  return (
    <Txt variant={size} accessibilityRole="header" align={center ? 'center' : undefined}>
      {lead}
      {em ? (
        <Txt variant={size} style={{ fontFamily: fonts.serifItalic, color: c.primary }}>
          {em}
        </Txt>
      ) : null}
      {after ?? ''}
    </Txt>
  );
}

/** One answer row: single (radio) or multi (checkbox). */
export function Option({ label, selected, multi, onPress }: { label: string; selected: boolean; multi?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      scaleTo={0.98}
      style={[styles.option, { backgroundColor: c.surface, borderColor: selected ? c.primary : 'transparent' }]}
    >
      <Txt variant="headline" style={{ flex: 1 }}>
        {label}
      </Txt>
      <View style={[multi ? styles.box : styles.radio, { borderColor: selected ? c.primary : c.hairlineStrong, backgroundColor: selected ? c.primary : 'transparent' }]}>
        {selected ? <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.2} /> : null}
      </View>
    </PressableScale>
  );
}

/** Warm reply bubble that answers her choice (pe-7). */
export function Reply({ text }: { text: string }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View key={text} entering={reduced ? undefined : FadeIn.duration(250)} style={[styles.reply, { backgroundColor: c.surfaceAlt }]}>
      <Icon name="sparkle" size={16} color={c.primary} />
      <Txt variant="callout" style={{ flex: 1, color: c.ink }} accessibilityLiveRegion="polite">
        {text}
      </Txt>
    </Animated.View>
  );
}

/** A checklist line that appears with a haptic (loader, paywall bullets). */
export function CheckLine({ text, delay = 0, done = true }: { text: string; delay?: number; done?: boolean }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(delay).duration(320)} style={styles.check}>
      <View style={[styles.checkDot, { backgroundColor: done ? c.primary : c.surfaceAlt }]}>
        {done ? <Icon name="check" size={13} color={c.inkOnPrimary} strokeWidth={2.4} /> : null}
      </View>
      <Txt variant="body" style={{ flex: 1 }}>
        {text}
      </Txt>
    </Animated.View>
  );
}

/** Progress ring for the plan-building loader. */
export function LoaderRing({ progress, children }: { progress: number; children?: ReactNode }) {
  const { c } = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(progress, { duration: 600 }));
  }, [progress, w]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.round(w.get() * 100)}%` }));
  return (
    <View style={{ alignItems: 'center', gap: space.m }}>
      <View style={[styles.ring, { borderColor: c.surfaceAlt }]}>
        <Txt variant="title2" style={{ fontVariant: ['tabular-nums'] }}>
          {Math.round(progress * 100)}%
        </Txt>
      </View>
      <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
        <Animated.View style={[styles.fill, { backgroundColor: c.primary }, bar]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 60, paddingHorizontal: space.l, borderRadius: radius.card, borderWidth: 1.5 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  reply: { flexDirection: 'row', gap: space.s, alignItems: 'flex-start', padding: space.m, borderRadius: radius.thumb },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 36 },
  checkDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  track: { width: '70%', height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
