import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkBag, productKind, type BagMatch } from '@mago/shared';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Eyebrow, LookPhoto } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ProductArt } from '@/components/ProductArt';
import { KIND_LABEL } from '@/components/StepProducts';
import { StateView } from '@/components/States';
import { GlassButton, PhotoScrim } from '@/components/Wow';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import { photo } from '@/design/media';
import { haptic } from '@/design/haptics';
import { useRoutine } from '@/lib/routines';
import { useBag } from '@/data/bag';

type Tab = 'all' | 'have' | 'missing';

/** "See every product." — every product in a look, its shade, and what she already owns. */
export default function Products() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const routine = useRoutine(id);
  const bag = useBag((s) => s.items);
  const [tab, setTab] = useState<Tab>('all');

  const check = useMemo(() => (routine && bag.length > 0 ? checkBag(routine.products, bag) : null), [routine, bag]);
  const rows: { product: NonNullable<typeof routine>['products'][number]; match?: BagMatch }[] = useMemo(() => {
    if (!routine) return [];
    return routine.products.map((p) => ({ product: p, match: check?.matches.find((m) => m.product.ref === p.ref) }));
  }, [routine, check]);
  const shown = rows.filter((r) => tab === 'all' || (tab === 'have' ? r.match && r.match.status !== 'missing' : r.match?.status === 'missing'));

  if (!routine) {
    return (
      <View style={[styles.fill, { backgroundColor: c.bg, paddingTop: insets.top + space.x5 }]}>
        <StateView icon="info" title="We can’t find that look" body="It may have been removed." actionLabel="Go home" onAction={() => router.replace('/(tabs)')} />
      </View>
    );
  }

  const owned = check ? check.have + check.swaps : 0;
  const tabs: { id: Tab; label: string }[] = check
    ? [
        { id: 'all', label: `All ${rows.length}` },
        { id: 'have', label: `You have ${owned}` },
        { id: 'missing', label: `Missing ${check.missing}` },
      ]
    : [];

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { height: Math.min(300, Math.round(height * 0.32)) }]}>
          <LookPhoto image={{ ...photo('sunkissed'), focus: '50% 45%' }} style={StyleSheet.absoluteFill} accessibilityLabel="Powders and brushes on a porcelain surface" />
          <PhotoScrim top height={130} />
          <PhotoScrim height={220} />
          <View style={[styles.back, { top: insets.top + space.s }]}>
            <GlassButton icon="chevronLeft" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/routine/${routine.id}`))} />
          </View>
          <View style={styles.headerText}>
            <Eyebrow onPhoto>
              {routine.title} · {rows.length} products
            </Eyebrow>
            <Txt variant="display" style={{ color: c.inkOnPhoto, fontSize: 38, lineHeight: 40 }} accessibilityRole="header">
              See every product.
            </Txt>
          </View>
        </View>

        <View style={styles.column}>
          {tabs.length > 0 ? (
            <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]} accessibilityRole="tablist">
              {tabs.map((t) => {
                const on = t.id === tab;
                return (
                  <PressableScale
                    key={t.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t.label}
                    onPress={() => {
                      if (!on) haptic.select();
                      setTab(t.id);
                    }}
                    style={[styles.seg, on && { backgroundColor: c.surface, shadowColor: c.shadow, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }]}
                  >
                    <Txt variant="subhead" style={{ fontWeight: on ? '600' : '500', fontSize: 14 }}>
                      {t.label}
                    </Txt>
                  </PressableScale>
                );
              })}
            </View>
          ) : (
            <PressableScale onPress={() => router.push('/bag/scan')} accessibilityLabel="Scan your makeup bag to see what you already own" style={[styles.scan, { backgroundColor: c.surface }]}>
              <Icon name="camera" size={20} color={c.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="headline">See what you already own</Txt>
                <Txt variant="footnote" tone="secondary">
                  Scan your bag once — every look then shows have, swap or missing.
                </Txt>
              </View>
              <Icon name="chevronRight" size={20} color={c.inkSecondary} />
            </PressableScale>
          )}

          {shown.length === 0 ? (
            <Txt variant="callout" tone="secondary" style={{ marginTop: space.xl }}>
              {tab === 'missing' ? 'Nothing missing — you own everything for this look.' : 'Nothing here yet.'}
            </Txt>
          ) : null}

          {shown.map(({ product, match }, i) => {
            const status = !match
              ? null
              : match.status === 'have'
                ? { text: 'In your bag', color: c.success }
                : match.status === 'swap'
                  ? { text: match.item ? `Swap · use your ${match.item.name}` : 'Swap · use fingertips', color: c.inkSecondary }
                  : { text: 'Not in your bag', color: c.warningInk };
            return (
              <View key={product.ref} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairlineStrong }]}>
                <ProductArt product={product} size={64} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="headline" numberOfLines={2}>
                    {product.name}
                  </Txt>
                  <Txt variant="footnote" tone="secondary" numberOfLines={1}>
                    {product.brand ? `${product.brand} · ` : ''}
                    {KIND_LABEL[productKind(product)]}
                  </Txt>
                  {status ? (
                    <Txt variant="footnote" style={{ color: status.color }} numberOfLines={2}>
                      {status.text}
                    </Txt>
                  ) : null}
                  {match?.tip ? (
                    <Txt variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
                      {match.tip}
                    </Txt>
                  ) : null}
                </View>
              </View>
            );
          })}

          <View style={styles.note}>
            <Icon name="info" size={16} color={c.inkSecondary} />
            <Txt variant="footnote" tone="secondary" style={{ flex: 1 }}>
              Shades are shown as the closest match from the video. Swatch on your jaw in daylight before you buy.
            </Txt>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.l), backgroundColor: c.bg, shadowColor: c.shadow }]}>
        <View style={styles.column}>
          <Button label="Back to the look" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/routine/${routine.id}`))} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.xl },
  header: { overflow: 'hidden', borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet, marginBottom: space.l },
  back: { position: 'absolute', left: space.l },
  headerText: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl, gap: 6 },
  segmented: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 24, marginBottom: space.s },
  seg: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scan: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.card, marginBottom: space.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: space.m },
  note: { flexDirection: 'row', gap: space.s, alignItems: 'flex-start', marginTop: space.l },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.m, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, shadowOpacity: 0.08, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 6 },
});
