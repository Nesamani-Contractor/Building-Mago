import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Linking, PanResponder, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, SlideInLeft, SlideInRight, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { Ambient } from '@/components/Ambient';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon } from '@/components/Icon';
import { PhotoCapture } from '@/components/PhotoCapture';
import { StepProducts } from '@/components/StepProducts';
import { ProductArt } from '@/components/ProductArt';
import { FrostedIconButton } from '@/components/Rose';
import { useBagCheck } from '@/components/BagCheck';
import { PressableScale } from '@/components/PressableScale';
import { StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { fonts, layout, palette, radius, softShadow, space } from '@/design/tokens';
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
  const [showSteps, setShowSteps] = useState(false);
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

  /** Before/after photo screens: just a close button (the step header lives on the stage). */
  const top = (
    <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
      <PressableScale accessibilityLabel="Pause and close. You can resume for 7 days." onPress={close} style={[styles.round, { backgroundColor: c.surface }, softShadow(c)]}>
        <Icon name="close" size={20} />
      </PressableScale>
    </View>
  );

  if (phase === 'before' || phase === 'after') {
    return (
      <View style={[styles.fill, { backgroundColor: c.bg }]}>
        <Ambient mood="calm" />
        {top}
        <View style={[styles.column, { flex: 1, paddingBottom: insets.bottom + space.l }]}>
          <PhotoCapture
            title={phase === 'before' ? 'Before you start' : 'Your after'}
            body={phase === 'before' ? 'A quick before photo for your glow-up. Optional, private, on your phone.' : 'Same spot, same light — then see the reveal.'}
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
  const stepProducts = step.productRefs.map((ref) => products.get(ref)).filter((p): p is NonNullable<typeof p> => !!p);
  const canWatch = routine.source.platform === 'youtube' && step.timestampSec !== undefined && !!routine.source.videoId;
  const stageH = isWide ? undefined : Math.round(height * 0.42);
  const artSize = Math.min(isWide ? 220 : 150, (stageH ?? 400) * 0.48);

  /** Rose stage: the step's products, drawn large in their shades, with frosted controls on top. */
  const stage = (
    <LinearGradient colors={[palette.stageTop, palette.stageBottom]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={isWide ? styles.stageWide : [styles.stage, { height: stageH }]}>
      <View style={[styles.stageTop, { paddingTop: insets.top + space.s }]}>
        <View style={styles.segments} accessibilityElementsHidden>
          {steps.map((s, i) => (
            <View key={s.id} style={[styles.segment, { backgroundColor: i <= idx ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }]} />
          ))}
        </View>
        <View style={styles.topRow}>
          <FrostedIconButton icon="close" label="Pause and close. You can resume for 7 days." onPress={close} />
          <Txt variant="headline" style={{ color: '#FFFFFF' }} accessibilityLabel={`Step ${idx + 1} of ${steps.length}`}>
            Step {idx + 1} of {steps.length}
          </Txt>
          <FrostedIconButton
            icon="speaker"
            label={prefs.readAloud ? 'Turn off read-aloud' : 'Turn on read-aloud'}
            selected={prefs.readAloud}
            onPress={() => {
              if (prefs.readAloud) stopSpeaking();
              prefs.set({ readAloud: !prefs.readAloud });
            }}
          />
        </View>
      </View>

      <Animated.View key={`art-${idx}`} entering={reduced ? FadeIn.duration(150) : ZoomIn.springify().damping(16)} style={styles.stageArt} accessibilityElementsHidden>
        {stepProducts.length > 0 ? (
          stepProducts.slice(0, 3).map((p, i, arr) => (
            <View key={p.ref} style={{ marginLeft: i === 0 ? 0 : -artSize * 0.3, transform: [{ rotate: arr.length > 1 ? `${(i - (arr.length - 1) / 2) * 12}deg` : '-6deg' }] }}>
              <ProductArt product={p} size={artSize} bare />
            </View>
          ))
        ) : (
          <View style={[styles.stageIcon, { width: artSize * 0.7, height: artSize * 0.7, borderRadius: artSize * 0.35 }]}>
            <Icon name="sparkle" size={artSize * 0.3} color="#FFFFFF" strokeWidth={1.2} />
          </View>
        )}
      </Animated.View>

      <View style={[styles.rail, isWide && { bottom: space.x4 }]}>
        {canWatch ? (
          <FrostedIconButton
            icon="play"
            label="Watch"
            showLabel
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${routine.source.videoId}&t=${step.timestampSec}s`)}
          />
        ) : null}
        {step.hint ? <FrostedIconButton icon="info" label="Tip" showLabel selected={showHint} onPress={() => setShowHint((v) => !v)} /> : null}
        <FrostedIconButton icon="list" label="Steps" showLabel selected={showSteps} onPress={() => setShowSteps((v) => !v)} />
      </View>
    </LinearGradient>
  );

  const sheet = (
    <Animated.View entering={reduced ? FadeIn.duration(150) : FadeInDown.springify().damping(18)} style={[styles.sheet, isWide ? styles.sheetWide : { marginTop: -radius.sheet }, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.l }]}>
      {!isWide ? <View style={[styles.handle, { backgroundColor: c.hairlineStrong }]} /> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space.l }} showsVerticalScrollIndicator={false}>
        <Animated.View key={idx} entering={entering} style={{ gap: space.l }}>
          <Txt variant="caption" tone="secondary" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {step.section}
            {step.waitSec ? ` · ${step.waitSec} sec` : ''}
          </Txt>
          <Txt variant="step" style={isWide ? { fontSize: 38, lineHeight: 44 } : undefined} accessibilityRole="header" accessibilityLiveRegion="polite">
            {step.text}
          </Txt>
          {step.hint && showHint ? (
            <View style={styles.coach}>
              <View style={[styles.coachBar, { backgroundColor: c.accent }]} />
              <Txt variant="callout" style={{ flex: 1 }}>
                <Txt variant="callout" style={{ fontFamily: fonts.sansSemibold }}>
                  Tip:{' '}
                </Txt>
                {step.hint}
              </Txt>
            </View>
          ) : null}
          <StepProducts note matches={bagMatches} size={isWide ? 'l' : 'm'} products={stepProducts} />
          {step.waitSec ? (
            <Card variant="outline" style={styles.timer}>
              <Icon name="clock" size={22} color={c.accentText} />
              <Txt variant="headline" style={{ flex: 1 }} accessibilityLiveRegion="polite">
                {timer === null ? `Wait ${step.waitSec} seconds` : timer > 0 ? `${timer} seconds left` : 'Ready for the next step'}
              </Txt>
              {timer === null ? <Button variant="secondary" label="Start timer" onPress={() => setTimerState({ idx, left: step.waitSec ?? 0 })} style={{ alignSelf: 'center', flexShrink: 0 }} /> : null}
            </Card>
          ) : null}
        </Animated.View>
      </ScrollView>
      <View style={{ gap: space.m }}>
        <View style={[styles.voice, { backgroundColor: c.tint }]}>
          <Icon name="mic" size={14} color={c.accentText} />
          <Txt variant="caption" style={{ color: c.accentText }}>
            {voiceCommandsAvailable ? 'Say “next”, “back” or “repeat”' : 'Swipe or tap. Voice commands come with the full app.'}
          </Txt>
        </View>
        <View style={styles.controls}>
          <PressableScale accessibilityLabel="Previous step" disabled={idx === 0} onPress={() => go(idx - 1)} style={[styles.back, { backgroundColor: c.tint, opacity: idx === 0 ? 0.5 : 1 }]}>
            <Icon name="chevronLeft" size={24} color={c.accentText} />
          </PressableScale>
          <Button variant="hero" large label={idx === steps.length - 1 ? 'Finish the look' : 'Next step'} onPress={() => go(idx + 1)} style={{ flex: 1 }} />
        </View>
      </View>
    </Animated.View>
  );

  const overview = showSteps ? (
    <Animated.View entering={FadeIn.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay, justifyContent: 'flex-end' }]}>
      <PressableScale accessibilityLabel="Close the step list" onPress={() => setShowSteps(false)} scaleTo={1} style={{ flex: 1 }} />
      <View style={[styles.overview, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.l }]}>
        <Txt variant="title3" accessibilityRole="header">
          All steps
        </Txt>
        <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={{ gap: space.xs, paddingTop: space.m }}>
          {steps.map((s, i) => (
            <PressableScale
              key={s.id}
              accessibilityLabel={`Go to step ${i + 1}: ${s.text}`}
              accessibilityState={{ selected: i === idx }}
              onPress={() => {
                setShowSteps(false);
                if (i !== idx) go(i);
              }}
              style={[styles.overRow, { backgroundColor: i === idx ? c.tint : 'transparent' }]}
            >
              <View style={[styles.overNum, { backgroundColor: i < idx ? c.accent : i === idx ? c.primary : c.tint }]}>
                {i < idx ? (
                  <Icon name="check" size={14} color="#FFFFFF" strokeWidth={2.2} />
                ) : (
                  <Txt variant="caption" style={{ color: i === idx ? c.inkOnPrimary : c.accentText, fontFamily: fonts.sansSemibold }}>
                    {i + 1}
                  </Txt>
                )}
              </View>
              <Txt variant="callout" style={{ flex: 1 }} numberOfLines={2}>
                {s.text}
              </Txt>
            </PressableScale>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  ) : null;

  return (
    <SwipeArea style={[styles.fill, { backgroundColor: c.bg }]} onNext={() => go(idx + 1, 'swipe')} onBack={() => go(idx - 1, 'swipe')}>
      {isWide ? (
        <View style={[styles.fill, { flexDirection: 'row' }]}>
          {stage}
          {sheet}
        </View>
      ) : (
        <>
          {stage}
          {sheet}
        </>
      )}
      {overview}
    </SwipeArea>
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
  stage: { width: '100%', overflow: 'hidden' },
  stageWide: { flex: 1, minWidth: 0, overflow: 'hidden' },
  stageTop: { paddingHorizontal: space.l, gap: space.m },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  stageArt: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: space.xxl },
  stageIcon: { backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', right: space.l, bottom: space.x4, gap: space.m, alignItems: 'center' },
  sheet: { flex: 1, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: space.xl, paddingTop: space.m },
  sheetWide: { flex: 0, flexShrink: 0, flexBasis: 520, width: 520, borderTopRightRadius: 0, borderBottomLeftRadius: radius.sheet, paddingTop: space.x4, paddingHorizontal: space.x3 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.l },
  coach: { flexDirection: 'row', gap: space.m },
  coachBar: { width: 2, borderRadius: 1 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  voice: { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'center', borderRadius: radius.pill, paddingHorizontal: space.l, paddingVertical: 6 },
  controls: { flexDirection: 'row', gap: space.m, alignItems: 'center' },
  back: { width: layout.tapMirror, height: layout.tapMirror, borderRadius: layout.tapMirror / 2, alignItems: 'center', justifyContent: 'center' },
  overview: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space.xl, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  overRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card, minHeight: 52 },
  overNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
