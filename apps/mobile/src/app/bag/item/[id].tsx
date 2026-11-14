import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { BagItemForm, type Draft } from '@/components/BagItemForm';
import { space } from '@/design/tokens';
import { useBag } from '@/data/bag';
import { useCart } from '@/data/cart';
import { haptic } from '@/design/haptics';
import { track } from '@/services/analytics';
import { Txt } from '@/components/Txt';

/** Edit or remove one product in the bag. */
export default function BagItemEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useBag((s) => s.items.find((i) => i.id === id));
  const update = useBag((s) => s.update);
  const remove = useBag((s) => s.remove);
  const [draft, setDraft] = useState<Draft | undefined>(item);
  const addToCart = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  if (!item || !draft) return <Redirect href="/bag" />;

  return (
    <Screen
      header={<TopBar title="Edit product" />}
      footer={
        <View style={{ gap: space.s }}>
          <Button
            label="Save changes"
            disabled={!draft.name.trim()}
            onPress={() => {
              update(item.id, { ...draft, name: draft.name.trim(), needsReview: false });
              router.back();
            }}
          />
          <Button
            variant="secondary"
            icon="cart"
            label={added ? 'Added to cart · View cart' : 'Buy more'}
            onPress={() => {
              if (added) return router.push('/cart');
              addToCart([{ name: item.name, brand: item.brand, shade: item.shade, shadeHex: item.shadeHex, kind: item.kind, role: item.role }]);
              haptic.select();
              track('cart_added', { count: 1, source: 'bag_item' });
              setAdded(true);
            }}
          />
          <Button
            variant="ghost"
            icon="trash"
            label="Remove from my bag"
            onPress={() => {
              remove(item.id);
              router.back();
            }}
          />
        </View>
      }
    >
      <Card style={{ marginTop: space.l }}>
        <BagItemForm value={{ ...draft, count: draft.count ?? 1 }} onChange={setDraft} />
      </Card>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m, marginBottom: space.xxl }}>
        Used one up? Lower the count — at zero, remove it from your bag.
      </Txt>
    </Screen>
  );
}
