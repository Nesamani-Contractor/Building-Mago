import { useEffect, useMemo } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { bagCount, productRole, type BagItem, type ProductRole } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { StateView } from '@/components/States';
import { PressableScale } from '@/components/PressableScale';
import { BagThumb, roleLabel } from '@/components/BagItemForm';
import { space , radius } from '@/design/tokens';
import { bagUnits, useBag, useScanDraft } from '@/data/bag';
import { CartButton } from '@/components/Cart';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/design/theme';

const GROUPS: { title: string; roles: ProductRole[] }[] = [
  { title: 'Face', roles: ['primer', 'foundation', 'concealer', 'corrector', 'powder', 'bronzer', 'blush', 'highlighter', 'setting spray'] },
  { title: 'Eyes & brows', roles: ['eyeshadow', 'eyeliner', 'mascara', 'lashes', 'brow'] },
  { title: 'Lips', roles: ['lipstick', 'lip liner', 'gloss', 'lip balm'] },
  { title: 'Skincare', roles: ['skincare', 'sunscreen'] },
  { title: 'Tools', roles: ['brush', 'sponge', 'tool', 'other'] },
];

/** My makeup bag: everything she owns, grouped, on her phone. */
export default function Bag() {
  const router = useRouter();
  const { c } = useTheme();
  const items = useBag((s) => s.items);
  const units = bagUnits(items);
  const setPhotos = useScanDraft((s) => s.setPhotos);
  const lastResult = useScanDraft((s) => s.lastResult);
  const setLastResult = useScanDraft((s) => s.setLastResult);
  // Show what the last save did once, then let it go.
  useEffect(() => {
    if (!lastResult) return;
    const t = setTimeout(() => setLastResult(null), 8000);
    return () => clearTimeout(t);
  }, [lastResult, setLastResult]);

  async function onePhoto() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    setPhotos([res.assets[0].uri]);
    router.push('/bag/review');
  }
  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: items.filter((i) => g.roles.includes(i.role ?? productRole(i))) })).filter((g) => g.items.length > 0),
    [items],
  );

  return (
    <Screen
      mood="warm"
      header={<TopBar title="My makeup bag" right={<CartButton />} />}
      footer={
        <View style={{ gap: space.s }}>
          <Button variant="hero" label="Add from several photos" icon="camera" onPress={() => router.push('/bag/scan')} />
          <View style={{ flexDirection: 'row', gap: space.s }}>
            <Button variant="secondary" label="One photo" icon="image" onPress={onePhoto} style={{ flex: 1 }} />
            <Button variant="secondary" label="By hand" icon="pencil" onPress={() => router.push('/bag/review?manual=1')} style={{ flex: 1 }} />
          </View>
        </View>
      }
    >
      {items.length === 0 ? (
        <StateView
          icon="camera"
          title="What’s in your makeup bag?"
          body="Add products from one photo, several photos, or by hand. Mago reads the labels, counts repeats, and tells you for every look what you have, what to swap and what to buy."
          style={{ marginTop: space.x4 }}
        />
      ) : (
        <>
          {lastResult ? (
            <View style={[styles.result, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
              <Icon name="check" size={18} color={c.success} strokeWidth={2} />
              <Txt variant="callout" style={{ flex: 1 }}>
                {[
                  lastResult.added ? `Added ${lastResult.added} new` : null,
                  ...lastResult.updated.map((u) => `${u.name} is now ×${u.count}`),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Txt>
            </View>
          ) : null}
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.l }}>
            {items.length} {items.length === 1 ? 'product' : 'products'} · {units} {units === 1 ? 'item' : 'items'} in total · used to check every look
          </Txt>
          {groups.map((g) => (
            <View key={g.title} style={{ marginTop: space.xl, gap: space.m }}>
              <Txt variant="title3">{g.title}</Txt>
              <View style={styles.grid}>
                {g.items.map((i) => (
                  <Tile key={i.id} item={i} onPress={() => router.push(`/bag/item/${i.id}`)} />
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function Tile({ item, onPress }: { item: BagItem; onPress: () => void }) {
  const { c } = useTheme();
  const n = bagCount(item);
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${item.name}, ${roleLabel(item.role ?? productRole(item))}, you have ${n}. Edit`} style={styles.tileWrap}>
      <Card style={styles.tile}>
        <View>
          <BagThumb item={item} size={72} />
          {n > 1 ? (
            <View style={[styles.count, { backgroundColor: c.primary }]}>
              <Txt variant="caption" style={{ color: c.inkOnPrimary, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                ×{n}
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt variant="footnote" numberOfLines={2} align="center" style={{ fontWeight: '600' }}>
          {item.name}
        </Txt>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {[item.brand ?? roleLabel(item.role ?? productRole(item)), item.shade].filter(Boolean).join(' · ')}
        </Txt>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  result: { flexDirection: 'row', alignItems: 'center', gap: space.s, padding: space.m, borderRadius: radius.thumb, marginTop: space.l },
  count: { position: 'absolute', right: -6, top: -6, minWidth: 26, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  tileWrap: { width: '30%', minWidth: 104, flexGrow: 1, maxWidth: 180 },
  tile: { alignItems: 'center', gap: space.s, padding: space.m },
});
