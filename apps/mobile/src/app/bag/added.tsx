import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BAG_CATEGORIES, bagCategory, bagCount, productRole, SCAN_REVIEW_CONFIDENCE, type BagItem } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Bits';
import { StateView } from '@/components/States';
import { PressableScale } from '@/components/PressableScale';
import { BagThumb, roleLabel } from '@/components/BagItemForm';
import { QtyStepper } from '@/components/Cart';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useBag, useScanDraft } from '@/data/bag';
import { track } from '@/services/analytics';

type Entry = { item: BagItem; plus: number; prevCount: number; isNew: boolean; seenInPhotos: number };

/**
 * D-26 review: everything the photo scan added is ALREADY in her bag. Here she checks it —
 * especially how many — fixes anything Mago wasn't sure about, removes mistakes (with Undo),
 * and names any photo Mago couldn't read.
 */
export default function ReviewAdded() {
  const router = useRouter();
  const { c } = useTheme();
  const batch = useScanDraft((s) => s.batch);
  const setPhotos = useScanDraft((s) => s.setPhotos);
  const setBatch = useScanDraft((s) => s.setBatch);
  const items = useBag((s) => s.items);
  const setCount = useBag((s) => s.setCount);
  const remove = useBag((s) => s.remove);
  const restore = useBag((s) => s.restore);
  const markReviewed = useBag((s) => s.markReviewed);
  const [onlyUnsure, setOnlyUnsure] = useState(false);
  const [undo, setUndo] = useState<BagItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entries: Entry[] = useMemo(
    () =>
      (batch?.entries ?? [])
        .flatMap((e) => {
          const item = items.find((i) => i.id === e.id);
          return item ? [{ item, plus: e.plus, prevCount: e.prevCount, isNew: e.isNew, seenInPhotos: e.seenInPhotos }] : [];
        }),
    [batch, items],
  );
  const unsure = (e: Entry) => (e.item.confidence ?? 1) < SCAN_REVIEW_CONFIDENCE;
  const unsureCount = entries.filter(unsure).length;
  const shown = onlyUnsure ? entries.filter(unsure) : entries;
  const groups = BAG_CATEGORIES.map((cat) => ({ cat, list: shown.filter((e) => bagCategory(e.item) === cat) })).filter((g) => g.list.length);
  const units = entries.reduce((n, e) => n + bagCount(e.item), 0);

  function done() {
    markReviewed(entries.map((e) => e.item.id));
    track('bag_review_done', { products: entries.length, unsure: unsureCount });
    setBatch(null);
    haptic.success();
    router.dismissTo('/bag');
  }

  function onRemove(it: BagItem) {
    remove(it.id);
    track('bag_review_removed', {});
    setUndo(it);
    AccessibilityInfo.announceForAccessibility(`${it.name} removed from your bag`);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndo(null), 5000);
  }

  if (!batch) {
    return (
      <Screen header={<TopBar title="Check your bag" />}>
        <StateView icon="bag" title="Nothing to check" body="Products you add from photos show up here for a quick check." actionLabel="Open my bag" onAction={() => router.replace('/bag')} style={{ marginTop: space.x4 }} />
      </Screen>
    );
  }

  return (
    <Screen
      header={<TopBar title="Check your bag" backIcon="close" backLabel="Done" onBack={done} />}
      footer={<Button label={unsureCount ? `Looks right · ${entries.length} products` : 'Looks right'} onPress={done} />}
    >
      <Txt variant="title2" accessibilityRole="header" style={{ marginTop: space.l }}>
        Added {entries.length} {entries.length === 1 ? 'product' : 'products'} from {batch.photos} {batch.photos === 1 ? 'photo' : 'photos'}
      </Txt>
      <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
        They’re in your bag already — {units} {units === 1 ? 'item' : 'items'} in all. Check the quantities, and anything marked “Check this”. Tap a product to fix its name, brand or shade.
      </Txt>

      {undo ? (
        <View style={[styles.undo, { backgroundColor: c.ink }]} accessibilityLiveRegion="polite">
          <Txt variant="callout" style={{ color: c.bg, flex: 1 }} numberOfLines={1}>
            Removed {undo.name}
          </Txt>
          <PressableScale accessibilityLabel={`Undo, put ${undo.name} back`} onPress={() => { restore(undo); setUndo(null); }} style={styles.undoBtn}>
            <Txt variant="subhead" style={{ color: c.bg, fontWeight: '700' }}>
              Undo
            </Txt>
          </PressableScale>
        </View>
      ) : null}

      {unsureCount ? (
        <View style={[styles.chips, { marginTop: space.l }]}>
          <Chip label={`All ${entries.length}`} selected={!onlyUnsure} onPress={() => setOnlyUnsure(false)} />
          <Chip label={`Check these ${unsureCount}`} selected={onlyUnsure} onPress={() => setOnlyUnsure(true)} />
        </View>
      ) : null}

      {groups.map((g) => (
        <View key={g.cat} style={{ marginTop: space.xl, gap: space.s }}>
          <Txt variant="title3" accessibilityRole="header">
            {g.cat} · {g.list.length}
          </Txt>
          {g.list.map((e) => (
            <ReviewRow key={e.item.id} e={e} unsure={unsure(e)} onCount={(n) => (n <= 0 ? onRemove(e.item) : (setCount(e.item.id, n), track('bag_review_count_changed', {})))} onOpen={() => router.push(`/bag/item/${e.item.id}`)} />
          ))}
        </View>
      ))}

      {batch.unreadPhotos.length ? (
        <View style={[styles.unread, { backgroundColor: c.surface }]}>
          <Txt variant="headline">
            {batch.unreadPhotos.length === 1 ? 'We couldn’t read 1 photo' : `We couldn’t read ${batch.unreadPhotos.length} photos`}
          </Txt>
          <Txt variant="footnote" tone="secondary">
            The labels may be blurry or turned away. Name those products yourself, or try a closer photo.
          </Txt>
          <Button
            variant="secondary"
            icon="pencil"
            label="Name them by hand"
            onPress={() => {
              setPhotos(batch.unreadPhotos);
              router.push('/bag/review?unread=1');
            }}
          />
        </View>
      ) : null}
      <View style={{ height: space.xxl }} />
    </Screen>
  );
}

