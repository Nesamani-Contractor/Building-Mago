import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { needsCheck, productKind, type BagMatch, type ProductKind, type ProductRef } from '@mago/shared';
import { useTheme } from '@/design/theme';
import { radius, space, fonts } from '@/design/tokens';
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
  const matchColor = match?.status === 'have' ? c.success : match?.status === 'missing' ? c.warningInk : c.ink;
  const matchText = !match ? null : match.status === 'have' ? 'In your bag' : match.status === 'missing' ? 'Not in your bag' : match.item ? `Use your ${match.item.name}` : 'Use fingertips';
  const check = needsCheck(product);
  const art = size === 'l' ? 96 : 76;
  return (
    <View
      style={[styles.card, { width: size === 'l' ? 148 : 124, backgroundColor: c.surface, borderColor: check ? c.warningInk : c.hairline }]}
      accessible
      accessibilityLabel={`${product.name}${product.brand ? ` by ${product.brand}` : ''}. ${KIND_LABEL[productKind(product)]}${check ? '. Check this — we weren’t sure.' : ''}${matchText ? `. ${matchText}` : ''}`}
    >
      <ProductArt product={product} size={art} />
      <View style={{ gap: 2, alignSelf: 'stretch' }}>
        <Txt variant={size === 'l' ? 'subhead' : 'footnote'} numberOfLines={2} style={{ fontFamily: fonts.sansSemibold }}>
          {product.name}
        </Txt>
        <Txt variant="caption" tone="secondary" numberOfLines={1}>
          {product.brand ?? KIND_LABEL[productKind(product)]}
        </Txt>
        {matchText ? (
          <View style={styles.match}>
            <Icon name={match?.status === 'have' ? 'check' : match?.status === 'swap' ? 'refresh' : 'info'} size={12} color={matchColor} strokeWidth={2} />
            <Txt variant="caption" style={{ color: matchColor, flex: 1 }} numberOfLines={2}>
              {matchText}
            </Txt>
          </View>
        ) : null}
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
              <View key={p.ref} style={[styles.chip, { backgroundColor: check ? c.warningBg : c.surface, borderColor: c.hairline }]}>
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
      <Txt variant="caption" tone="secondary" style={{ letterSpacing: 1.2 }}>
        {title.toUpperCase()}
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.m, paddingRight: space.l }}>
        {products.map((p) => (
          <ProductCard key={p.ref} product={p} size={size} match={matches?.get(p.ref)} />
        ))}
      </ScrollView>
      {products
        .map((p) => matches?.get(p.ref))
        .filter((m): m is BagMatch => !!m && m.status === 'swap' && !!m.tip)
        .map((m) => (
          <View key={`tip-${m.product.ref}`} style={[styles.swapTip, { borderColor: c.hairlineStrong }]}>
            <Icon name="refresh" size={16} />
            <Txt variant="footnote" style={{ flex: 1 }}>
              <Txt variant="footnote" style={{ fontFamily: fonts.sansSemibold }}>
                {m.item ? `Swap: your ${m.item.name}. ` : 'Swap: fingertips. '}
              </Txt>
              {m.tip}
            </Txt>
          </View>
        ))}
      {note && products.some((p) => !p.imageUrl) ? (
        <Txt variant="caption" tone="secondary">
          Pictures show the type of product and its shade.
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.thumb + 4, borderWidth: 1, padding: space.m, gap: space.s, alignItems: 'center' },
  match: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, marginTop: 2 },
  swapTip: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s, borderWidth: 1, borderRadius: radius.chip, padding: space.m },
  check: { alignSelf: 'flex-start', borderRadius: radius.chip, paddingHorizontal: space.s, paddingVertical: 2, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: { borderRadius: radius.chip, borderWidth: 1, paddingHorizontal: space.m, paddingVertical: space.s },
  teaser: { flexDirection: 'row', alignItems: 'center', gap: space.s, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.l, minHeight: 44 },
});
