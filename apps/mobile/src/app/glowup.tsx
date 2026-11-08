import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card } from '@/components/Surface';
import { Chip } from '@/components/Bits';
import { StateView } from '@/components/States';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useSessions } from '@/data/sessions';
import { findRoutine } from '@/lib/routines';

/** M-42 Glow-up timeline: chronological pairs, filter by look, compare any two. Private, on-device. */
export default function GlowUp() {
  const { c } = useTheme();
  const sessions = useSessions((s) => s.sessions);
  const [filter, setFilter] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[]>([]);

  const entries = useMemo(
    () =>
      Object.values(sessions)
        .filter((s) => s.completedAt && (s.beforePhoto || s.afterPhoto))
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [sessions],
  );
  const routineIds = [...new Set(entries.map((e) => e.routineId))];
  const shown = filter ? entries.filter((e) => e.routineId === filter) : entries;
  const pair = compare.map((id) => sessions[id]).filter(Boolean);

  function toggle(id: string) {
    haptic.select();
    setCompare((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-1), id]));
  }

  return (
    <Screen header={<TopBar title="Glow-up timeline" />}>
      {entries.length === 0 ? (
        <StateView icon="camera" title="No photos yet" body="When you start a look, take an optional before photo. Your after photo completes the pair. Everything stays on this phone." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.l }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.s }}>
            <Chip label="All looks" selected={!filter} onPress={() => setFilter(null)} />
            {routineIds.map((id) => (
              <Chip key={id} label={findRoutine(id)?.title ?? 'Look'} selected={filter === id} onPress={() => setFilter(id)} />
            ))}
          </ScrollView>

          {pair.length === 2 ? (
            <Card style={{ marginTop: space.l, gap: space.m }}>
              <Txt variant="headline">Side by side</Txt>
              <View style={styles.pair}>
                {pair.map((s) => (
                  <View key={s!.id} style={{ flex: 1, gap: space.xs }}>
                    <Image source={{ uri: s!.afterPhoto ?? s!.beforePhoto }} style={[styles.big, { backgroundColor: c.surfaceAlt }]} contentFit="cover" accessibilityLabel="Look photo" />
                    <Txt variant="footnote" tone="secondary">
                      {new Date(s!.completedAt as string).toLocaleDateString()}
                    </Txt>
                  </View>
                ))}
              </View>
            </Card>
          ) : (
            <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
              Tap any two photos to compare them.
            </Txt>
          )}

          <View style={{ gap: space.l, marginTop: space.l }}>
            {shown.map((s) => (
              <Card key={s.id} style={{ gap: space.m }}>
                <Txt variant="headline">{findRoutine(s.routineId)?.title ?? 'Look'}</Txt>
                <Txt variant="footnote" tone="secondary">
                  {new Date(s.completedAt as string).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </Txt>
                <PressableScale accessibilityLabel="Select for comparison" accessibilityState={{ selected: compare.includes(s.id) }} onPress={() => toggle(s.id)} style={styles.pair}>
                  {[s.beforePhoto, s.afterPhoto].map((uri, i) => (
                    <View key={i} style={[styles.thumbWrap, compare.includes(s.id) && { borderColor: c.primary }]}>
                      {uri ? (
                        <Image source={{ uri }} style={styles.thumb} contentFit="cover" accessibilityLabel={i === 0 ? 'Before' : 'After'} />
                      ) : (
                        <View style={[styles.thumb, { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                          <Txt variant="footnote" tone="secondary">
                            No {i === 0 ? 'before' : 'after'}
                          </Txt>
                        </View>
                      )}
                    </View>
                  ))}
                </PressableScale>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: space.s },
  big: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.thumb },
  thumbWrap: { flex: 1, borderRadius: radius.thumb + 2, borderWidth: 2, borderColor: 'transparent' },
  thumb: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.thumb },
});
