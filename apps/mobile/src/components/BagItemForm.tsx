import { StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { kindForRole, productRole, type BagItem, type ProductRole } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { SHADE_SWATCHES } from '@/data/bag';
import { Txt } from './Txt';
import { Chip } from './Bits';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';
import { ProductArt } from './ProductArt';
import { QtyStepper } from './Cart';

export type Draft = Omit<BagItem, 'id' | 'addedAt'>;

export const ROLE_CHOICES: { role: ProductRole; label: string }[] = [
  { role: 'foundation', label: 'Foundation' },
  { role: 'concealer', label: 'Concealer' },
  { role: 'powder', label: 'Powder' },
  { role: 'blush', label: 'Blush' },
  { role: 'bronzer', label: 'Bronzer' },
  { role: 'highlighter', label: 'Highlighter' },
  { role: 'eyeshadow', label: 'Eyeshadow' },
  { role: 'eyeliner', label: 'Eyeliner' },
  { role: 'mascara', label: 'Mascara' },
  { role: 'brow', label: 'Brows' },
  { role: 'lipstick', label: 'Lipstick' },
  { role: 'lip liner', label: 'Lip liner' },
  { role: 'gloss', label: 'Gloss' },
  { role: 'lip balm', label: 'Lip balm' },
  { role: 'primer', label: 'Primer' },
  { role: 'setting spray', label: 'Setting spray' },
  { role: 'skincare', label: 'Skincare' },
  { role: 'sunscreen', label: 'Sunscreen' },
  { role: 'fragrance', label: 'Fragrance' },
  { role: 'brush', label: 'Brush' },
  { role: 'sponge', label: 'Sponge' },
  { role: 'tool', label: 'Tool' },
  { role: 'other', label: 'Other' },
];

export function roleLabel(role: ProductRole): string {
  return ROLE_CHOICES.find((r) => r.role === role)?.label ?? 'Product';
}

/** Picture of an owned item: her photo if there is one, else the illustration. */
export function BagThumb({ item, size = 64 }: { item: Draft; size?: number }) {
  const { c } = useTheme();
  if (item.photoUri) {
    return (
      <Image
        source={{ uri: item.photoUri }}
        style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: c.surfaceAlt }}
        // A cut-out from a cluttered photo (D-28) is shown whole; her own single-product photo fills.
        contentFit={item.photoUri.startsWith('data:') ? 'contain' : 'cover'}
        accessibilityLabel={item.name || 'Product photo'}
      />
    );
  }
  const role = item.role ?? productRole(item);
  return <ProductArt product={{ ref: 'x', name: item.name || roleLabel(role), confidence: 1, kind: item.kind ?? kindForRole(role), shadeHex: item.shadeHex }} size={size} />;
}

/** Confirm/edit one product: name, brand, what it is, how many, shade. */
export function BagItemForm({ value, onChange, onRemove, note }: { value: Draft; onChange: (d: Draft) => void; onRemove?: () => void; note?: string }) {
  const { c } = useTheme();
  const role = value.role ?? (value.name ? productRole(value) : undefined);
  return (
    <View style={{ gap: space.m }}>
      <View style={styles.top}>
        <BagThumb item={value} size={84} />
        <View style={{ flex: 1, gap: space.s }}>
          <TextInput
            value={value.name}
            onChangeText={(t) => onChange({ ...value, name: t })}
            placeholder="Product name, e.g. Ruby lipstick"
            placeholderTextColor={c.inkSecondary}
            accessibilityLabel="Product name"
            style={[styles.input, { color: c.ink, borderColor: c.inkSecondary }]}
          />
          <TextInput
            value={value.brand ?? ''}
            onChangeText={(t) => onChange({ ...value, brand: t || undefined })}
            placeholder="Brand (optional)"
            placeholderTextColor={c.inkSecondary}
            accessibilityLabel="Brand"
            style={[styles.input, { color: c.ink, borderColor: 'transparent', backgroundColor: c.surfaceAlt }]}
          />
        </View>
        {onRemove ? (
          <PressableScale accessibilityLabel="Remove this product" onPress={onRemove} style={styles.remove}>
            <Icon name="close" size={18} />
          </PressableScale>
        ) : null}
      </View>

      {note ? (
        <View style={[styles.note, { backgroundColor: c.surfaceAlt }]} accessibilityLiveRegion="polite">
          <Icon name="info" size={16} color={c.inkSecondary} />
          <Txt variant="footnote" style={{ flex: 1 }}>
            {note}
          </Txt>
        </View>
      ) : null}

      <View style={styles.countRow}>
        <View style={{ flex: 1 }}>
          <Txt variant="subhead">How many?</Txt>
          <Txt variant="footnote" tone="secondary">
            Same product, same shade
          </Txt>
        </View>
        <QtyStepper value={Math.max(1, value.count ?? 1)} max={99} label="products" onChange={(n) => onChange({ ...value, count: Math.max(1, n) })} />
      </View>

      <Txt variant="footnote" tone="secondary">
        What is it?
      </Txt>
      <View style={styles.wrap}>
        {ROLE_CHOICES.map((r) => (
          <Chip
            key={r.role}
            label={r.label}
            selected={role === r.role}
            onPress={() => onChange({ ...value, role: r.role, kind: kindForRole(r.role) })}
          />
        ))}
      </View>

      <Txt variant="footnote" tone="secondary">
        Shade (optional)
      </Txt>
      <TextInput
        value={value.shade ?? ''}
        onChangeText={(t) => onChange({ ...value, shade: t || undefined })}
        placeholder="Shade name, e.g. Ruby Woo"
        placeholderTextColor={c.inkSecondary}
        accessibilityLabel="Shade name"
        style={[styles.input, { color: c.ink, borderColor: 'transparent', backgroundColor: c.surfaceAlt }]}
      />
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {SHADE_SWATCHES.map((hex) => {
          const sel = value.shadeHex === hex;
          return (
            <PressableScale
              key={hex}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              accessibilityLabel={`Shade ${hex}`}
              onPress={() => {
                haptic.select();
                onChange({ ...value, shadeHex: sel ? undefined : hex });
              }}
              style={[styles.swatchRing, { borderColor: sel ? c.primary : 'transparent' }]}
            >
              <View style={[styles.swatch, { backgroundColor: hex, borderColor: c.hairline }]} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  input: { borderWidth: 1, borderRadius: radius.chip, minHeight: 44, paddingHorizontal: space.m, fontFamily: fonts.sans, fontSize: 16 },
  note: { flexDirection: 'row', gap: space.s, alignItems: 'center', padding: space.m, borderRadius: radius.chip },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  swatchRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1 },
});
