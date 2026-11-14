import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { cartUnits , bagCount } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { StateView } from '@/components/States';
import { Card } from '@/components/Surface';
import { space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useCart } from '@/data/cart';
import { useBag, useScanDraft } from '@/data/bag';
import { track } from '@/services/analytics';

/** My orders: what she ordered, and "It arrived" to add everything to her makeup bag (counts merge). */
export default function Orders() {
  const router = useRouter();
  const orders = useCart((s) => s.orders);
  const add = useBag((s) => s.add);
  const markReceived = useCart((s) => s.markReceived);
  const setLastResult = useScanDraft((s) => s.setLastResult);
  return (
    <Screen header={<TopBar title="My orders" />}>
      {orders.length === 0 ? (
        <StateView icon="cart" title="No orders yet" body="Products you order from your cart show up here." actionLabel="Open my cart" onAction={() => router.replace('/cart')} style={{ marginTop: space.x4 }} />
      ) : (
        <View style={{ gap: space.l, marginTop: space.l, marginBottom: space.xxl }}>
          {orders.map((o) => (
            <Card key={o.id} style={{ gap: space.s }}>
              <Txt variant="headline">Order {o.number}</Txt>
              <Txt variant="footnote" tone="secondary">
                {new Date(o.placedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {cartUnits(o.lines)} items{o.store ? ` · ${o.store.name}` : ''} · {o.status === 'requested' ? 'Ordered' : 'Arrived · added to your bag'}
              </Txt>
              {o.lines.map((l) => (
                <Txt key={l.id} variant="callout">
                  {l.qty} × {l.name}
                  {l.shade ? ` · ${l.shade}` : ''}
                </Txt>
              ))}
              {o.status === 'requested' ? (
              <Button
                variant="secondary"
                icon="bag"
                label="It arrived — add to my bag"
                onPress={() => {
                  const res = add(o.lines.map((l) => ({ name: l.name, brand: l.brand, shade: l.shade, shadeHex: l.shadeHex, kind: l.kind, role: l.role, count: l.qty })));
                  setLastResult({ added: res.added.length, updated: res.merged.map((m) => ({ name: m.item.name, count: bagCount(m.item) })) });
                  markReceived(o.id);
                  track('order_added_to_bag', { units: cartUnits(o.lines) });
                  haptic.success();
                  router.push('/bag');
                }}
                style={{ marginTop: space.s }}
              />
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
