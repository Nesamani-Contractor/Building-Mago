import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Linking, PanResponder, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInLeft, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { Ambient } from '@/components/Ambient';
import { Txt } from '@/components/Txt';
import { Eyebrow, LookPhoto } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PhotoCapture } from '@/components/PhotoCapture';
import { StepProducts } from '@/components/StepProducts';
import { useBagCheck } from '@/components/BagCheck';
import { PressableScale } from '@/components/PressableScale';
import { StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { layout, palette, radius, space } from '@/design/tokens';
import { routineImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { useRoutine } from '@/lib/routines';
import { useSessions } from '@/data/sessions';
import { usePrefs } from '@/data/prefs';
import { useProfile, showHintsByDefault } from '@/data/profile';
import { useLibrary } from '@/data/library';
import { speak, stopSpeaking, voiceCommandsAvailable } from '@/services/voice';
import { track } from '@/services/analytics';

type Phase = 'before' | 'steps' | 'after';

/** S-14 → S-15 → S-16. The hero screen: one step at a time, readable at arm's length. */
export default function FollowAlong() {
  useKeepAwake();
  const { id, session: resumeId } = useLocalSearchParams<{ id: string; session?: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const routine = useRoutine(id);
  const sessions = useSessions((s) => s.sessions);
  const start = useSessions((s) => s.start);
  const patch = useSessions((s) => s.patch);
  const prefs = usePrefs();
  const skill = useProfile((s) => s.skill);
  const markDone = useLibrary((s) => s.markDone);

  const [sessionId] = useState(() => (resumeId && sessions[resumeId] ? resumeId : id ? start(id) : ''));
  const session = sessions[sessionId];
  const [phase, setPhase] = useState<Phase>(() => (session && session.stepIndex > 0 ? 'steps' : 'before'));
  const [idx, setIdx] = useState(session?.stepIndex ?? 0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [showHint, setShowHint] = useState(showHintsByDefault(skill));
  // Timer belongs to one step; moving to another step resets it without an extra effect.
  const [timerState, setTimerState] = useState<{ idx: number; left: number } | null>(null);
  const timer = timerState && timerState.idx === idx ? timerState.left : null;

  const steps = useMemo(() => routine?.sections.flatMap((s) => s.steps.map((st) => ({ ...st, section: s.name }))) ?? [], [routine]);
  const products = useMemo(() => new Map(routine?.products.map((p) => [p.ref, p]) ?? []), [routine]);
  const { check: bagCheck } = useBagCheck(routine);
  const bagMatches = useMemo(() => (bagCheck ? new Map(bagCheck.matches.map((m) => [m.product.ref, m])) : undefined), [bagCheck]);
  const step = steps[idx];
  const isWide = width >= 900 && width > height;

  // Previous photo of this look, for the ghost overlay.
  const ghost = useMemo(() => {
    const prev = Object.values(sessions)
      .filter((s) => s.routineId === id && s.completedAt && s.beforePhoto)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0];
    return prev;
  }, [sessions, id]);

  useEffect(() => {
    if (routine) track('fa_started', { steps: steps.length });
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'steps' && step && prefs.readAloud) speak(step.text);
  }, [phase, idx, step, prefs.readAloud]);

  // Countdown for steps that need waiting.
  useEffect(() => {
    if (timer === null || timer <= 0) return;
    const t = setTimeout(() => setTimerState((x) => (x ? { ...x, left: x.left - 1 } : x)), 1000);
    if (timer === 1) haptic.step();
    return () => clearTimeout(t);
  }, [timer]);

  if (!routine || !sessionId) {
    return (
      <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <StateView icon="info" title="This look isn’t available" body="It may have been removed." actionLabel="Go back" onAction={() => router.back()} />
      </View>
    );
  }

  function go(to: number, input: 'tap' | 'swipe' | 'voice' = 'tap') {
    if (to < 0) return;
    if (to >= steps.length) {
      stopSpeaking();
      // After photo only if she took a before photo (keeps the reveal matched).
      if (session?.beforePhoto) setPhase('after');
      else finish();
      return;
    }
    setDir(to > idx ? 1 : -1);
    setIdx(to);
    patch(sessionId, { stepIndex: to });
    if (to > idx) {
      haptic.step();
      track('fa_step_advanced', { input, step: to + 1 });
    }
  }

  function finish() {
    const at = new Date().toISOString();
    patch(sessionId, { completedAt: at, stepIndex: steps.length - 1 });
    markDone(routine!.id, at);
    haptic.success();
    track('fa_completed', { steps: steps.length });
    router.replace(`/complete/${sessionId}`);
  }

  function close() {
    stopSpeaking();
    if (idx === 0 && phase !== 'steps') patch(sessionId, { abandoned: true });
    else if (phase === 'steps') track('fa_abandoned', { step: idx + 1 });
    router.back();
  }

  const glass = { backgroundColor: c.glassOnPhoto };
  const closeButton = (
    <PressableScale accessibilityLabel="Pause and close. You can resume for 7 days." onPress={close} style={[styles.round, glass]}>
      <Icon name="close" size={20} color={c.inkOnPhoto} />
    </PressableScale>
  );

  if (phase === 'before' || phase === 'after') {
    return (
      <View style={[styles.fill, { backgroundColor: c.bg }]}>
        <Ambient mood="calm" />
        <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
          <PressableScale accessibilityLabel="Close" onPress={close} style={styles.round}>
            <Icon name="close" size={22} />
          </PressableScale>
        </View>
        <View style={[styles.column, { flex: 1, paddingBottom: insets.bottom + space.l }]}>
          <PhotoCapture
            title={phase === 'before' ? 'Before you start' : 'Your after'}
            body={phase === 'before' ? 'A quick before photo for your glow-up. Optional, and it stays on your phone.' : 'Same spot, same light — then see the reveal.'}
            ghostUri={phase === 'after' ? session?.beforePhoto : ghost?.beforePhoto}
            onCapture={(uri) => {
              track('fa_photo_taken', { kind: phase });
              if (phase === 'before') {
                patch(sessionId, { beforePhoto: uri });
                setPhase('steps');
              } else {
                patch(sessionId, { afterPhoto: uri });
                finish();
              }
            }}
            onSkip={() => (phase === 'before' ? setPhase('steps') : finish())}
          />
        </View>
      </View>
    );
  }

  if (!step) return null;
  const entering = reduced ? FadeIn.duration(150) : dir > 0 ? SlideInRight.duration(250) : SlideInLeft.duration(250);
  const canWatch = routine.source.platform === 'youtube' && step.timestampSec !== undefined && !!routine.source.videoId;
  const watch = () => Linking.openURL(`https://www.youtube.com/watch?v=${routine.source.videoId}&t=${step.timestampSec}s`);
  const isLast = idx === steps.length - 1;
  const stepProducts = step.productRefs.map((ref) => products.get(ref)).filter((p): p is NonNullable<typeof p> => !!p);

  const media = (
    <View style={[styles.media, isWide ? styles.mediaWide : { height: Math.round(height * 0.5) }]}>
      <LookPhoto image={routineImage(routine)} style={StyleSheet.absoluteFill} accessibilityLabel={`${routine.title}, ${step.section}`} />
      <LinearGradient colors={['rgba(10,6,8,0.45)', 'rgba(10,6,8,0)']} style={styles.mediaTopScrim} />
      <View style={[styles.mediaTop, { top: (isWide ? space.xl : insets.top) + space.s }]}>
        <View style={styles.segments} accessibilityElementsHidden>
          {steps.map((s, i) => (
            <View key={s.id} style={[styles.segment, { backgroundColor: i <= idx ? c.inkOnPhoto : 'rgba(255,248,244,0.35)' }]} />
          ))}
        </View>
        <View style={styles.mediaBar}>
          {closeButton}
          <Txt variant="subhead" style={{ color: c.inkOnPhoto, fontWeight: '600' }} accessibilityLabel={`Step ${idx + 1} of ${steps.length}`}>
            Step {idx + 1} of {steps.length}
          </Txt>
          <PressableScale
            accessibilityLabel={prefs.readAloud ? 'Read-aloud is on. Turn it off' : 'Turn on read-aloud'}
            accessibilityState={{ selected: prefs.readAloud }}
            onPress={() => {
              if (prefs.readAloud) stopSpeaking();
              prefs.set({ readAloud: !prefs.readAloud });
              haptic.select();
            }}
            style={[styles.round, prefs.readAloud ? { backgroundColor: c.inkOnPhoto } : glass]}
          >
            <Icon name="speaker" size={20} color={prefs.readAloud ? palette.plum : c.inkOnPhoto} />
          </PressableScale>
        </View>
      </View>
      <View style={[styles.mediaBottom, { bottom: isWide ? space.xl : space.x5 }]}>
        {canWatch ? (
          <PressableScale accessibilityLabel="Watch this step in YouTube" onPress={watch} style={[styles.watch, glass]}>
            <Icon name="play" size={16} color={c.inkOnPhoto} filled />
            <Txt variant="subhead" style={{ color: c.inkOnPhoto, fontWeight: '600' }}>
              Watch this step
            </Txt>
          </PressableScale>
        ) : (
          <PressableScale accessibilityLabel="Read this step again" onPress={() => speak(step.text)} style={[styles.round, glass]}>
            <Icon name="refresh" size={20} color={c.inkOnPhoto} />
          </PressableScale>
        )}
      </View>
    </View>
  );

  const stepBody = (
    <Animated.View key={idx} entering={entering} style={{ gap: space.s }}>
      <Eyebrow>{step.section}</Eyebrow>
      <Txt variant="step" style={isWide ? { fontSize: 38, lineHeight: 44 } : undefined} accessibilityRole="header" accessibilityLiveRegion="polite">
        {step.text}
      </Txt>
      {step.hint ? (
        showHint ? (
          <PressableScale accessibilityLabel="Hide tip" onPress={() => setShowHint(false)} scaleTo={0.99}>
            <Txt variant="body" tone="secondary" style={{ marginTop: 2 }}>
              {step.hint}
            </Txt>
          </PressableScale>
        ) : (
          <PressableScale accessibilityLabel="Show tip" onPress={() => setShowHint(true)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Txt variant="subhead" style={{ color: c.primary }}>
              Show tip
            </Txt>
          </PressableScale>
        )
      ) : null}
      {stepProducts.length > 0 ? (
        <View style={{ marginTop: space.l }}>
          <StepProducts note matches={bagMatches} size={isWide ? 'l' : 'm'} products={stepProducts} />
        </View>
      ) : null}
    </Animated.View>
  );

  const timerRunning = timer !== null && timer > 0;
  const controls = (
    <View style={{ gap: space.s }}>
      {step.waitSec && timer === null ? (
        <PressableScale
          accessibilityLabel={`Start a ${step.waitSec} second timer`}
          onPress={() => {
            haptic.select();
            setTimerState({ idx, left: step.waitSec ?? 0 });
          }}
          style={styles.timerLink}
        >
          <Icon name="clock" size={18} color={c.primary} />
          <Txt variant="subhead" style={{ color: c.primary, fontWeight: '600' }}>
            Start {step.waitSec}s timer
          </Txt>
        </PressableScale>
      ) : null}
      {voiceCommandsAvailable ? (
        <Txt variant="footnote" tone="secondary" align="center">
          Say “next”, “back” or “repeat”
        </Txt>
      ) : null}
      <View style={styles.controls}>
        <PressableScale
          accessibilityLabel="Previous step"
          disabled={idx === 0}
          onPress={() => go(idx - 1)}
          style={[styles.back, { backgroundColor: c.surfaceAlt }]}
        >
          <Icon name="chevronLeft" size={22} />
        </PressableScale>
        <PressableScale
          accessibilityLabel={
            timerRunning ? `${isLast ? 'Finish the look' : 'Next step'}, ${timer} seconds left on this step` : isLast ? 'Finish the look' : 'Next step'
          }
          onPress={() => go(idx + 1)}
          style={[styles.next, { backgroundColor: c.primary }]}
        >
          {timerRunning ? <TimerRing left={timer ?? 0} total={step.waitSec ?? 1} color={c.inkOnPrimary} /> : null}
          <Txt variant="button" style={{ color: c.inkOnPrimary }}>
            {isLast ? 'Finish the look' : 'Next step'}
          </Txt>
        </PressableScale>
      </View>
    </View>
  );

  if (isWide) {
    return (
      <SwipeArea style={[styles.fill, styles.wideRow, { backgroundColor: c.bg, paddingTop: insets.top + space.l, paddingBottom: insets.bottom + space.l }]} onNext={() => go(idx + 1, 'swipe')} onBack={() => go(idx - 1, 'swipe')}>
        {media}
        <View style={styles.widePanel}>
          <View style={{ flex: 1, justifyContent: 'center' }}>{stepBody}</View>
          {steps[idx + 1] ? (
            <View style={{ gap: space.xs, marginBottom: space.xl }}>
              <Eyebrow>Coming up</Eyebrow>
              <Txt variant="callout" tone="secondary" numberOfLines={2}>
                {steps[idx + 1]?.text}
              </Txt>
            </View>
          ) : null}
          {controls}
        </View>
      </SwipeArea>
    );
  }

  return (
    <SwipeArea style={[styles.fill, { backgroundColor: '#000' }]} onNext={() => go(idx + 1, 'swipe')} onBack={() => go(idx - 1, 'swipe')}>
      {media}
      <View style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + space.l }]}>
        <View style={[styles.column, { flex: 1 }]}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: space.x3 - 4, paddingBottom: space.l }} showsVerticalScrollIndicator={false}>
            {stepBody}
          </ScrollView>
          {controls}
        </View>
      </View>
    </SwipeArea>
  );
}

