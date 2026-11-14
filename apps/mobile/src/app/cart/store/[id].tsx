import { useState } from 'react';
import { AccessibilityInfo, Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { cartUnits, productQuery, retailerById, retailerLink, shoppingList, type CartLine } from '@mago/shared';
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
import { track } from '@/services/analytics';

/**
 * D-28 hand-off: every product in her cart, carried over to the store she chose. Each one opens on
 * the store's website (brand + name + shade) so she can add it to the store's cart; a tick shows
 * which she has opened. When she's ordered, Mago saves the order so "It arrived" can fill her bag.
 */
export default function StoreHandoff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const store = retailerById(id);
  const lines = useCart((s) => s.lines);
  const placeOrder = useCart((s) => s.placeOrder);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!store) {
    return (
      <Screen header={<TopBar title="Order" />}>
        <StateView icon="info" title="We can’t find that store" body="Choose a store again from checkout." actionLabel="Back to checkout" onAction={() => router.replace('/cart/checkout')} style={{ marginTop: space.x4 }} />
      </Screen>
    );
  }
  if (lines.length === 0) {
    return (
      <Screen header={<TopBar title={store.name} />}>
        <StateView icon="cart" title="Your cart is empty" body="Add products from a look or your makeup bag first." actionLabel="Back to cart" onAction={() => router.replace('/cart')} style={{ marginTop: space.x4 }} />
      </Screen>
    );
  }
  const s = store;
  const next = lines.find((l) => !opened.has(l.id));
  const units = cartUnits(lines);

  async function open(l: CartLine) {
    try {
      await Linking.openURL(retailerLink(s, l));
      setFailed(false);
      setOpened((o) => new Set(o).add(l.id));
      haptic.select();
      track('order_item_opened', { store: s.id });
    } catch {
      setFailed(true);
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(shoppingList(lines));
    setCopied(true);
    track('order_list_copied', { store: s.id, lines: lines.length });
    AccessibilityInfo.announceForAccessibility('Shopping list copied');
  }

  function done() {
    const order = placeOrder({ id: s.id, name: s.name });
    if (!order) return;
    haptic.success();
    track('order_placed', { lines: order.lines.length, units: cartUnits(order.lines), store: s.id, opened: opened.size });
    router.dismissTo('/cart');
    router.replace(`/cart/placed/${order.id}`);
  }

  return (
    <Screen
      header={<TopBar title={`Order at ${s.name}`} backLabel="Checkout" />}
      footer={
        <View style={{ gap: space.s }}>
          {next ? (
            <Button icon="link" label={opened.size ? `Open next on ${s.name}` : `Open first product on ${s.name}`} onPress={() => open(next)} />
          ) : (
            <Button label={`I ordered at ${s.name}`} onPress={done} />
          )}
          {next && opened.size ? <Button variant="ghost" label={`I ordered at ${s.name}`} onPress={done} /> : null}
        </View>
      }
    >
      <Txt variant="title2" accessibilityRole="header" style={{ marginTop: space.l }}>
        {lines.length} {lines.length === 1 ? 'product' : 'products'} · {units} {units === 1 ? 'item' : 'items'}
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        Open each product on {s.name}, set the quantity and add it to your {s.name} cart. Then check out there.
      </Txt>

      {failed ? (
        <View style={[styles.alert, { backgroundColor: c.surfaceAlt }]} accessibilityLiveRegion="polite">
          <Txt variant="callout">We couldn’t open {s.name}. Check your connection and try again, or copy the list below.</Txt>
        </View>
      ) : null}

      <View style={[styles.group, { backgroundColor: c.surface }]}>
        {lines.map((l, i) => {
          const done = opened.has(l.id);
          return (
            <View key={l.id} style={[styles.line, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline }]}>
              <ProductArt product={{ ref: l.id, name: l.name, confidence: 1, kind: l.kind, shadeHex: l.shadeHex }} size={48} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt variant="subhead" numberOfLines={2}>
                  {productQuery(l)}
                </Txt>
                <Txt variant="footnote" tone="secondary">
                  Quantity {l.qty}
                  {done ? ' · Opened' : ''}
                </Txt>
              </View>
              <PressableScale
                onPress={() => open(l)}
                accessibilityLabel={`${done ? 'Open again' : 'Find'} ${productQuery(l)} on ${s.name}`}
                style={[styles.find, { backgroundColor: done ? c.surfaceAlt : c.primary }]}
              >
                {done ? <Icon name="check" size={18} color={c.primary} strokeWidth={2.2} /> : null}
                <Txt variant="subhead" style={{ color: done ? c.primary : c.inkOnPrimary, fontWeight: '600' }}>
                  {done ? 'Again' : 'Find'}
                </Txt>
              </PressableScale>
            </View>
          );
        })}
      </View>

      <Button variant="secondary" icon="clipboard" label={copied ? 'Shopping list copied' : 'Copy shopping list'} onPress={copy} style={{ marginTop: space.l }} />
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l, marginBottom: space.xxl }}>
        Prices, stock, delivery and payment are handled by {s.name}. When your order arrives, open My orders and tap “It arrived” to add everything to your makeup bag.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.card, marginTop: space.l, paddingHorizontal: space.m },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  find: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, minWidth: 76, paddingHorizontal: space.m, borderRadius: radius.pill, justifyContent: 'center' },
  alert: { borderRadius: radius.thumb, padding: space.m, marginTop: space.m },
});
