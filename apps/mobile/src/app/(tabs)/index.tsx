import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Occasion, Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Eyebrow, LookPhoto, stepCount } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import { OCCASION_PHOTO, photo, routineImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { useLibrary, IMPORT_STAGES, pinnedLooks } from '@/data/library';
import { Greeting, HeartButton, PinnedRow } from '@/components/LookActions';
import { TodayLook } from '@/components/TodayLook';
import { track } from '@/services/analytics';
import { useSessions, resumableSession } from '@/data/sessions';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { findRoutine } from '@/lib/routines';

const OCCASIONS: { id: Occasion; label: string }[] = [
  { id: 'Everyday', label: 'Everyday' },
  { id: 'Date night', label: 'Date night' },
  { id: 'Work', label: 'Work' },
  { id: 'Party', label: 'Party' },
  { id: 'Wedding/Event', label: 'Events' },
];

function difficulty(r: Routine): string {
  const n = stepCount(r);
  return n <= 6 ? 'Beginner' : 'Some practice';
}

/**
 * Home (v3, 12-video principles): conversational greeting, her look in progress (never at 0%),
 * real looks right away (no banner to tap first), occasions. Each section scrolls one way only.
 */
export default function Home() {
  const router = useRouter();
  const { c } = useTheme();
  const items = useLibrary((s) => s.items);
  const pinned = useMemo(() => pinnedLooks(items), [items]);
  const imports = useLibrary((s) => s.imports);
  const sessions = useSessions((s) => s.sessions);

  const resume = resumableSession(sessions);
  const resumeRoutine = resume ? findRoutine(resume.routineId) : undefined;
  const inFlight = Object.values(imports).filter((j) => j.status === 'processing' || j.status === 'pending_offline');
  const picks = useMemo(() => {
    const order = ['sample-soft-glam', 'sample-party-liner', 'sample-glossy-lips', 'sample-dewy-skin', 'sample-wedding-guest'];
    return order.map((id) => SAMPLE_ROUTINES.find((r) => r.id === id)).filter((r): r is Routine => !!r);
  }, []);
  const PINNED_PREVIEW = 3;

  return (
    <Screen mood="home" bottomInset={layout.tabBarSpace}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Greeting />
          <Txt variant="title1" accessibilityRole="header">
            What are we doing tonight?
          </Txt>
        </View>
        <PressableScale accessibilityLabel="Search your looks" onPress={() => router.push('/(tabs)/library')} style={[styles.round, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
          <Icon name="search" size={20} color={c.ink} />
        </PressableScale>
      </View>

      {/* D-27: today's look from her plan, ready to start. */}
      <TodayLook />

      {/* FR-PIN: her pinned looks, collapsed to 3, See all for the rest. */}
      <View style={styles.sectionHeadTop}>
        <View style={{ gap: 2, flex: 1 }}>
          <Eyebrow>Pinned</Eyebrow>
          <Txt variant="title3" accessibilityRole="header">
            You and your beauty
          </Txt>
        </View>
        {pinned.length > PINNED_PREVIEW ? (
          <PressableScale
            accessibilityLabel={`See all ${pinned.length} pinned looks`}
            onPress={() => {
              track('pinned_see_all', { count: pinned.length });
              router.push('/pinned');
            }}
            style={styles.seeAll}
          >
            <Txt variant="subhead" style={{ color: c.primary }}>
              See all ({pinned.length})
            </Txt>
          </PressableScale>
        ) : null}
      </View>
      {pinned.length ? (
        <View style={{ gap: space.s, marginTop: space.m }}>
          {pinned.slice(0, PINNED_PREVIEW).map((x) => (
            <PinnedRow key={x.routine.id} saved={x} onPress={() => router.push(`/routine/${x.routine.id}`)} />
          ))}
        </View>
      ) : (
        <PressableScale
          onPress={() => router.push('/(tabs)/library')}
          accessibilityLabel="Pin looks you love to keep them here. Opens your looks."
          scaleTo={0.985}
          style={[styles.pinEmpty, { backgroundColor: c.surface }]}
        >
          <Icon name="pin" size={20} color={c.primary} />
          <Txt variant="callout" tone="secondary" style={{ flex: 1 }}>
            Pin looks you love to keep them here.
          </Txt>
          <Icon name="chevronRight" size={18} color={c.inkSecondary} />
        </PressableScale>
      )}

      {inFlight.map((j) => (
        <PressableScale key={j.id} onPress={() => router.push(`/import/${j.id}`)} accessibilityLabel="Open the look being unveiled" style={[styles.card, { backgroundColor: c.surface, shadowColor: c.shadow }]}>
          <View style={[styles.cardIcon, { backgroundColor: c.surfaceAlt }]}>
            <Icon name={j.status === 'pending_offline' ? 'wifiOff' : 'sparkle'} size={22} color={c.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{j.status === 'pending_offline' ? 'Waiting for a connection' : 'Unveiling your look…'}</Txt>
            <Txt variant="footnote" tone="secondary">
              {j.status === 'pending_offline' ? 'We’ll start as soon as you’re online.' : IMPORT_STAGES[j.stage]}
            </Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.inkSecondary} />
        </PressableScale>
      ))}

      {resume && resumeRoutine ? (
        <PressableScale
          accessibilityLabel={`Pick up where you left off: ${resumeRoutine.title}, step ${resume.stepIndex + 1} of ${stepCount(resumeRoutine)}`}
          onPress={() => router.push(`/follow/${resumeRoutine.id}?session=${resume.id}`)}
          scaleTo={0.985}
          style={[styles.card, { backgroundColor: c.surface, shadowColor: c.shadow }]}
        >
          <LookPhoto image={routineImage(resumeRoutine)} style={styles.resumeThumb} />
          <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
            <Txt variant="footnote" tone="secondary">
              Pick up where you left off
            </Txt>
            <Txt variant="headline" numberOfLines={1}>
              {resumeRoutine.title}
            </Txt>
            <View style={styles.progressRow}>
              <View style={[styles.track, { backgroundColor: c.track }]}>
                <View style={[styles.fill, { backgroundColor: c.primary, width: `${Math.round(((resume.stepIndex + 1) / stepCount(resumeRoutine)) * 100)}%` }]} />
              </View>
              <Txt variant="footnote" style={{ color: c.primary, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                Step {resume.stepIndex + 1} of {stepCount(resumeRoutine)}
              </Txt>
            </View>
          </View>
          <View style={[styles.play, { backgroundColor: c.primary }]}>
            <Icon name="play" size={16} color={c.inkOnPrimary} filled />
          </View>
        </PressableScale>
      ) : null}

      <View style={styles.sectionHead}>
        <Txt variant="title3" accessibilityRole="header">
          Tonight’s picks
        </Txt>
        <PressableScale accessibilityLabel="See all looks" onPress={() => router.push('/(tabs)/discover')} style={styles.seeAll}>
          <Txt variant="subhead" style={{ color: c.primary }}>
            See all
          </Txt>
        </PressableScale>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railOuter} contentContainerStyle={styles.rail}>
        {picks.map((r) => (
          <PressableScale
            key={r.id}
            accessibilityLabel={`${r.title}. ${r.totalTimeMin} minutes, ${stepCount(r)} steps, ${difficulty(r)}`}
            onPress={() => {
              haptic.select();
              router.push(`/routine/${r.id}`);
            }}
            scaleTo={0.98}
            style={styles.pick}
          >
            <View>
              <LookPhoto image={routineImage(r)} style={styles.pickPhoto} />
              <View style={[styles.timeChip, { backgroundColor: c.glass }]}>
                <Txt variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
                  {r.totalTimeMin} min
                </Txt>
              </View>
              <HeartButton routine={r} onPhoto size={20} style={styles.heartOnPhoto} />
            </View>
            <View style={{ gap: 2 }}>
              <Txt variant="headline" numberOfLines={1}>
                {r.title}
              </Txt>
              <Txt variant="footnote" tone="secondary">
                {stepCount(r)} steps · {difficulty(r)}
              </Txt>
            </View>
          </PressableScale>
        ))}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Txt variant="title3" accessibilityRole="header">
          By occasion
        </Txt>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railOuter} contentContainerStyle={[styles.rail, { gap: space.l }]}>
        {OCCASIONS.map((o) => (
          <PressableScale key={o.id} accessibilityLabel={`${o.label} looks`} onPress={() => router.push(`/(tabs)/discover?occ=${encodeURIComponent(o.id)}`)} style={styles.occ}>
            <LookPhoto image={photo(OCCASION_PHOTO[o.id])} style={[styles.occPhoto, { backgroundColor: c.surfaceAlt }]} />
            <Txt variant="footnote" style={{ fontWeight: '500' }}>
              {o.label}
            </Txt>
          </PressableScale>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m, marginTop: space.s },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card, marginTop: space.xxl, shadowOpacity: 0.07, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardIcon: { width: 64, height: 64, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center' },
  resumeThumb: { width: 64, height: 64, borderRadius: radius.thumb },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sectionHeadTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: space.xxl },
  pinEmpty: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.thumb, marginTop: space.m, minHeight: 56 },
  heartOnPhoto: { position: 'absolute', right: 8, top: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.x4 },
  seeAll: { minHeight: 44, justifyContent: 'center', paddingLeft: space.m },
  railOuter: { marginHorizontal: -space.xl },
  rail: { paddingHorizontal: space.xl, gap: space.m, paddingTop: space.s },
  pick: { width: 220, gap: 10 },
  pickPhoto: { width: 220, height: 280, borderRadius: radius.card },
  timeChip: { position: 'absolute', left: 10, top: 10, height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  occ: { width: 72, alignItems: 'center', gap: space.s },
  occPhoto: { width: 72, height: 72, borderRadius: 36 },
});
