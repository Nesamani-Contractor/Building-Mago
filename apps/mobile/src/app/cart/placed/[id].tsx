import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cartUnits } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { useCart } from '@/data/cart';

/** Order placed: confirmation with the order number and what was ordered. */
export default function OrderPlaced() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const order = useCart((s) => s.orders.find((o) => o.id === id));
  if (!order) {
    return (
      <Screen header={<TopBar />}>
        <StateView icon="info" title="We can’t find that order" body="Your other orders are in Me → My orders." actionLabel="My orders" onAction={() => router.replace('/orders')} />
      </Screen>
    );
  }
  const units = cartUnits(order.lines);
  return (
    <Screen
      header={<TopBar backIcon="close" backLabel="Close" onBack={() => router.dismissTo('/(tabs)/library')} />}
      footer={
        <View style={{ gap: space.s }}>
          <Button label="Back to my looks" onPress={() => router.dismissTo('/(tabs)/library')} />
          <Button variant="ghost" label="View my orders" onPress={() => router.replace('/orders')} />
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: space.m, marginTop: space.x5 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary }}>
          <Icon name="check" size={30} color={c.inkOnPrimary} strokeWidth={2.2} />
        </View>
        <Txt variant="title1" align="center" accessibilityRole="header">
          Order placed
        </Txt>
        <Txt variant="callout" tone="secondary" align="center">
          Order {order.number} · {units} {units === 1 ? 'item' : 'items'}
        </Txt>
      </View>
      <View style={{ gap: space.s, marginTop: space.xxl }}>
        {order.lines.map((l) => (
          <Txt key={l.id} variant="body">
            {l.qty} × {l.name}
            {l.shade ? ` · ${l.shade}` : ''}
          </Txt>
        ))}
      </View>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xxl }}>
        We’ll add them to your makeup bag when you tell us they’ve arrived — open the order in My orders.
      </Txt>
    </Screen>
  );
}