/** Countdown ring that lives inside the Next button. */
function TimerRing({ left, total, color }: { left: number; total: number; color: string }) {
  const size = 30;
  const r = 13;
  const circ = 2 * Math.PI * r;
  const frac = total > 0 ? left / total : 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={15} cy={15} r={r} stroke={color} strokeOpacity={0.25} strokeWidth={2} fill="none" />
        <Circle
          cx={15}
          cy={15}
          r={r}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ * (1 - frac)}
          transform="rotate(-90 15 15)"
        />
      </Svg>
      <Txt variant="caption" style={{ color, fontSize: 9, lineHeight: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {mm}:{ss}
      </Txt>
    </View>
  );
}

/** Swipe left/right to move between steps. */
function SwipeArea({ onNext, onBack, style, children }: { onNext: () => void; onBack: () => void; style: StyleProp<ViewStyle>; children: ReactNode }) {
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -60) onNext();
          else if (g.dx > 60) onBack();
        },
      }),
    [onNext, onBack],
  );
  return (
    <View style={style} {...pan.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.xl },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  round: { width: layout.tapMin, height: layout.tapMin, borderRadius: layout.tapMin / 2, alignItems: 'center', justifyContent: 'center' },
  media: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  mediaWide: { flex: 1, borderRadius: radius.sheet, borderCurve: 'continuous' },
  mediaTopScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
  mediaTop: { position: 'absolute', left: space.l, right: space.l, gap: 14 },
  mediaBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mediaBottom: { position: 'absolute', left: space.l },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  watch: { flexDirection: 'row', alignItems: 'center', gap: space.s, borderRadius: radius.pill, paddingHorizontal: space.l, minHeight: 44 },
  sheet: { flex: 1, marginTop: -24, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, borderCurve: 'continuous' },
  timerLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 },
  controls: { flexDirection: 'row', gap: space.m, alignItems: 'center' },
  back: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  next: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.m, paddingHorizontal: space.xl },
  wideRow: { flexDirection: 'row', gap: space.x4, paddingHorizontal: space.x4 },
  widePanel: { width: 440, justifyContent: 'space-between' },
});
