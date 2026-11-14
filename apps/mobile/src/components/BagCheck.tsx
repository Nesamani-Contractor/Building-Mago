import { useMemo } from 'react';
import { StyleSheet, View , AccessibilityInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { checkBag, inCart, type BagCheck as BagCheckResult, type BagMatch, type ProductRef, type Routine } from '@mago/shared';
import { haptic } from '@/design/haptics';
import { useCart } from '@/data/cart';
import { track } from '@/services/analytics';
import { PressableScale } from './PressableScale';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useBag } from '@/data/bag';
import { Txt } from './Txt';
import { Card } from './Surface';
import { Icon } from './Icon';
import { Button } from './Button';
import { ProductArt } from './ProductArt';
import { BagThumb } from './BagItemForm';

export function useBagCheck(routine: Routine | undefined): { check: BagCheckResult | null; bagSize: number } {
  const items = useBag((s) => s.items);
  return useMemo(
    () => ({ check: routine && items.length > 0 ? checkBag(routine.products, items, routine.sections) : null, bagSize: items.length }),
    [routine, items],
  );
}

export function statusText(m: BagMatch): string {
  if (m.status === 'have') return `In your bag · you have ${m.ownedCount}`;
  if (m.status === 'swap') return m.item ? `Use your ${m.item.name} · you have ${m.ownedCount}` : 'Use your fingertips';
  return 'Not in your bag · you have 0';
}

/** "Used in 2 steps · pea-size, 2 pumps" — how much of it the look needs (D-25). */
export function usageText(m: Pick<BagMatch, 'usage'>): string | null {
  const { steps, amounts } = m.usage;
  if (!steps) return null;
  return `Used in ${steps} ${steps === 1 ? 'step' : 'steps'}${amounts.length ? ` · ${amounts.join(', ')}` : ''}`;
}

/** One-sentence summary with the counts, e.g. "This look uses 4 products. You have 2 (3 in your bag) · 1 to swap · 1 to buy." */
export function bagSummary(c: BagCheckResult): string {
  const parts = [c.have ? `You have ${c.have}${c.ownedUnits > c.have ? ` (${c.ownedUnits} in your bag)` : ''}` : 'You have none of them yet'];
  if (c.swaps) parts.push(`${c.swaps} you can swap with what you own`);
  if (c.missing) parts.push(`${c.missing} to buy`);
  return `This look uses ${c.needed} ${c.needed === 1 ? 'product' : 'products'}. ${parts.join(' · ')}.`;
}

function cartAddFor(product: ProductRef, routine?: Pick<Routine, 'id' | 'title'>) {
  return { name: product.name, brand: product.brand, shade: product.shade, shadeHex: product.shadeHex, kind: product.kind, forLook: routine ? { id: routine.id, title: routine.title } : undefined };
}

/** "Add to cart" for one product; once added it shows the cart quantity and opens the cart. */
export function AddToCartButton({ product, routine }: { product: ProductRef; routine?: Pick<Routine, 'id' | 'title'> }) {
  const { c } = useTheme();
  const router = useRouter();
  const line = useCart((s) => inCart(s.lines, product));
  const add = useCart((s) => s.add);
  if (line) {
    return (
      <PressableScale accessibilityLabel={`${product.name} is in your cart, ${line.qty}. Open cart`} onPress={() => router.push('/cart')} style={[styles.buy, { backgroundColor: c.surfaceAlt }]}>
        <Icon name="check" size={14} color={c.success} strokeWidth={2} />
        <Txt variant="footnote" style={{ fontWeight: '600' }}>
          In cart · {line.qty}
        </Txt>
      </PressableScale>
    );
  }
  return (
    <PressableScale
      accessibilityLabel={`Add ${product.name} to cart`}
      onPress={() => {
        add([cartAddFor(product, routine)]);
        haptic.select();
        track('cart_added', { count: 1, source: 'bag_check' });
        AccessibilityInfo.announceForAccessibility(`${product.name} added to cart`);
      }}
      style={[styles.buy, { backgroundColor: c.primary }]}
    >
      <Icon name="cart" size={14} color={c.inkOnPrimary} />
      <Txt variant="footnote" style={{ color: c.inkOnPrimary, fontWeight: '600' }}>
        Add to cart
      </Txt>
    </PressableScale>
  );
}

