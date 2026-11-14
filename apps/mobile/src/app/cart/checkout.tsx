import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { cartUnits } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { StateView } from '@/components/States';
import { ProductArt } from '@/components/ProductArt';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useCart } from '@/data/cart';
import { track } from '@/services/analytics';

/**
 * Checkout (D-25): review the order, edit (back to the cart), place it.
 * There is no retail partner yet, so placing an order saves an order request on the phone —
 * prices, delivery and payment come from the partner's checkout once one is connected (open question).
 */
export default function Checkout() {
  const router = useRouter();
  const { c } = useTheme();
  const lines = useCart((s) => s.lines);
  const placeOrder = useCart((s) => s.placeOrder);
  const units = cartUnits(lines);

  if (lines.length === 0) {
    return (
      <Screen header={<TopBar title="Checkout" />}>
        <StateView icon="cart" title="Nothing to check out" body="Your cart is empty." actionLabel="Back to cart" onAction={() => router.replace('/cart')} style={{ marginTop: space.x4 }} />
      </Screen>
    );
  }

  function place() {
    const order = placeOrder();
    if (!order) return;
    haptic.success();
    track('order_placed', { lines: order.lines.length, units: cartUnits(order.lines) });
    router.dismissTo('/cart');
    router.replace(`/cart/placed/${order.id}`);
  }

  return (
    <Screen header={<TopBar title="Checkout" backLabel="Back to cart" />} footer={<Button label="Place order" onPress={place} />}>
      <View style={styles.head}>
        <Txt variant="title2" accessibilityRole="header">
          Your order
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
      <View style={[styles.total, { backgroundColor: c.surfaceAlt }]}>
        <Txt variant="headline">Total items</Txt>
        <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
          {units}
        </Txt>
      </View>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l, marginBottom: space.xxl }}>
        Prices, delivery and payment are confirmed by the store before anything is charged. Nothing is charged in this preview.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.l },
  edit: { minHeight: 44, justifyContent: 'center', paddingLeft: space.m },
  group: { borderRadius: radius.card, marginTop: space.m, paddingHorizontal: space.m },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: radius.thumb, padding: space.l, marginTop: space.m },
});
