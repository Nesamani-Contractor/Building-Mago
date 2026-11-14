import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { bagCount, combineScan, isSameProduct, SCAN_REVIEW_CONFIDENCE } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Skeleton , StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useBag, useScanDraft } from '@/data/bag';
import { readProductPhotos, type ScanError } from '@/services/scanService';
import { Button } from '@/components/Button';
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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ScanError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    if (photos.length === 0) {
      router.replace('/bag');
      return;
    }
    void (async () => {
      const results = await readProductPhotos(photos, photoData.get, (done) => setProgress(done));
      if (results.every((r) => r.items.length === 0 && r.error)) {
        // Every photo failed for a reason we can name: say so, don't silently ask her to type.
        setError(results[0]!.error!);
        track('bag_scan_failed', { reason: results[0]!.error! });
        return;
      }
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
  }, [photos, router, setBatch, attempt]);

  if (error) {
    const copy: Record<ScanError, { title: string; body: string }> = {
      unavailable: { title: 'Photo reading isn’t available here', body: 'Open Mago from the Claude app or claude.ai to let it read your photos. You can still add products by hand.' },
      not_granted: { title: 'Mago needs your OK to read photos', body: 'Tap Try again and choose Allow when Claude asks to look at your images.' },
      busy: { title: 'Too many photos at once', body: 'Give it a minute, then tap Try again.' },
      bad_photo: { title: 'We couldn’t open these photos', body: 'Try a JPEG or a screenshot of the photo, or take a new one.' },
      failed: { title: 'Something interrupted the reading', body: 'Check your connection and tap Try again.' },
    };
    return (
      <Screen
        header={<TopBar title="Reading your products" />}
        footer={
          <View style={{ gap: space.s }}>
            <Button label="Try again" onPress={() => {
              setError(null);
              setProgress(0);
              setAttempt((a) => a + 1);
            }} />
            <Button variant="ghost" label="Name them by hand" onPress={() => router.replace('/bag/review?unread=1')} />
          </View>
        }
      >
        <StateView icon="camera" title={copy[error].title} body={copy[error].body} style={{ marginTop: space.x4 }} />
      </Screen>
    );
  }

  return (
    <Screen header={<TopBar title="Reading your products" />}>
      <Txt variant="title2" accessibilityRole="header" style={{ marginTop: space.l }} accessibilityLiveRegion="polite">
        {found !== null
          ? `Found ${found} ${found === 1 ? 'product' : 'products'}`
          : photos.length === 1
            ? 'Reading your photo…'
            : `Reading photo ${Math.min(progress + 1, photos.length)} of ${photos.length}…`}
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        Mago looks at every product in each photo — zooming in to read brand, name and shade — sorts it into your bag and counts identical ones. You’ll check everything next.
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
