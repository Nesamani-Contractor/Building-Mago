import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { checkBag } from '@mago/shared';
import { Ambient } from '@/components/Ambient';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { LookPhoto } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { RoundButton } from '@/components/Screen';
import { StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { layout, motion, radius, space } from '@/design/tokens';
import { routineImage, sectionImage, type LookImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { useRoutine } from '@/lib/routines';
import { useLibrary } from '@/data/library';
import { useBag } from '@/data/bag';
import { track } from '@/services/analytics';

const MAX_CARDS = 9;

function fmtTime(sec: number): string {
  if (sec < 60) return `${Math.max(15, Math.round(sec / 15) * 15)} sec`;
  const m = Math.round(sec / 30) / 2;
  return `${m % 1 === 0 ? m : m.toFixed(1)} min`;
}

/**
 * THE UNVEIL — one of only two hero moments (WOW v2 §4). The look card lifts and unfolds into its
 * step cards (spring, damping ≈ 0.8, staggered), the headline cross-fades to "Unveiled in N
 * steps.", then ONE gold shimmer sweeps the grid with a success haptic on the same frame.
 * Reduce Motion: cards fade into place, no shimmer. Tap a card to start at that step.
 */
export default function Unveil() {
  const { id, onboarding } = useLocalSearchParams<{ id: string; onboarding?: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const reduced = useReducedMotion();
  const routine = useRoutine(id);
  const saved = useLibrary((s) => (id ? s.items[id] : undefined));
  const save = useLibrary((s) => s.save);
  const bag = useBag((s) => s.items);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const shimmer = useSharedValue(0);

  const steps = useMemo(
    () => routine?.sections.flatMap((s) => s.steps.map((st) => ({ ...st, section: s.name }))) ?? [],
    [routine],
  );
  const cards = steps.slice(0, MAX_CARDS);
  const perStep = routine ? (routine.totalTimeMin * 60) / Math.max(1, steps.length) : 60;
  const check = routine && bag.length > 0 ? checkBag(routine.products, bag) : null;

  // Layout: 3-column grid inside the content column.
  const W = Math.min(winW, layout.maxContentWidth);
  const rows = Math.ceil(cards.length / 3);
  const gap = 12;
  const cardW = Math.floor((W - space.xl * 2 - gap * 2) / 3);
  // Space left for the grid after the header (≈250) and footer (onboarding ≈132, else ≈84).
  const footerH = (onboarding === '1' ? 132 : 84) + Math.max(insets.bottom, space.l);
  const roomH = winH - insets.top - space.s - 262 - footerH;
  const cardH = Math.max(104, Math.min(170, Math.floor((roomH - (rows - 1) * gap) / Math.max(1, rows))));
  const areaH = rows * cardH + (rows - 1) * gap;

  const finish = useCallback(() => {
    setDone(true);
    haptic.success();
    track('unveil_complete', { steps: steps.length });
  }, [steps.length]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const schedule = useCallback(() => {
    timers.current.forEach(clearTimeout);
    shimmer.set(0);
    timers.current = [
      setTimeout(() => {
        setOpen(true);
        const landMs = (Math.min(cards.length, MAX_CARDS) - 1) * 55 + 650;
        if (reduced) {
          timers.current.push(setTimeout(finish, 320));
        } else {
          shimmer.set(
            withDelay(
              landMs,
              withSequence(
                withTiming(0.0001, { duration: 0 }, () => runOnJS(finish)()),
                withTiming(1, { duration: 1300, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
              ),
            ),
          );
        }
      }, 450),
    ];
  }, [cards.length, finish, reduced, shimmer]);

  // On open: the look card lifts, then unfolds. Replay resets and runs it again.
  useEffect(() => {
    schedule();
    const t = timers;
    return () => t.current.forEach(clearTimeout);
  }, [schedule]);

  function play() {
    setDone(false);
    setOpen(false);
    schedule();
  }

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.get() === 0 ? 0 : interpolate(shimmer.get(), [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ translateX: interpolate(shimmer.get(), [0, 1], [-W, W]) }],
  }));

  if (!routine) {
    return (
      <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top + space.x5 }]}>
        <StateView icon="info" title="We can’t find that look" body="It may have been removed. Your other looks are safe." actionLabel="Go home" onAction={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const source = routine.source.platform === 'youtube' ? 'YouTube' : routine.source.platform === 'tiktok' ? 'TikTok' : routine.source.platform === 'instagram' ? 'Instagram' : null;
  const creator = routine.creator && routine.creator.name !== 'Mago sample' && routine.creator.name !== 'You' ? routine.creator.handle ?? routine.creator.name : null;
  const isOnboarding = onboarding === '1';

  function start() {
    if (!saved && routine) save(routine);
    router.push(`/brief/${routine!.id}`);
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <Ambient mood="calm" />
      <View style={[styles.column, { paddingTop: insets.top + space.s, flex: 1, overflow: 'hidden' }]}>
        <View style={styles.topBar}>
          <RoundButton icon={isOnboarding ? 'close' : 'chevronLeft'} label={isOnboarding ? 'Close sample' : 'Back'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <PressableScale accessibilityLabel="Replay the unveil" onPress={play} style={[styles.replay, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="refresh" size={14} color={c.ink} strokeWidth={1.8} />
            <Txt variant="caption" style={{ fontWeight: '600', fontSize: 13 }}>
              Replay
            </Txt>
          </PressableScale>
        </View>

        <Txt variant="eyebrow" tone="secondary" numberOfLines={1} style={{ marginTop: space.m, flexShrink: 0 }}>
          {routine.title}
          {source ? ` · ${source}` : ''}
        </Txt>
        <View style={styles.headline} accessibilityLiveRegion="polite">
          <Fade on={!done}>
            <Txt variant="display" tone="secondary">
              Unveiling your look…
            </Txt>
          </Fade>
          <Fade on={done}>
            <Txt variant="display" accessibilityRole="header">
              Unveiled in {steps.length} steps.
            </Txt>
          </Fade>
        </View>

        <View style={{ height: areaH, marginTop: space.l }}>
          {cards.map((st, i) => (
            <StepCard
              key={st.id}
              index={i}
              count={cards.length}
              open={open}
              reduced={reduced}
              cardW={cardW}
              cardH={cardH}
              gap={gap}
              areaW={W - space.xl * 2}
              areaH={areaH}
              image={sectionImage(st.section, routineImage(routine))}
              section={st.section}
              time={fmtTime(st.waitSec ?? perStep)}
              onPress={() => router.push(`/follow/${routine.id}?step=${i}`)}
            />
          ))}
          {!reduced ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: radius.card }]}>
              <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
                <LinearGradient
                  colors={['rgba(201,164,106,0)', 'rgba(201,164,106,0.42)', 'rgba(255,240,214,0.62)', 'rgba(201,164,106,0.42)', 'rgba(201,164,106,0)']}
                  locations={[0.3, 0.46, 0.5, 0.54, 0.7]}
                  start={{ x: 0, y: 0.35 }}
                  end={{ x: 1, y: 0.65 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          ) : null}
        </View>
        {steps.length > MAX_CARDS ? (
          <Txt variant="footnote" tone="secondary" style={{ marginTop: space.s }}>
            + {steps.length - MAX_CARDS} more steps inside
          </Txt>
        ) : null}

        <View style={styles.meta}>
          <View style={[styles.chip, { backgroundColor: c.surfaceAlt }]}>
            <Txt variant="caption" style={{ fontSize: 13 }}>
              {check ? `You have ${check.have + check.swaps} of ${routine.products.length}` : `${routine.products.length} products`}
            </Txt>
          </View>
          <View style={[styles.chip, { backgroundColor: c.surfaceAlt }]}>
            <Txt variant="caption" style={{ fontSize: 13 }}>
              {routine.totalTimeMin} min
            </Txt>
          </View>
        </View>
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.s }}>
          {creator ? `From @${creator.replace(/^@/, '')} · ` : source ? `From ${source} · ` : ''}Unveiled by Mago
        </Txt>
      </View>

      <View style={[styles.column, styles.footer, { paddingBottom: Math.max(insets.bottom, space.l) }]}>
        {isOnboarding ? (
          <View style={{ gap: space.xs }}>
            <Button
              label="Save this look"
              onPress={() => {
                if (!saved) save(routine);
                haptic.success();
                router.replace('/onboarding/age');
              }}
            />
            <Button variant="ghost" label="I already have an account" onPress={() => router.push('/onboarding/signin')} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: space.m }}>
            <PressableScale
              accessibilityLabel={saved ? 'Saved to your library' : 'Save this look'}
              accessibilityState={{ selected: !!saved }}
              onPress={() => {
                if (!saved) {
                  save(routine);
                  haptic.success();
                }
              }}
              style={[styles.saveBtn, { backgroundColor: c.surfaceAlt }]}
            >
              <Icon name="bookmark" size={22} color={saved ? c.primary : c.ink} filled={!!saved} />
            </PressableScale>
            <Button label="Start the look" onPress={start} style={{ flex: 1 }} />
          </View>
        )}
      </View>
    </View>
  );
}

