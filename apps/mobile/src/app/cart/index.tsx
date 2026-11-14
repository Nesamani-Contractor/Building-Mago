import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { cartUnits, type CartLine } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { StateView } from '@/components/States';
import { PressableScale } from '@/components/PressableScale';
import { CartRow } from '@/components/Cart';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useCart } from '@/data/cart';
import { track } from '@/services/analytics';

/**
 * My cart (D-25): every product she wants to buy, with quantity steppers, remove (with Undo),
 * Continue browsing (back to wherever she came from) and Checkout.
 */
export default function Cart() {
  const router = useRouter();
  const { c } = useTheme();
  const lines = useCart((s) => s.lines);
  const remove = useCart((s) => s.remove);
  const restore = useCart((s) => s.restore);
  const clear = useCart((s) => s.clear);
  const [undo, setUndo] = useState<CartLine | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const units = cartUnits(lines);

  useEffect(() => {
    track('cart_viewed', { lines: lines.length, units });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onRemove(l: CartLine) {
    remove(l.id);
    track('cart_item_removed', {});
    setUndo(l);
    AccessibilityInfo.announceForAccessibility(`${l.name} removed`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), 5000);
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/library'));

  return (
    <Screen
      header={<TopBar title="My cart" right={lines.length ? <PressableScale accessibilityLabel="Remove everything from the cart" onPress={() => { clear(); track('cart_cleared', {}); }} style={styles.clear}><Txt variant="subhead" tone="secondary">Clear</Txt></PressableScale> : undefined} />}
      footer={
        lines.length ? (
          <View style={{ gap: space.s }}>
            <Button label={`Checkout · ${units} ${units === 1 ? 'item' : 'items'}`} onPress={() => router.push('/cart/checkout')} />
            <Button variant="ghost" label="Continue browsing" onPress={back} />
          </View>
        ) : undefined
      }
    >
      {undo ? (
        <View style={[styles.undo, { backgroundColor: c.ink }]} accessibilityLiveRegion="polite">
          <Txt variant="callout" style={{ color: c.bg, flex: 1 }} numberOfLines={1}>
            Removed {undo.name}
          </Txt>
          <PressableScale accessibilityLabel={`Undo, put ${undo.name} back`} onPress={() => { restore(undo); setUndo(null); }} style={styles.undoBtn}>
            <Txt variant="subhead" style={{ color: c.bg, fontWeight: '700' }}>
              Undo
            </Txt>
          </PressableScale>
        </View>
      ) : null}

      {lines.length === 0 ? (
        <StateView
          icon="cart"
          title="Your cart is empty"
          body="Open a look and tap Add to cart on anything that isn’t in your makeup bag."
          actionLabel="Find a look"
          onAction={() => router.replace('/(tabs)/discover')}
          style={{ marginTop: space.x4 }}
        />
      ) : (
        <>
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.l }}>
            {lines.length} {lines.length === 1 ? 'product' : 'products'} · {units} {units === 1 ? 'item' : 'items'} in total
          </Txt>
          <View style={{ gap: space.m, marginTop: space.m, marginBottom: space.xxl }}>
            {lines.map((l) => (
              <CartRow key={l.id} line={l} onRemove={onRemove} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.s },
  undo: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingLeft: space.l, borderRadius: radius.thumb, marginTop: space.m },
  undoBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.l },
});
