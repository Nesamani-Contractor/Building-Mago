import { useEffect, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { BADGE_THRESHOLDS } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { fonts, radius, signatureGradient, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useSessions } from '@/data/sessions';
import { useLibrary } from '@/data/library';
import { useStreak } from '@/lib/hooks';
import { useRoutine } from '@/lib/routines';
import { track } from '@/services/analytics';

const LINES = ['Look complete. You glow.', 'Done — and beautifully.', 'That’s the look.', 'Finished. Gorgeous work.'];

/** S-17 Completion: the one signature celebration + before/after reveal (full-strength gradient allowed). */
export default function Complete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const session = useSessions((s) => (id ? s.sessions[id] : undefined));
  const patch = useSessions((s) => s.patch);
  const routine = useRoutine(session?.routineId);
  const saved = useLibrary((s) => (session ? s.items[session.routineId] : undefined));
  const update = useLibrary((s) => s.update);
  const streak = useStreak();
  const [rating, setRating] = useState(session?.rating ?? 0);
  const [note, setNote] = useState(session?.note ?? '');
  const [pos, setPos] = useState(0.5);
  const [w, setW] = useState(1);
  // Vary the celebration line per session, deterministically.
  const line = LINES[(id ?? '').split('').reduce((n, ch) => n + ch.charCodeAt(0), 0) % LINES.length] as string;

  useEffect(() => {
    if (streak.thisWeekMet && streak.thisWeekCount === streak.weeklyGoal) {
      haptic.success();
      track('streak_week_met', { goal: streak.weeklyGoal });
    }
    if ((BADGE_THRESHOLDS as readonly number[]).includes(streak.lifetimeLooks)) track('badge_earned', { looks: streak.lifetimeLooks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setPos(Math.min(1, Math.max(0, e.nativeEvent.locationX / w))),
        onPanResponderMove: (e) => setPos(Math.min(1, Math.max(0, e.nativeEvent.locationX / w))),
      }),
    [w],
  );

  if (!session || !routine) return <Redirect href="/(tabs)" />;

  const hasPhotos = !!(session.beforePhoto && session.afterPhoto);

  function save() {
    patch(session!.id, { rating: rating || undefined, note: note.trim() || undefined });
    if (rating) update(routine!.id, { rating });
  }

  return (
    <Screen
      mood="reveal"
      footer={
        <View style={{ gap: space.s }}>
          <Button
            variant="hero"
            label="Make a share card"
            icon="share"
            onPress={() => {
              save();
              router.push(`/share/${routine.id}?session=${session.id}`);
            }}
          />
          <View style={{ flexDirection: 'row', gap: space.m }}>
            <Button
              variant="secondary"
              label="Plan it again"
              onPress={() => {
                save();
                router.push(`/plan/${routine.id}`);
              }}
              style={{ flex: 1 }}
            />
            <Button
              variant="secondary"
              label="Done"
              onPress={() => {
                save();
                router.replace('/(tabs)');
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      }
    >
      <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(14)} style={{ alignItems: 'center', gap: space.s, marginTop: space.x4 }}>
        <Txt variant="title1" align="center" accessibilityRole="header" accessibilityLiveRegion="polite">
          {line}
        </Txt>
        <Txt variant="callout" tone="secondary" align="center">
          {routine.title} · done {saved?.doneCount ?? 1} {saved?.doneCount === 1 ? 'time' : 'times'}
        </Txt>
      </Animated.View>

      <View
        style={styles.reveal}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        {...(hasPhotos ? pan.panHandlers : {})}
        accessible
        accessibilityRole={hasPhotos ? 'adjustable' : 'image'}
        accessibilityLabel={hasPhotos ? 'Before and after comparison' : 'Celebration'}
        accessibilityValue={hasPhotos ? { text: `${Math.round(pos * 100)} percent after` } : undefined}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') setPos((p) => Math.min(1, p + 0.1));
          if (e.nativeEvent.actionName === 'decrement') setPos((p) => Math.max(0, p - 0.1));
        }}
        accessibilityActions={hasPhotos ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      >
        <LinearGradient colors={signatureGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {hasPhotos ? (
          <>
            <Image source={{ uri: session.beforePhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={[StyleSheet.absoluteFill, { width: `${pos * 100}%`, overflow: 'hidden' }]}>
              <Image source={{ uri: session.afterPhoto }} style={{ width: w, height: '100%' }} contentFit="cover" />
            </View>
            <View style={[styles.divider, { left: `${pos * 100}%`, backgroundColor: c.surface }]} />
            <View style={[styles.handle, { left: `${pos * 100}%`, backgroundColor: c.surface }]}>
              <Icon name="chevronLeft" size={14} />
              <Icon name="chevronRight" size={14} />
            </View>
            <View style={[styles.tag, { left: space.m, backgroundColor: c.glass }]}>
              <Txt variant="caption">After</Txt>
            </View>
            <View style={[styles.tag, { right: space.m, backgroundColor: c.glass }]}>
              <Txt variant="caption">Before</Txt>
            </View>
          </>
        ) : (
          <View style={styles.center}>
            <View style={[styles.badge, { borderColor: c.accent, backgroundColor: c.glass }]}>
              <Icon name="sparkle" size={34} />
            </View>
            <Txt variant="callout" align="center" style={{ maxWidth: 240 }}>
              Next time, add a before photo to see your reveal here.
            </Txt>
          </View>
        )}
      </View>

      <Card style={[styles.row, { marginTop: space.l }]}>
        <Icon name={streak.thisWeekMet ? 'check' : 'star'} size={22} />
        <Txt variant="headline" style={{ flex: 1 }}>
          {streak.thisWeekMet ? `${streak.thisWeekCount} of ${streak.weeklyGoal} this week — goal met` : `${streak.thisWeekCount} of ${streak.weeklyGoal} looks this week`}
        </Txt>
      </Card>

      <Card style={{ marginTop: space.l, gap: space.m }}>
        <Txt variant="headline">How did it turn out?</Txt>
        <View style={styles.stars} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <PressableScale
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ checked: rating === n }}
              accessibilityLabel={`${n} of 5`}
              onPress={() => {
                haptic.select();
                setRating(n);
              }}
              style={styles.star}
            >
              <Icon name="star" size={30} filled={n <= rating} />
            </PressableScale>
          ))}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Add a note for next time (only you see this)"
          placeholderTextColor={c.inkSecondary}
          accessibilityLabel="Note for next time"
          style={[styles.note, { color: c.ink, borderColor: c.hairlineStrong }]}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  reveal: { height: 340, borderRadius: radius.card, overflow: 'hidden', marginTop: space.xxl },
  divider: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  handle: { position: 'absolute', top: 148, width: 44, height: 44, borderRadius: 22, marginLeft: -22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', bottom: space.m, borderRadius: radius.chip, paddingHorizontal: space.s, paddingVertical: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.l },
  badge: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  stars: { flexDirection: 'row', gap: space.xs },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  note: { borderWidth: 1, borderRadius: radius.chip, minHeight: 72, maxHeight: 120, padding: space.m, fontFamily: fonts.sans, fontSize: 17, textAlignVertical: 'top' },
});
