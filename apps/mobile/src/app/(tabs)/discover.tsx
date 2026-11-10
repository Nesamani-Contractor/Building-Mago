import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Category, Occasion, Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Chip, CircleTile, RoutineTile, SectionHeader } from '@/components/Bits';
import { IconCircle, LookCard, SerifHero } from '@/components/Rose';
import { StateView } from '@/components/States';
import { layout, space } from '@/design/tokens';
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

/** M-13 Discover, in the rose "category" layout: filter chips, occasion circles, 2-column look grid. */
export default function Discover() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cat?: string }>();
  const { width } = useWindowDimensions();
  const items = useLibrary((s) => s.items);
  const save = useLibrary((s) => s.save);
  const remove = useLibrary((s) => s.remove);
  const [cat, setCat] = useState<Category | 'All'>((params.cat as Category | undefined) ?? 'All');
  const [occ, setOcc] = useState<Occasion | null>(null);
  // A category circle on Home selects the chip (adjusting state during render, not in an effect).
  const [seenCat, setSeenCat] = useState(params.cat);
  if (params.cat !== seenCat) {
    setSeenCat(params.cat);
    if (params.cat) setCat(params.cat as Category);
  }

  const cats = useMemo(() => ['All', ...Array.from(new Set(SAMPLE_ROUTINES.map((r) => r.category)))] as (Category | 'All')[], []);
  const visible = SAMPLE_ROUTINES.filter((r) => (cat === 'All' || r.category === cat) && (!occ || r.occasion.includes(occ)));
  const quick = SAMPLE_ROUTINES.filter((r) => r.totalTimeMin < 10);
  const savedCats = new Set(Object.values(items).map((s) => s.routine.category));
  const because = SAMPLE_ROUTINES.filter((r) => savedCats.has(r.category) && !items[r.id]);

  const col = Math.min(width, layout.maxContentWidth) - space.xl * 2;
  const columns = col > 520 ? 3 : 2;
  const cardW = Math.floor((col - space.m * (columns - 1)) / columns);

  function toggleSave(r: Routine) {
    if (items[r.id]) {
      remove(r.id);
      return;
    }
    save(r);
    haptic.success();
    track('discover_saved', { category: r.category });
  }

  function clear() {
    setCat('All');
    setOcc(null);
  }

  function grid(list: Routine[]) {
    return (
      <View style={[styles.grid, { gap: space.m }]}>
        {list.map((r) => (
          <LookCard
            key={r.id}
            routine={r}
            width={cardW}
            saved={!!items[r.id]}
            onOpen={() => router.push(`/routine/${r.id}`)}
            onToggleSave={() => toggleSave(r)}
            actionLabel={items[r.id] ? 'Start look' : 'Save look'}
            onAction={() => (items[r.id] ? router.push(`/brief/${r.id}`) : toggleSave(r))}
          />
        ))}
      </View>
    );
  }

  return (
    <Screen mood="calm" bottomInset={layout.tabBarSpace}>
      <View style={styles.titleRow}>
        <SerifHero line1="Discover" line2="New looks" subtitle="Looks to try this week, reviewed by our team." style={{ flex: 1 }} />
        <IconCircle icon="search" label="Search your library" onPress={() => router.push('/(tabs)/library')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
        {cats.map((k) => (
          <Chip key={k} label={k === 'Face/Base' ? 'Face' : k} selected={cat === k} onPress={() => setCat(k)} />
        ))}
      </ScrollView>

      <SectionHeader title="By occasion" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.s, paddingTop: space.s }}>
        {OCCASION_TILES.map((o) => (
          <View key={o.occasion} style={{ opacity: occ && occ !== o.occasion ? 0.55 : 1 }}>
            <CircleTile label={o.label} icon={OCC_ICON[o.occasion] ?? 'star'} onPress={() => setOcc(occ === o.occasion ? null : o.occasion)} />
          </View>
        ))}
      </ScrollView>

      <SectionHeader
        title={cat === 'All' ? 'Featured looks' : `${cat === 'Face/Base' ? 'Face' : cat} looks`}
        action={cat !== 'All' || occ ? 'Clear' : undefined}
        onAction={clear}
      />
      <View style={{ marginTop: space.m }}>
        {visible.length === 0 ? (
          <StateView icon="sparkle" title="No looks here yet" body="Try another category, or add a tutorial you love with the + button." actionLabel="Show all" onAction={clear} />
        ) : (
          grid(visible)
        )}
      </View>

      <SectionHeader title="Quick looks" />
      <Txt variant="caption" tone="secondary">
        Under 10 minutes · {quick.length} looks
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m, paddingTop: space.m }}>
        {quick.map((r) => (
          <RoutineTile key={r.id} routine={r} width={120} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
        ))}
      </ScrollView>

      {because.length > 0 ? (
        <>
          <SectionHeader title="Recommended for you" />
          <View style={{ marginTop: space.m }}>{grid(because.slice(0, 4))}</View>
        </>
      ) : null}

      <Txt variant="caption" tone="secondary" style={{ marginTop: space.xl }}>
        Translated looks arrive in a later update.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m, marginTop: space.l },
  bleed: { marginHorizontal: -space.xl },
  chips: { paddingHorizontal: space.xl, gap: space.s, paddingTop: space.l },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