/** Add every missing product to the cart in one tap (skips ones already there). */
export function useAddAllMissing(check: BagCheckResult | null, routine?: Pick<Routine, 'id' | 'title'>) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const missing = check ? check.matches.filter((m) => m.status === 'missing') : [];
  const notInCart = missing.filter((m) => !inCart(lines, m.product));
  return {
    missing: missing.length,
    toAdd: notInCart.length,
    addAll: () => {
      if (!notInCart.length) return;
      add(notInCart.map((m) => cartAddFor(m.product, routine)));
      haptic.success();
      track('cart_added', { count: notInCart.length, source: 'add_all_missing' });
      AccessibilityInfo.announceForAccessibility(`${notInCart.length} added to cart`);
    },
  };
}

/** One product: what the tutorial uses → what she'll use. */
export function MatchRow({ m, routine }: { m: BagMatch; routine?: Pick<Routine, 'id' | 'title'> }) {
  const { c } = useTheme();
  const usage = usageText(m);
  const tone = m.status === 'have' ? c.success : m.status === 'swap' ? c.ink : c.warningInk;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${m.product.name}: ${statusText(m)}${m.tip ? `. ${m.tip}` : ''}`}>
      <ProductArt product={m.product} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="subhead" numberOfLines={1}>
          {m.product.name}
        </Txt>
        <View style={styles.statusRow}>
          <Icon name={m.status === 'have' ? 'check' : m.status === 'swap' ? 'refresh' : 'info'} size={14} color={tone} strokeWidth={2} />
          <Txt variant="footnote" style={{ color: tone, flex: 1 }} numberOfLines={2}>
            {statusText(m)}
          </Txt>
        </View>
        {usage ? (
          <Txt variant="footnote" tone="secondary">
            {usage}
          </Txt>
        ) : null}
        {m.tip ? (
          <Txt variant="footnote" tone="secondary">
            {m.tip}
          </Txt>
        ) : null}
        {m.status !== 'have' ? (
          <View style={{ flexDirection: 'row', marginTop: space.xs }}>
            <AddToCartButton product={m.product} routine={routine} />
          </View>
        ) : null}
      </View>
      {m.item ? <BagThumb item={m.item} size={44} /> : null}
    </View>
  );
}

/** "Your bag check" on the routine page. */
export function BagCheckCard({ routine }: { routine: Routine }) {
  const { c } = useTheme();
  const router = useRouter();
  const { check, bagSize } = useBagCheck(routine);
  const all = useAddAllMissing(check, routine);
  if (routine.products.length === 0) return null;

  if (bagSize === 0 || !check) {
    return (
      <Card variant="outline" style={{ gap: space.m }}>
        <View style={styles.statusRow}>
          <Icon name="camera" size={20} />
          <Txt variant="headline">Do you have what you need?</Txt>
        </View>
        <Txt variant="callout" tone="secondary">
          Scan your makeup bag once, and Mago shows what you have, what to swap and what’s missing for every look.
        </Txt>
        <Button variant="secondary" label="Scan my makeup bag" icon="camera" onPress={() => router.push('/bag/scan')} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.l }}>
      <View style={{ gap: space.xs }}>
        <Txt variant="title3">Your bag check</Txt>
        <View style={styles.pills}>
          <Pill label={`${check.have} you have`} color={c.success} />
          {check.swaps > 0 ? <Pill label={`${check.swaps} to swap`} color={c.ink} /> : null}
          {check.missing > 0 ? <Pill label={`${check.missing} to buy`} color={c.warningInk} /> : null}
        </View>
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xs }}>
          {bagSummary(check)}
        </Txt>
      </View>
      {(['swap', 'missing', 'have'] as const).flatMap((st) =>
        check.matches
          .filter((m) => m.status === st)
          .map((m) => <MatchRow key={`${st}-${m.product.ref}`} m={m} routine={routine} />),
      )}
      {all.missing > 0 ? (
        all.toAdd > 0 ? (
          <Button variant="secondary" icon="cart" label={`Add ${all.toAdd} missing to cart`} onPress={all.addAll} />
        ) : (
          <Button variant="secondary" icon="cart" label="View cart" onPress={() => router.push('/cart')} />
        )
      ) : null}
      {check.missing > 0 ? (
        <Txt variant="footnote" tone="secondary">
          Missing something? You can still do the look — skip that step or go lighter on it.
        </Txt>
      ) : null}
    </Card>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Txt variant="caption" style={{ color }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.xs },
  buy: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: space.m, borderRadius: radius.pill },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: 2 },
});
