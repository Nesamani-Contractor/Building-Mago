import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CATEGORIES, OCCASIONS } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card } from '@/components/Surface';
import { Chip, RoutineRow } from '@/components/Bits';
import { StateView } from '@/components/States';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { fonts, layout, radius, space } from '@/design/tokens';
import { searchLibrary, useLibrary } from '@/data/library';
import { track } from '@/services/analytics';

type Filter = 'all' | 'favorites' | 'recent' | 'quick' | `cat:${string}` | `occ:${string}` | `col:${string}`;

/** M-11 Library: search, filter chips, collections, favorites, recently done. */
export default function Library() {
  const router = useRouter();
  const { c } = useTheme();
  const items = useLibrary((s) => s.items);
  const collections = useLibrary((s) => s.collections);
  const addCollection = useLibrary((s) => s.addCollection);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [newCol, setNewCol] = useState<string | null>(null);

  const all = useMemo(() => Object.values(items).sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [items]);
  const filtered = useMemo(() => {
    let list = searchLibrary(all, q);
    if (filter === 'favorites') list = list.filter((s) => s.favorite);
    else if (filter === 'recent') list = list.filter((s) => s.lastDoneAt).sort((a, b) => (b.lastDoneAt ?? '').localeCompare(a.lastDoneAt ?? ''));
    else if (filter === 'quick') list = list.filter((s) => s.routine.totalTimeMin < 10);
    else if (filter.startsWith('cat:')) list = list.filter((s) => s.routine.category === filter.slice(4));
    else if (filter.startsWith('occ:')) list = list.filter((s) => s.routine.occasion.includes(filter.slice(4) as never));
    else if (filter.startsWith('col:')) list = list.filter((s) => s.collectionIds.includes(filter.slice(4)));
    return list;
  }, [all, q, filter]);

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'recent', label: 'Recently done' },
    { id: 'quick', label: 'Under 10 min' },
    ...OCCASIONS.filter((o) => o !== 'Custom').map((o) => ({ id: `occ:${o}` as Filter, label: o })),
    ...CATEGORIES.filter((x) => x !== 'Other' && x !== 'Hair').map((x) => ({ id: `cat:${x}` as Filter, label: x })),
  ];

  return (
    <Screen mood="calm" bottomInset={layout.tabBarSpace}>
      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.xl }}>
        Library
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.xs }}>
        {all.length === 0 ? 'Your saved looks live here, on your phone.' : `${all.length} ${all.length === 1 ? 'look' : 'looks'} saved`}
      </Txt>

      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.hairline }]}>
        <Icon name="search" size={20} color={c.inkSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => q && track('search_performed', { results: filtered.length })}
          placeholder="Search looks, steps or products"
          placeholderTextColor={c.inkSecondary}
          accessibilityLabel="Search your library"
          returnKeyType="search"
          style={[styles.input, { color: c.ink }]}
        />
        {q ? (
          <PressableScale accessibilityLabel="Clear search" onPress={() => setQ('')} style={styles.clear}>
            <Icon name="close" size={18} />
          </PressableScale>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.l }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.s }}>
        {chips.map((ch) => (
          <Chip key={ch.id} label={ch.label} selected={filter === ch.id} onPress={() => setFilter(ch.id === filter ? 'all' : ch.id)} />
        ))}
      </ScrollView>

      <View style={styles.colHeader}>
        <Txt variant="title3">Collections</Txt>
        <PressableScale accessibilityLabel="New collection" onPress={() => setNewCol('')} style={styles.newCol}>
          <Icon name="plus" size={18} />
          <Txt variant="subhead">New</Txt>
        </PressableScale>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m }}>
        {collections.map((col) => {
          const count = all.filter((s) => s.collectionIds.includes(col.id)).length;
          const sel = filter === `col:${col.id}`;
          return (
            <PressableScale key={col.id} accessibilityState={{ selected: sel }} accessibilityLabel={`${col.name}, ${count} looks`} onPress={() => setFilter(sel ? 'all' : `col:${col.id}`)}>
              <Card variant={sel ? 'outline' : 'glass'} style={[styles.colCard, sel && { borderColor: c.primary, borderWidth: 1.5 }]}>
                <Txt variant="title3" numberOfLines={1}>
                  {col.name}
                </Txt>
                <Txt variant="footnote" tone="secondary">
                  {count} {count === 1 ? 'look' : 'looks'}
                </Txt>
              </Card>
            </PressableScale>
          );
        })}
      </ScrollView>
      {newCol !== null ? (
        <Card style={{ marginTop: space.m, gap: space.m }}>
          <TextInput
            autoFocus
            value={newCol}
            onChangeText={setNewCol}
            placeholder="Name, e.g. Weekend"
            placeholderTextColor={c.inkSecondary}
            accessibilityLabel="Collection name"
            style={[styles.colInput, { color: c.ink, borderColor: c.hairlineStrong }]}
            maxLength={30}
            onSubmitEditing={() => {
              if (newCol.trim()) {
                addCollection(newCol);
                track('collection_created', {});
              }
              setNewCol(null);
            }}
          />
          <View style={{ flexDirection: 'row', gap: space.m }}>
            <Chip label="Cancel" onPress={() => setNewCol(null)} />
            <Chip
              label="Create collection"
              selected
              onPress={() => {
                if (newCol.trim()) {
                  addCollection(newCol);
                  track('collection_created', {});
                }
                setNewCol(null);
              }}
            />
          </View>
        </Card>
      ) : null}

      <View style={{ marginTop: space.xxl }}>
        {all.length === 0 ? (
          <StateView
            icon="library"
            title="No saved looks yet"
            body="Share a tutorial from YouTube, TikTok or Instagram to Mago, or tap + to paste a link."
            actionLabel="Add a look"
            onAction={() => router.push('/add')}
          />
        ) : filtered.length === 0 ? (
          <StateView icon="search" title="Nothing matches" body="Try a product name, a step or another filter." actionLabel="Clear filters" onAction={() => { setQ(''); setFilter('all'); }} />
        ) : (
          <Card style={{ paddingVertical: space.xs }}>
            {filtered.map((s, i) => (
              <View key={s.routine.id} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.hairline } : undefined}>
                <RoutineRow
                  routine={s.routine}
                  subtitle={s.doneCount > 0 ? `Done ${s.doneCount} ${s.doneCount === 1 ? 'time' : 'times'} · ${s.routine.totalTimeMin} min` : undefined}
                  onPress={() => router.push(`/routine/${s.routine.id}`)}
                  right={s.favorite ? <Icon name="heart" filled size={18} /> : undefined}
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.xl, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.l, minHeight: 52 },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 17, paddingVertical: space.m },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  colHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xxl, marginBottom: space.m },
  newCol: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingHorizontal: space.s },
  colCard: { width: 156, gap: space.xs, paddingVertical: space.l },
  colInput: { borderWidth: 1, borderRadius: radius.chip, paddingHorizontal: space.l, minHeight: 48, fontFamily: fonts.sans, fontSize: 17 },
});
