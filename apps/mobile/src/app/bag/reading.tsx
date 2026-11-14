import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { bagCount, combineScan, isSameProduct, SCAN_REVIEW_CONFIDENCE } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Skeleton } from '@/components/States';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useBag, useScanDraft } from '@/data/bag';
import { readProductPhotos } from '@/services/scanService';
import { photoData } from '@/services/photoData';
import { track } from '@/services/analytics';

/**
 * D-26: Mago reads every photo (one product or a whole cluttered table), sorts what it finds by
 * category, brand and type, and ADDS it to her bag straight away — the same product seen in two
 * photos counts once, and repeats of things she already owns raise the count. Then she reviews.
 */
export default function Reading() {
  const router = useRouter();
  const { c } = useTheme();
  const photos = useScanDraft((s) => s.photos);
  const setBatch = useScanDraft((s) => s.setBatch);
  const [found, setFound] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (photos.length === 0) {
      router.replace('/bag');
      return;
    }
    void (async () => {
      const results = await readProductPhotos(photos, photoData.get);
      const perPhoto = results.map((r) =>
        r.items.map((i) => ({
          ...i,
          // Her photo is a good thumbnail only when it shows just this product.
          photoUri: r.items.length === 1 ? r.photoUri : undefined,
        })),
      );
      const combined = combineScan(perPhoto);
      const unreadPhotos = results.filter((r) => r.items.length === 0).map((r) => r.photoUri);
      setFound(combined.length);
      if (combined.length === 0) {
        // Nothing readable: fall back to naming them by hand, with her photos.
        router.replace('/bag/review?unread=1');
        return;
      }
      const res = useBag.getState().add(
        combined.map(({ seenInPhotos: _seen, confidence, ...it }) => ({
          ...it,
          confidence,
          needsReview: true,
        })),
      );
      const seenFor = (item: Parameters<typeof isSameProduct>[0]) => combined.find((x) => isSameProduct(x, item))?.seenInPhotos ?? 1;
      setBatch({
        photos: photos.length,
        unreadPhotos,
        entries: [
          ...res.added.map((a) => ({ id: a.id, plus: bagCount(a), prevCount: 0, isNew: true, seenInPhotos: seenFor(a) })),
          ...res.merged.map((m) => ({ id: m.item.id, plus: m.plus, prevCount: bagCount(m.item) - m.plus, isNew: false, seenInPhotos: seenFor(m.item) })),
        ],
      });
      track('bag_scan_auto_added', {
        photos: photos.length,
        added: res.added.length,
        merged: res.merged.length,
        unsure: combined.filter((x) => (x.confidence ?? 0) < SCAN_REVIEW_CONFIDENCE).length,
        seen_twice: combined.filter((x) => x.seenInPhotos > 1).length,
      });
      photoData.clear();
      haptic.success();
      router.replace('/bag/added');
    })();
  }, [photos, router, setBatch]);

  return (
    <Screen header={<TopBar title="Reading your products" />}>
      <Txt variant="title2" accessibilityRole="header" style={{ marginTop: space.l }} accessibilityLiveRegion="polite">
        {found === null ? `Reading ${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}…` : `Found ${found} ${found === 1 ? 'product' : 'products'}`}
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        Mago reads every label — brand, name, shade — sorts each product into your bag and counts repeats. You’ll check everything next.
      </Txt>
      <View style={styles.grid}>
        {photos.map((p) => (
          <View key={p} style={styles.cell}>
            <Image source={{ uri: p }} style={[styles.photo, { backgroundColor: c.surfaceAlt }]} contentFit="cover" />
            <View style={{ gap: 6, marginTop: space.s }}>
              <Skeleton height={12} width="80%" />
              <Skeleton height={12} width="50%" />
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, marginTop: space.xl },
  cell: { width: '30%', minWidth: 96, flexGrow: 1, maxWidth: 160 },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.thumb },
});
