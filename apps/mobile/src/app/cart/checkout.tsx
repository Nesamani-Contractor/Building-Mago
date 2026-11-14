import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { cartUnits, retailersFor, type Retailer } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { StateView } from '@/components/States';
import { ProductArt } from '@/components/ProductArt';
import { PressableScale } from '@/components/PressableScale';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useCart } from '@/data/cart';
import { deviceRegion } from '@/lib/region';
import { track } from '@/services/analytics';

/**
 * Checkout (D-28): review the order, then choose the store to order from. Mago hands every product
 * in the cart over to that store's website, where she adds them to the store's cart and pays.
 * Mago itself never takes payment.
 */
export default function Checkout() {
  const router = useRouter();
  const { c } = useTheme();
  const lines = useCart((s) => s.lines);
  const units = cartUnits(lines);
  const stores = useMemo(() => retailersFor(deviceRegion()), []);
  const [store, setStore] = useState<Retailer | null>(null);

  if (lines.length === 0) {
    return (
      <Screen header={<TopBar title="Checkout" />}>
        <StateView icon="cart" title="Nothing to check out" body="Your cart is empty." actionLabel="Back to cart" onAction={() => router.replace('/cart')} style={{ marginTop: space.x4 }} />
      </Screen>
    );
  }

  function go() {
    if (!store) return;
    haptic.select();
    track('order_store_chosen', { store: store.id, lines: lines.length, units });
    router.push(`/cart/store/${store.id}`);
  }

  return (
    <Screen
      header={<TopBar title="Checkout" backLabel="Back to cart" />}
      footer={<Button label={store ? `Order at ${store.name}` : 'Choose a store'} disabled={!store} onPress={go} />}
    >
      <View style={styles.head}>
        <Txt variant="title2" accessibilityRole="header">
          Your order · {units} {units === 1 ? 'item' : 'items'}
        </Txt>
        <PressableScale accessibilityLabel="Edit cart" onPress={() => router.back()} style={styles.edit}>
          <Txt variant="subhead" style={{ color: c.primary }}>
            Edit cart
          </Txt>
        </PressableScale>
      </View>
      <View style={[styles.group, { backgroundColor: c.surface }]}>
        {lines.map((l, i) => (
          <View key={l.id} style={[styles.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline }]}>
            <ProductArt product={{ ref: l.id, name: l.name, confidence: 1, kind: l.kind, shadeHex: l.shadeHex }} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="subhead" numberOfLines={1}>
                {l.name}
              </Txt>
              <Txt variant="footnote" tone="secondary" numberOfLines={1}>
                {[l.brand, l.shade].filter(Boolean).join(' · ') || 'Any brand'}
              </Txt>
            </View>
            <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={`Quantity ${l.qty}`}>
              × {l.qty}
            </Txt>
          </View>
        ))}
      </View>

      <Txt variant="title3" accessibilityRole="header" style={{ marginTop: space.xxl }}>
        Where would you like to order?
      </Txt>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xs }}>
        We’ll take every product to the store’s website. You add them to its cart and pay there.
      </Txt>
      <View style={{ gap: space.s, marginTop: space.m }} accessibilityRole="radiogroup">
        {stores.map((r) => {
          const on = store?.id === r.id;
          return (
            <PressableScale
              key={r.id}
              onPress={() => {
                haptic.select();
                setStore(r);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${r.name}. ${r.blurb}`}
              scaleTo={0.985}
              style={[styles.store, { backgroundColor: on ? c.primary : c.surface }]}
            >
              <View style={[styles.monogram, { backgroundColor: on ? c.inkOnPrimary : c.surfaceAlt }]}>
                <Txt variant="headline" style={{ color: c.primary }}>
                  {r.name.charAt(0)}
                </Txt>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="headline" style={on ? { color: c.inkOnPrimary } : undefined}>
                  {r.name}
                </Txt>
                <Txt variant="footnote" tone={on ? undefined : 'secondary'} style={on ? { color: c.inkOnPrimary } : undefined} numberOfLines={1}>
                  {r.blurb}
                </Txt>
              </View>
              {on ? <Icon name="check" size={22} color={c.inkOnPrimary} strokeWidth={2.2} /> : null}
            </PressableScale>
          );
        })}
      </View>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l, marginBottom: space.xxl }}>
        Prices, delivery and payment are set by the store. Mago never sees your card.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.l, gap: space.m },
  edit: { minHeight: 44, justifyContent: 'center', paddingLeft: space.m },
  group: { borderRadius: radius.card, marginTop: space.m, paddingHorizontal: space.m },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  store: { flexDirection: 'row', alignItems: 'center', gap: space.m, borderRadius: radius.card, padding: space.m, minHeight: 72 },
  monogram: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
