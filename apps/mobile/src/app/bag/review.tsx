import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Skeleton } from '@/components/States';
import { BagItemForm, type Draft } from '@/components/BagItemForm';
import { space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useBag, useScanDraft } from '@/data/bag';
import { bagCount, isSameProduct } from '@mago/shared';
import { draftFrom, readProductPhotos } from '@/services/scanService';
import { photoData } from '@/services/photoData';
import { isDemo } from '@/services/config';
import { track } from '@/services/analytics';

/** Review what Mago read from the photos (or add by hand) before anything is saved. */
export default function Review() {
  const router = useRouter();
  const { manual, unread } = useLocalSearchParams<{ manual?: string; unread?: string }>();
  const photos = useScanDraft((s) => s.photos);
  const add = useBag((s) => s.add);
  const [drafts, setDrafts] = useState<Draft[] | null>(manual ? [{ name: '' }] : unread ? photos.map((photoUri) => ({ name: '', photoUri })) : null);

  useEffect(() => {
    if (manual || unread) return;
    let alive = true;
    void readProductPhotos(photos, photoData.get).then((results) => {
      if (alive) setDrafts(results.flatMap(draftFrom));
    });
    return () => {
      alive = false;
    };
  }, [manual, unread, photos]);

  const ready = (drafts ?? []).filter((d) => d.name.trim());
  const bag = useBag((s) => s.items);
  const setLastResult = useScanDraft((s) => s.setLastResult);

  /** D-25: tell her before saving when a product is already in her bag, or repeated in this batch. */
  function noteFor(i: number): string | undefined {
    const d = drafts?.[i];
    if (!d || !d.name.trim()) return undefined;
    const earlier = drafts!.slice(0, i).findIndex((x) => x.name.trim() && isSameProduct(x, d));
    if (earlier >= 0) return `Same as product ${earlier + 1} — they’ll be saved together as one, with the counts added.`;
    const owned = bag.find((b) => isSameProduct(b, d));
    if (owned) return `Already in your bag (×${bagCount(owned)}). Saving makes it ×${bagCount(owned) + Math.max(1, d.count ?? 1)}.`;
    return undefined;
  }

  function save() {
    const res = add(ready.map((d) => ({ ...d, name: d.name.trim() })));
    setLastResult({ added: res.added.length, updated: res.merged.map((m) => ({ name: m.item.name, count: bagCount(m.item) })) });
    track('bag_item_added', { count: res.added.length, source: manual ? 'manual' : 'scan' });
    if (res.merged.length) track('bag_item_merged', { count: res.merged.length });
    photoData.clear();
    haptic.success();
    // Return to the bag without stacking a second copy of it.
    router.dismissTo('/bag');
  }

  return (
    <Screen
      header={<TopBar title={manual ? 'Add a product' : 'Check your products'} />}
      footer={
        <Button
          variant="hero"
          label={ready.length > 1 ? `Add ${ready.length} to my bag` : 'Add to my bag'}
          disabled={ready.length === 0}
          onPress={save}
        />
      }
    >
      {drafts === null ? (
        <View style={{ gap: space.l, marginTop: space.xl }}>
          <Txt variant="headline">Reading your products…</Txt>
          {photos.map((p) => (
            <Card key={p} style={{ gap: space.m }}>
              <Skeleton height={20} width="60%" />
              <Skeleton height={14} width="40%" />
            </Card>
          ))}
        </View>
      ) : (
        <>
          <Txt variant="callout" tone="secondary" style={{ marginTop: space.l }}>
            {manual
              ? 'Name it and tap what it is — that’s all Mago needs.'
              : drafts.some((d) => d.name.trim())
                ? 'Here’s what Mago read from your photos. Fix anything that’s off, then add them.'
                : unread || !isDemo
                  ? 'We couldn’t read these labels. Name each product and tap what it is.'
                  : 'Name each product and tap what it is.'}
          </Txt>
          <View style={{ gap: space.l, marginTop: space.l }}>
            {drafts.map((d, i) => (
              <Card key={i}>
                <BagItemForm
                  note={noteFor(i)}
                  value={d}
                  onChange={(next) => setDrafts(drafts.map((x, j) => (j === i ? next : x)))}
                  onRemove={drafts.length > 1 ? () => setDrafts(drafts.filter((_, j) => j !== i)) : undefined}
                />
              </Card>
            ))}
          </View>
          <Button variant="secondary" icon="plus" label="Add another product" onPress={() => setDrafts([...drafts, { name: '' }])} style={{ marginTop: space.l }} />
        </>
      )}
    </Screen>
  );
}
