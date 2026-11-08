import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { Occasion, Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Eyebrow, LookHero, OccasionTile, RoutineTile, SectionHeader, stepCount } from '@/components/Bits';
import { layout, space } from '@/design/tokens';
import { OCCASION_PHOTO, photo } from '@/design/media';
import { useLibrary } from '@/data/library';
import { OCCASION_TILES, SAMPLE_ROUTINES } from '@/data/samples';
import { haptic } from '@/design/haptics';
import { track } from '@/services/analytics';

/** Discover (Porter editorial): a cover story, occasions as photo tiles, rails, then a 2-up grid. */
export default function Discover() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const items = useLibrary((s) => s.items);
  const save = useLibrary((s) => s.save);
  const [occ, setOcc] = useState<Occasion | null>(null);

  const cover = SAMPLE_ROUTINES[0];
  const quick = SAMPLE_ROUTINES.filter((r) => r.totalTimeMin < 10);
  const byOcc = useMemo(() => (occ ? SAMPLE_ROUTINES.filter((r) => r.occasion.includes(occ)) : []), [occ]);
  const savedCats = new Set(Object.values(items).map((s) => s.routine.category));
  const because = SAMPLE_ROUTINES.filter((r) => savedCats.has(r.category) && !items[r.id]);
  const colW = Math.floor((Math.min(width, layout.maxContentWidth) - space.xl * 2 - space.m) / 2);

  function quickSave(r: Routine) {
    if (items[r.id]) return router.push(`/routine/${r.id}`);
    save(r);
    haptic.success();
    track('discover_saved', { category: r.category });
  }

  return (
    <Screen mood="warm" bottomInset={layout.tabBarSpace}>
      <View style={{ marginTop: space.l, marginBottom: space.xxl, gap: 6 }}>
        <Eyebrow>Edited by Mago</Eyebrow>
        <Txt variant="display" accessibilityRole="header">
          Discover
        </Txt>
      </View>

      {cover ? (
        <LookHero
          routine={cover}
          eyebrow="This week’s cover"
          meta={`${cover.totalTimeMin} min · ${stepCount(cover)} steps`}
          action={items[cover.id] ? 'Saved' : 'Save'}
          actionIcon="bookmark"
          height={440}
          onPress={() => router.push(`/routine/${cover.id}`)}
          onAction={() => quickSave(cover)}
        />
      ) : null}

      <SectionHeader title="By occasion" />
      <Rail>
        {OCCASION_TILES.map((o) => (
          <OccasionTile
            key={o.occasion}
            label={occ === o.occasion ? `${o.label} ✓` : o.label}
            image={photo(OCCASION_PHOTO[o.occasion])}
            onPress={() => {
              haptic.select();
              setOcc(occ === o.occasion ? null : o.occasion);
            }}
          />
        ))}
      </Rail>
      {occ ? (
        byOcc.length === 0 ? (
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.l }}>
            No {occ.toLowerCase()} looks yet — check back soon.
          </Txt>
        ) : (
          <Rail>
            {byOcc.map((r) => (
              <RoutineTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
            ))}
          </Rail>
        )
      ) : null}

      <SectionHeader title="Quick looks" />
      <Txt variant="footnote" tone="secondary">
        Under 10 minutes
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
      <View style={styles.grid}>
        {SAMPLE_ROUTINES.map((r) => (
          <RoutineTile key={r.id} width={colW} routine={r} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
        ))}
      </View>
    </Screen>
  );
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.xl }}
      contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m, paddingTop: space.m }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, rowGap: space.xl, marginTop: space.m },
});
