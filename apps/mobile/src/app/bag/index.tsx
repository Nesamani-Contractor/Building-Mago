import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { productRole, type BagItem, type ProductRole } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { StateView } from '@/components/States';
import { PressableScale } from '@/components/PressableScale';
import { BagThumb, roleLabel } from '@/components/BagItemForm';
import { space } from '@/design/tokens';
import { useBag } from '@/data/bag';

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
  const items = useBag((s) => s.items);
  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: items.filter((i) => g.roles.includes(i.role ?? productRole(i))) })).filter((g) => g.items.length > 0),
    [items],
  );

  return (
    <Screen
      mood="warm"
      header={<TopBar title="My makeup bag" />}
      footer={
        <View style={{ gap: space.s }}>
          <Button variant="hero" label="Scan products" icon="camera" onPress={() => router.push('/bag/scan')} />
          <Button variant="ghost" label="Add by hand" icon="pencil" onPress={() => router.push('/bag/review?manual=1')} />
        </View>
      }
    >
      {items.length === 0 ? (
        <StateView
          icon="camera"
          title="What’s in your makeup bag?"
          body="Snap a photo of your products — one or many. Mago keeps a list on your phone and tells you, for every look, what you have, what to swap and what’s missing."
          style={{ marginTop: space.x4 }}
        />
      ) : (
        <>
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.l }}>
            {items.length} {items.length === 1 ? 'product' : 'products'} · used to check every look
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
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${item.name}, ${roleLabel(item.role ?? productRole(item))}. Edit`} style={styles.tileWrap}>
      <Card style={styles.tile}>
        <BagThumb item={item} size={72} />
        <Txt variant="footnote" numberOfLines={2} align="center" style={{ fontWeight: '600' }}>
          {item.name}
        </Txt>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {item.brand ?? roleLabel(item.role ?? productRole(item))}
        </Txt>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  tileWrap: { width: '30%', minWidth: 104, flexGrow: 1, maxWidth: 180 },
  tile: { alignItems: 'center', gap: space.s, padding: space.m },
});