function ReviewRow({ e, unsure, onCount, onOpen }: { e: Entry; unsure: boolean; onCount: (n: number) => void; onOpen: () => void }) {
  const { c } = useTheme();
  const it = e.item;
  const n = bagCount(it);
  const sub = [it.brand, it.type ?? roleLabel(it.role ?? productRole(it)), it.shade].filter(Boolean).join(' · ');
  const note = e.isNew
    ? e.seenInPhotos > 1
      ? `Seen in ${e.seenInPhotos} photos — counted once`
      : null
    : `You already had ${e.prevCount} — now ${n}`;
  return (
    <View style={[styles.row, { backgroundColor: c.surface }]}>
      <PressableScale onPress={onOpen} accessibilityLabel={`${it.name}${sub ? `, ${sub}` : ''}. ${unsure ? 'Check this. ' : ''}Edit`} scaleTo={0.985} style={styles.rowMain}>
        <BagThumb item={it} size={56} />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Txt variant="headline" numberOfLines={2} style={{ flexShrink: 1 }}>
              {it.name}
            </Txt>
            {unsure ? (
              <View style={[styles.flag, { borderColor: c.warningInk }]}>
                <Txt variant="caption" style={{ color: c.warningInk, fontWeight: '600' }}>
                  Check this
                </Txt>
              </View>
            ) : null}
          </View>
          {sub ? (
            <Txt variant="footnote" tone="secondary" numberOfLines={2}>
              {sub}
            </Txt>
          ) : null}
          {note ? (
            <Txt variant="footnote" style={{ color: c.primary }}>
              {note}
            </Txt>
          ) : null}
        </View>
      </PressableScale>
      <View style={styles.qty}>
        <Txt variant="caption" tone="secondary">
          How many
        </Txt>
        <QtyStepper value={n} min={1} max={99} label={it.name} onChange={onCount} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  row: { borderRadius: radius.card, padding: space.m, gap: space.s },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s, flexWrap: 'wrap' },
  flag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.s, paddingVertical: 1 },
  qty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  undo: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingLeft: space.l, borderRadius: radius.thumb, marginTop: space.m },
  undoBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.l },
  unread: { borderRadius: radius.card, padding: space.l, gap: space.s, marginTop: space.xl },
});