function Fade({ on, children }: { on: boolean; children: React.ReactNode }) {
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    o.set(withTiming(on ? 1 : 0, { duration: on ? 260 : 200 }));
  }, [on, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]} importantForAccessibility={on ? 'auto' : 'no-hide-descendants'}>{children}</Animated.View>;
}

const STACK_ROT = [-9, -5, -2, 2, 5, 9, -6, 3, 7];
const GRID_ROT = [-1.5, 1, -1, 1.5, -1, 1.5, -1, 1, -1.5];

function StepCard({
  index,
  count,
  open,
  reduced,
  cardW,
  cardH,
  gap,
  areaW,
  areaH,
  image,
  section,
  time,
  onPress,
}: {
  index: number;
  count: number;
  open: boolean;
  reduced: boolean;
  cardW: number;
  cardH: number;
  gap: number;
  areaW: number;
  areaH: number;
  image: LookImage;
  section: string;
  time: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    if (open) p.set(reduced ? withTiming(1, { duration: 200 }) : withDelay(index * 55, withSpring(1, motion.unveil)));
    else p.set(withTiming(0, { duration: 220 }));
  }, [open, reduced, index, p]);

  const col = index % 3;
  const row = Math.floor(index / 3);
  const gx = col * (cardW + gap);
  const gy = row * (cardH + gap);
  const sx = (areaW - cardW) / 2;
  const sy = (areaH - cardH) / 2 + (index - (count - 1) / 2) * 2;

  const style = useAnimatedStyle(() => {
    const v = p.get();
    if (reduced) return { opacity: v, transform: [{ translateX: gx }, { translateY: gy }] };
    return {
      opacity: 1,
      transform: [
        { translateX: interpolate(v, [0, 1], [sx, gx]) },
        { translateY: interpolate(v, [0, 1], [sy, gy]) },
        { rotate: `${interpolate(v, [0, 1], [STACK_ROT[index % 9]!, GRID_ROT[index % 9]!])}deg` },
        { scale: interpolate(v, [0, 0.4, 1], [1.04, 1.06, 1]) },
      ],
    };
  });

  const photoH = Math.round(cardH * (cardH < 130 ? 0.58 : 0.66));
  return (
    <Animated.View style={[styles.card, { width: cardW, height: cardH, backgroundColor: c.surface, shadowColor: c.shadow, zIndex: index + 1 }, style]}>
      <PressableScale accessibilityLabel={`Step ${index + 1}, ${section}, ${time}. Start here`} onPress={onPress} scaleTo={0.96} style={{ flex: 1 }}>
        <LookPhoto image={image} style={{ height: photoH, borderTopLeftRadius: radius.thumb, borderTopRightRadius: radius.thumb }} />
        <View style={styles.cardText}>
          <Txt variant="eyebrow" tone="secondary" style={{ fontSize: 10, lineHeight: 12, letterSpacing: 1.2 }}>
            Step {index + 1}
          </Txt>
          <Txt variant="caption" numberOfLines={1} style={{ fontWeight: '600', fontSize: 14, lineHeight: 18 }}>
            {section}
          </Txt>
          {cardH >= 124 ? (
            <Txt variant="caption" tone="secondary" style={{ fontSize: 12 }}>
              {time}
            </Txt>
          ) : null}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

// Keep the type import used (SharedValue is referenced by Reanimated hooks above).
export type _UnveilShared = SharedValue<number>;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.xl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: -space.s },
  replay: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18 },
  headline: { height: 88, marginTop: space.xs, flexShrink: 0 },
  card: { position: 'absolute', left: 0, top: 0, borderRadius: radius.thumb, shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  cardText: { paddingHorizontal: 10, paddingTop: 7, gap: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.l },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center' },
  footer: { paddingTop: space.m },
  saveBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
