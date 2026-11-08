import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { Occasion, Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card } from '@/components/Surface';
import { Carousel, CircleTile, RoutineTile, SectionHeader, routineMeta } from '@/components/Bits';
import { Button } from '@/components/Button';
import { useTheme } from '@/design/theme';
import { layout, palette, radius, space } from '@/design/tokens';
import { useLibrary } from '@/data/library';
import { OCCASION_TILES, SAMPLE_ROUTINES } from '@/data/samples';
import { haptic } from '@/design/haptics';
import { track } from '@/services/analytics';
import type { IconName } from '@/components/Icon';

const OCC_ICON: Record<string, IconName> = {
  Everyday: 'star',
  Work: 'clock',
  'Date night': 'heart',
  Party: 'sparkle',
  'Wedding/Event': 'gift',
};

/** M-13 Discover: Ulta-style hero carousel, occasion circles, rails. One-tap save. */
export default function Discover() {
  const router = useRouter();
  const { isDark } = useTheme();
  const items = useLibrary((s) => s.items);
  const save = useLibrary((s) => s.save);
  const [occ, setOcc] = useState<Occasion | null>(null);

  const trending = SAMPLE_ROUTINES.slice(0, 3);
  const quick = SAMPLE_ROUTINES.filter((r) => r.totalTimeMin < 10);
  const byOcc = useMemo(() => (occ ? SAMPLE_ROUTINES.filter((r) => r.occasion.includes(occ)) : []), [occ]);
  const savedCats = new Set(Object.values(items).map((s) => s.routine.category));
  const because = SAMPLE_ROUTINES.filter((r) => savedCats.has(r.category) && !items[r.id]);

  function quickSave(r: Routine) {
    if (items[r.id]) return router.push(`/routine/${r.id}`);
    save(r);
    haptic.success();
    track('discover_saved', { category: r.category });
  }

  return (
    <Screen mood="warm" bottomInset={layout.tabBarSpace}>
      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.xl }}>
        Discover
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.xs, marginBottom: space.xl }}>
        Looks to try this week, reviewed by our team.
      </Txt>

      <Carousel<Routine>
        data={trending}
        height={236}
        render={(r) => (
          <View style={styles.hero}>
            <LinearGradient
              colors={isDark ? ['#3A2632', '#241720'] : [palette.champagne, '#F8E6DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1, justifyContent: 'flex-end', padding: space.xl, gap: space.s }}>
              <Card style={{ gap: space.s }}>
                <Txt variant="caption" tone="secondary">
                  Trending this week
                </Txt>
                <Txt variant="title3" numberOfLines={1}>
                  {r.title}
                </Txt>
                <View style={styles.heroRow}>
                  <Txt variant="footnote" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                    {routineMeta(r)}
                  </Txt>
                  <Button variant="secondary" label={items[r.id] ? 'Open' : 'Save'} onPress={() => quickSave(r)} style={{ alignSelf: 'center', flexShrink: 0 }} />
                </View>
              </Card>
            </View>
          </View>
        )}
      />

      <SectionHeader title="By occasion" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m, paddingTop: space.m }}>
        {OCCASION_TILES.map((o) => (
          <CircleTile key={o.occasion} label={o.label} icon={OCC_ICON[o.occasion] ?? 'star'} onPress={() => setOcc(occ === o.occasion ? null : o.occasion)} />
        ))}
      </ScrollView>
      {occ ? (
        <Card style={{ marginTop: space.l, gap: space.m }}>
          <Txt variant="headline">{occ}</Txt>
          {byOcc.length === 0 ? (
            <Txt variant="callout" tone="secondary">
              No looks here yet — check back soon.
            </Txt>
          ) : (
            <Rail>
              {byOcc.map((r) => (
                <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
              ))}
            </Rail>
          )}
        </Card>
      ) : null}

      <SectionHeader title="Quick looks" />
      <Txt variant="footnote" tone="secondary">
        Under 10 minutes · {quick.length} looks
      </Txt>
      <Rail>
        {quick.map((r) => (
          <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
        ))}
      </Rail>

      {because.length > 0 ? (
        <>
          <SectionHeader title="Because you saved" />
          <Rail>
            {because.map((r) => (
              <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}

      <SectionHeader title="All looks" />
      <Rail>
        {SAMPLE_ROUTINES.map((r) => (
          <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
        ))}
      </Rail>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xl }}>
        Translated looks arrive in a later update.
      </Txt>
    </Screen>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.l, paddingTop: space.m }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, borderRadius: radius.card, overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
});
