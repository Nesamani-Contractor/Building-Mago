import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { checkBag, type BagCheck as BagCheckResult, type BagMatch, type Routine } from '@mago/shared';
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
    () => ({ check: routine && items.length > 0 ? checkBag(routine.products, items) : null, bagSize: items.length }),
    [routine, items],
  );
}

export function statusText(m: BagMatch): string {
  if (m.status === 'have') return 'In your bag';
  if (m.status === 'swap') return m.item ? `Use your ${m.item.name}` : 'Use your fingertips';
  return 'Missing';
}

/** One product: what the tutorial uses → what she'll use. */
export function MatchRow({ m }: { m: BagMatch }) {
  const { c } = useTheme();
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
        {m.tip ? (
          <Txt variant="footnote" tone="secondary">
            {m.tip}
          </Txt>
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
          {check.missing > 0 ? <Pill label={`${check.missing} missing`} color={c.warningInk} /> : null}
        </View>
      </View>
      {(['swap', 'missing', 'have'] as const).flatMap((st) =>
        check.matches
          .filter((m) => m.status === st)
          .map((m) => <MatchRow key={`${st}-${m.product.ref}`} m={m} />),
      )}
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
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: 2 },
});
