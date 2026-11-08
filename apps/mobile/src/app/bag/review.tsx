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
import { draftFrom, readProductPhotos } from '@/services/scanService';
import { photoData } from '@/services/photoData';
import { isDemo } from '@/services/config';
import { track } from '@/services/analytics';

/** Review what Mago read from the photos (or add by hand) before anything is saved. */
export default function Review() {
  const router = useRouter();
  const { manual } = useLocalSearchParams<{ manual?: string }>();
  const photos = useScanDraft((s) => s.photos);
  const add = useBag((s) => s.add);
  const [drafts, setDrafts] = useState<Draft[] | null>(manual ? [{ name: '' }] : null);

  useEffect(() => {
    if (manual) return;
    let alive = true;
    void readProductPhotos(photos, photoData.get).then((results) => {
      if (alive) setDrafts(results.flatMap(draftFrom));
    });
    return () => {
      alive = false;
    };
  }, [manual, photos]);

  const ready = (drafts ?? []).filter((d) => d.name.trim());

  function save() {
    add(ready.map((d) => ({ ...d, name: d.name.trim() })));
    track('bag_item_added', { count: ready.length, source: manual ? 'manual' : 'scan' });
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
              : isDemo
                ? 'Demo mode: name each product and tap what it is. In the full app Mago reads the label for you and you just check it.'
                : 'Here’s what Mago read. Fix anything that’s off, then add them.'}
          </Txt>
          <View style={{ gap: space.l, marginTop: space.l }}>
            {drafts.map((d, i) => (
              <Card key={i}>
                <BagItemForm
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
