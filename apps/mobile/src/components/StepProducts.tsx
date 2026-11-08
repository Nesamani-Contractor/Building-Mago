import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { needsCheck, productKind, type BagMatch, type ProductKind, type ProductRef } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useAccount } from '@/data/account';
import { Txt } from './Txt';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { ProductArt } from './ProductArt';

/** Product pictures are shown to everyone (owner decision, D-16 revised). Flip to gate them behind Pro. */
export const PRODUCT_PICTURES_ARE_PRO = false;

const KIND_LABEL: Record<ProductKind, string> = {
  lipstick: 'Lipstick',
  gloss: 'Gloss',
  pencil: 'Pencil',
  mascara: 'Mascara',
  palette: 'Powder',
  brush: 'Brush',
  sponge: 'Sponge',
  bottle: 'Liquid',
  tube: 'Cream or gel',
  pot: 'Cream',
  spray: 'Spray',
  tool: 'Tool',
};

export function ProductCard({ product, size = 'm', match }: { product: ProductRef; size?: 'm' | 'l'; match?: BagMatch }) {
  const { c } = useTheme();
  const matchColor = match?.status === 'missing' ? c.warningInk : c.inkSecondary;
  const matchText = !match ? null : match.status === 'have' ? 'In your bag' : match.status === 'missing' ? 'Not in your bag' : match.item ? `Use your ${match.item.name}` : 'Use fingertips';
  const check = needsCheck(product);
  const art = size === 'l' ? 80 : 64;
  return (
    <View
      style={{ width: size === 'l' ? 120 : 96, gap: space.s }}
      accessible
      accessibilityLabel={`${product.name}${product.brand ? ` by ${product.brand}` : ''}. ${KIND_LABEL[productKind(product)]}${check ? '. Check this — we weren’t sure.' : ''}${matchText ? `. ${matchText}` : ''}`}
    >
      <ProductArt product={product} size={art} />
      <View style={{ gap: 2 }}>
        <Txt variant="footnote" numberOfLines={2} style={{ fontWeight: '600' }}>
          {product.name}
        </Txt>
        {matchText ? (
          <Txt variant="footnote" style={{ color: matchColor }} numberOfLines={2}>
            {matchText}
          </Txt>
        ) : (
          <Txt variant="footnote" tone="secondary" numberOfLines={1}>
            {product.brand ?? KIND_LABEL[productKind(product)]}
          </Txt>
        )}
        {check ? (
          <View style={[styles.check, { backgroundColor: c.warningBg }]}>
            <Txt variant="caption" tone="warning">
              Check this
            </Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * "Use these" for one step (Follow-Along, routine detail) or a whole look.
 * Pro: product pictures. Free: names + teaser to Pro.
 */
export function StepProducts({
  products,
  size = 'm',
  title = 'Use these',
  note = false,
  matches,
}: {
  products: ProductRef[];
  size?: 'm' | 'l';
  title?: string;
  note?: boolean;
  /** Her bag check, keyed by product ref — shows have / swap / missing on each card. */
  matches?: Map<string, BagMatch>;
}) {
  const { c } = useTheme();
  const router = useRouter();
  const isPro = useAccount((s) => s.isPro);
  if (products.length === 0) return null;
  const showPictures = isPro || !PRODUCT_PICTURES_ARE_PRO;

  if (!showPictures) {
    return (
      <View style={{ gap: space.s }}>
        <View style={styles.chips}>
          {products.map((p) => {
            const check = needsCheck(p);
            return (
              <View key={p.ref} style={[styles.chip, { backgroundColor: check ? c.warningBg : c.surfaceAlt }]}>
                <Txt variant="subhead" tone={check ? 'warning' : 'ink'}>
                  {p.name}
                  {check ? ' · Check this' : ''}
                </Txt>
              </View>
            );
          })}
        </View>
        <PressableScale
          accessibilityLabel="See the products with pictures. Mago Pro."
          onPress={() => router.push('/paywall?from=products')}
          style={[styles.teaser, { borderColor: c.accent }]}
        >
          <Icon name="sparkle" size={16} />
          <Txt variant="footnote">See them with pictures · Pro</Txt>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={{ gap: space.s }}>
      {title ? (
        <Txt variant="eyebrow" tone="secondary">
          {title}
        </Txt>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.m, paddingRight: space.l }}>
        {products.map((p) => (
          <ProductCard key={p.ref} product={p} size={size} match={matches?.get(p.ref)} />
        ))}
      </ScrollView>
      {products
        .map((p) => matches?.get(p.ref))
        .filter((m): m is BagMatch => !!m && m.status === 'swap' && !!m.tip)
        .map((m) => (
          <View key={`tip-${m.product.ref}`} style={[styles.swapTip, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="refresh" size={16} />
            <Txt variant="footnote" style={{ flex: 1 }}>
              <Txt variant="footnote" style={{ fontWeight: '600' }}>
                {m.item ? `Swap: your ${m.item.name}. ` : 'Swap: fingertips. '}
              </Txt>
              {m.tip}
            </Txt>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  swapTip: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s, borderRadius: radius.chip, padding: space.m },
  check: { alignSelf: 'flex-start', borderRadius: radius.chip, paddingHorizontal: space.s, paddingVertical: 2, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: { borderRadius: radius.chip, paddingHorizontal: space.m, paddingVertical: space.s },
  teaser: { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.l, minHeight: 44 },
});
