import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import type { CartLine } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useCart, useCartUnits } from '@/data/cart';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { ProductArt } from './ProductArt';

/** Cart icon with a count badge; opens My cart (D-25). */
export function CartButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const router = useRouter();
  const units = useCartUnits();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={units ? `My cart, ${units} ${units === 1 ? 'item' : 'items'}` : 'My cart, empty'}
      onPress={() => router.push('/cart')}
      style={[styles.round, { backgroundColor: c.surface }, style]}
    >
      <Icon name="cart" size={21} color={c.ink} />
      {units ? (
        <View style={[styles.badge, { backgroundColor: c.primary }]}>
          <Txt variant="caption" style={{ color: c.inkOnPrimary, fontWeight: '700', fontSize: 11, fontVariant: ['tabular-nums'] }}>
            {units > 99 ? '99+' : units}
          </Txt>
        </View>
      ) : null}
    </PressableScale>
  );
}

/** − 2 + stepper. Minus at 1 asks the caller to remove the line. */
export function QtyStepper({ value, onChange, min = 1, max, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const { c } = useTheme();
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;
  return (
    <View style={[styles.stepper, { backgroundColor: c.surfaceAlt }]} accessibilityRole="adjustable" accessibilityLabel={`${label}, ${value}`} accessibilityValue={{ now: value, min, max }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && !atMax) onChange(value + 1);
        if (e.nativeEvent.actionName === 'decrement') onChange(value - 1);
      }}
    >
      <PressableScale accessibilityLabel={atMin ? `Remove ${label}` : `Fewer ${label}`} onPress={() => { haptic.select(); onChange(value - 1); }} style={styles.stepBtn}>
        <Icon name={atMin && min > 0 ? 'trash' : 'minus'} size={18} color={c.ink} />
      </PressableScale>
      <Txt variant="headline" style={{ minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      <PressableScale accessibilityLabel={`More ${label}`} disabled={atMax} onPress={() => { haptic.select(); onChange(value + 1); }} style={styles.stepBtn}>
        <Icon name="plus" size={18} color={c.ink} />
      </PressableScale>
    </View>
  );
}

/** One cart line: picture, name, brand · shade, which look it's for, and the stepper. */
export function CartRow({ line, onRemove }: { line: CartLine; onRemove: (l: CartLine) => void }) {
  const { c } = useTheme();
  const setQty = useCart((s) => s.setQty);
  const sub = [line.brand, line.shade].filter(Boolean).join(' · ');
  return (
    <View style={[styles.row, { backgroundColor: c.surface }]}>
      <ProductArt product={{ ref: line.id, name: line.name, confidence: 1, kind: line.kind, shadeHex: line.shadeHex }} size={64} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Txt variant="headline" numberOfLines={2}>
          {line.name}
        </Txt>
        {sub ? (
          <Txt variant="footnote" tone="secondary" numberOfLines={1}>
            {sub}
          </Txt>
        ) : null}
        {line.forLook ? (
          <Txt variant="footnote" tone="secondary" numberOfLines={1}>
            For: {line.forLook.title}
          </Txt>
        ) : null}
        <View style={styles.rowActions}>
          <QtyStepper value={line.qty} max={10} label={line.name} onChange={(n) => (n <= 0 ? onRemove(line) : setQty(line.id, n))} />
          <PressableScale accessibilityLabel={`Remove ${line.name} from cart`} onPress={() => onRemove(line)} style={styles.removeBtn}>
            <Txt variant="subhead" style={{ color: c.primary }}>
              Remove
            </Txt>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, gap: space.xs },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space.m, padding: space.m, borderRadius: radius.card },
  rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  removeBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.s },
});
