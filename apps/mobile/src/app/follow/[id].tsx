import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Linking, PanResponder, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInLeft, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import { needsCheck } from '@mago/shared';
import { Ambient } from '@/components/Ambient';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon } from '@/components/Icon';
import { PhotoCapture } from '@/components/PhotoCapture';
import { PressableScale } from '@/components/PressableScale';
import { StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
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

  const top = (
    <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
      <PressableScale accessibilityLabel="Pause and close. You can resume for 7 days." onPress={close} style={[styles.round, { backgroundColor: c.glass, borderColor: c.hairline }]}>
        <Icon name="close" size={20} />
      </PressableScale>
      {phase === 'steps' && step ? (
        <>
          <View style={[styles.sectionPill, { backgroundColor: c.glass, borderColor: c.hairline }]}>
            <Txt variant="subhead">{step.section}</Txt>
          </View>
          <Txt variant="headline" style={{ marginLeft: 'auto' }} accessibilityLabel={`Step ${idx + 1} of ${steps.length}`}>
            {idx + 1} of {steps.length}
          </Txt>
          <PressableScale
            accessibilityLabel={prefs.readAloud ? 'Turn off read-aloud' : 'Turn on read-aloud'}
            accessibilityState={{ selected: prefs.readAloud }}
            onPress={() => {
              if (prefs.readAloud) stopSpeaking();
              prefs.set({ readAloud: !prefs.readAloud });
            }}
            style={[styles.round, { backgroundColor: prefs.readAloud ? c.primary : c.glass, borderColor: c.hairline }]}
          >
            <Icon name="speaker" size={20} color={prefs.readAloud ? c.inkOnPrimary : c.ink} />
          </PressableScale>
        </>
      ) : null}
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

  const stepBody = (
    <Animated.View key={idx} entering={entering} style={{ gap: space.xl }}>
      {routine.source.platform === 'youtube' && step.timestampSec !== undefined && routine.source.videoId ? (
        <PressableScale
          accessibilityLabel="Watch this step in YouTube"
          onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${routine.source.videoId}&t=${step.timestampSec}s`)}
          style={[styles.watch, { backgroundColor: c.surface, borderColor: c.hairline }]}
        >
          <View style={[styles.watchIcon, { backgroundColor: c.primary }]}>
            <Icon name="play" size={14} color={c.inkOnPrimary} filled />
          </View>
          <Txt variant="subhead">Watch this step</Txt>
        </PressableScale>
      ) : null}
      <Txt variant="step" style={isWide ? { fontSize: 46, lineHeight: 54 } : undefined} accessibilityRole="header" accessibilityLiveRegion="polite">
        {step.text}
      </Txt>
      {step.hint ? (
        showHint ? (
          <PressableScale accessibilityLabel="Hide tip" onPress={() => setShowHint(false)} scaleTo={0.99}>
            <Txt variant="body" tone="secondary" style={isWide ? { fontSize: 22, lineHeight: 30 } : undefined}>
              {step.hint}
            </Txt>
          </PressableScale>
        ) : (
          <PressableScale accessibilityLabel="Show tip" onPress={() => setShowHint(true)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <Txt variant="subhead" style={{ textDecorationLine: 'underline', textDecorationColor: c.accent }}>
              Show tip
            </Txt>
          </PressableScale>
        )
      ) : null}
      {step.productRefs.length > 0 ? (
        <View style={styles.chips}>
          {step.productRefs.map((ref) => {
            const p = products.get(ref);
            if (!p) return null;
            const check = needsCheck(p);
            return (
              <View key={ref} style={[styles.product, { backgroundColor: check ? c.warningBg : c.surface, borderColor: c.hairline }]}>
                <Txt variant="subhead" tone={check ? 'warning' : 'ink'}>
                  {p.name}
                  {check ? ' · Check this' : ''}
                </Txt>
              </View>
            );
          })}
        </View>
      ) : null}
      {step.waitSec ? (
        <Card variant="outline" style={styles.timer}>
          <Icon name="clock" size={22} />
          <Txt variant="headline" style={{ flex: 1 }} accessibilityLiveRegion="polite">
            {timer === null ? `Wait ${step.waitSec} seconds` : timer > 0 ? `${timer} seconds left` : 'Ready for the next step'}
          </Txt>
          {timer === null ? <Button variant="secondary" label="Start timer" onPress={() => setTimerState({ idx, left: step.waitSec ?? 0 })} style={{ alignSelf: 'center', flexShrink: 0 }} /> : null}
        </Card>
      ) : null}
    </Animated.View>
  );

  const controls = (
    <View style={{ gap: space.m }}>
      <View style={[styles.voice, { backgroundColor: c.glass, borderColor: c.hairline }]}>
        <Icon name="mic" size={16} color={c.inkSecondary} />
        <Txt variant="footnote" tone="secondary">
          {voiceCommandsAvailable ? 'Say “next”, “back” or “repeat”' : 'Swipe or tap. Voice commands come with the full app.'}
        </Txt>
      </View>
      <View style={styles.controls}>
        <PressableScale accessibilityLabel="Previous step" disabled={idx === 0} onPress={() => go(idx - 1)} style={[styles.back, { backgroundColor: c.surface, borderColor: c.hairline }]}>
          <Icon name="chevronLeft" size={26} />
        </PressableScale>
        <Button large label={idx === steps.length - 1 ? 'Finish the look' : 'Next step'} onPress={() => go(idx + 1)} style={{ flex: 1 }} />
      </View>
    </View>
  );

  return (
    <SwipeArea style={[styles.fill, { backgroundColor: c.bg }]} onNext={() => go(idx + 1, 'swipe')} onBack={() => go(idx - 1, 'swipe')}>
      <Ambient mood="calm" height={height} />
      {top}
      <View style={[styles.segments, styles.column]} accessibilityElementsHidden>
        {steps.map((s, i) => (
          <View key={s.id} style={[styles.segment, { backgroundColor: i <= idx ? c.primary : c.track }]} />
        ))}
      </View>
      {isWide ? (
        <View style={[styles.wide, { paddingBottom: insets.bottom + space.xl }]}>
          <Card style={styles.side}>
            <Txt variant="caption" tone="secondary" style={{ letterSpacing: 1.2 }}>
              COMING UP
            </Txt>
            {steps.slice(idx + 1, idx + 4).map((s, k) => (
              <View key={s.id} style={{ flexDirection: 'row', gap: space.m }}>
                <Txt variant="headline">{idx + k + 2}</Txt>
                <Txt variant="callout" style={{ flex: 1 }}>
                  {s.text}
                </Txt>
              </View>
            ))}
            {idx + 1 >= steps.length ? <Txt variant="callout" tone="secondary">This is the last step.</Txt> : null}
          </Card>
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ flex: 1, justifyContent: 'center' }}>{stepBody}</View>
            {controls}
          </View>
        </View>
      ) : (
        <View style={[styles.column, { flex: 1, justifyContent: 'space-between', paddingBottom: insets.bottom + space.l }]}>
          <View style={{ flex: 1, justifyContent: 'center' }}>{stepBody}</View>
          {controls}
        </View>
      )}
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
  round: { width: layout.tapMin, height: layout.tapMin, borderRadius: layout.tapMin / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionPill: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.l, paddingVertical: space.s },
  segments: { flexDirection: 'row', gap: 4, marginTop: space.l },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  watch: { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, paddingLeft: 6, paddingRight: space.l, minHeight: 44 },
  watchIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  product: { borderRadius: radius.chip, borderWidth: 1, paddingHorizontal: space.m, paddingVertical: space.s },
  timer: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  voice: { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'center', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.l, paddingVertical: space.s },
  controls: { flexDirection: 'row', gap: space.m, alignItems: 'center' },
  back: { width: layout.tapMirror, height: layout.tapMirror, borderRadius: layout.tapMirror / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wide: { flex: 1, flexDirection: 'row', gap: space.x4, paddingHorizontal: space.x5, paddingTop: space.xl, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  side: { width: 380, gap: space.l, alignSelf: 'center' },
});

