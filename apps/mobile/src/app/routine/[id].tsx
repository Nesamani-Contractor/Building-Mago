import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { needsCheck, simplifyRoutine } from '@mago/shared';
import { StepProducts } from '@/components/StepProducts';
import { BagCheckCard, useBagCheck } from '@/components/BagCheck';
import { Screen, TopBar, RoundButton } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card, Badge, Hairline } from '@/components/Surface';
import { Chip, routineMeta, stepCount } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { StateView } from '@/components/States';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { palette, radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useLibrary } from '@/data/library';
import { useAccount } from '@/data/account';
import { useProfile, showHintsByDefault } from '@/data/profile';
import { useRoutine } from '@/lib/routines';
import { uid } from '@/lib/id';
import { track } from '@/services/analytics';

/** M-25 Routine detail: review before doing. Full-bleed artwork fading into the background. */
export default function RoutineDetail() {
  const { id, fresh, already } = useLocalSearchParams<{ id: string; fresh?: string; already?: string }>();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const routine = useRoutine(id);
  const saved = useLibrary((s) => (id ? s.items[id] : undefined));
  const lib = useLibrary();
  const isPro = useAccount((s) => s.isPro);
  const recordSimplify = useAccount((s) => s.recordSimplify);
  const skill = useProfile((s) => s.skill);
  const [showHints, setShowHints] = useState(showHintsByDefault(skill));
  const [showCollections, setShowCollections] = useState(false);

  const productsByRef = useMemo(() => new Map(routine?.products.map((p) => [p.ref, p]) ?? []), [routine]);
  const { check: bagCheck } = useBagCheck(routine);
  const bagMatches = useMemo(() => (bagCheck ? new Map(bagCheck.matches.map((m) => [m.product.ref, m])) : undefined), [bagCheck]);

  if (!routine) {
    return (
      <Screen header={<TopBar />}>
        <StateView icon="info" title="This look isn’t here anymore" body="It may have been removed from your library." actionLabel="Open Library" onAction={() => router.replace('/(tabs)/library')} />
      </Screen>
    );
  }

  const r = routine;
  const variant = Object.values(lib.items).find((s) => s.routine.variantOf === r.id);
  const original = r.variantOf ? lib.items[r.variantOf]?.routine : undefined;
  const source = r.source.platform;
  const sourceLabel = source === 'youtube' ? 'YouTube' : source === 'upload' ? 'Your video' : source === 'manual' ? (r.creator?.name === 'Mago sample' ? 'Mago sample' : 'Written by you') : source;
  const checkCount = r.products.filter(needsCheck).length;

  function ensureSaved() {
    if (!saved) {
      lib.save(r);
      haptic.success();
      track('routine_saved', { source: 'detail' });
    }
  }

  function simplify() {
    if (!isPro) return router.push('/paywall?from=simplify');
    if (variant) return router.push(`/routine/${variant.routine.id}`);
    ensureSaved();
    const s = simplifyRoutine(r, uid('rt'));
    lib.save({ ...s, title: `${r.title} (simplified)` });
    recordSimplify();
    track('simplify_used', { from_steps: stepCount(r), to_steps: stepCount(s) });
    router.push(`/routine/${s.id}`);
  }

  function watch(ts?: number) {
    if (source === 'youtube' && r.source.videoId) {
      Linking.openURL(`https://www.youtube.com/watch?v=${r.source.videoId}${ts ? `&t=${ts}s` : ''}`);
    }
  }

  return (
    <Screen
      mood="none"
      header={
        <TopBar
          right={
            <View style={{ flexDirection: 'row', gap: space.s }}>
              {saved ? (
                <RoundButton icon="pencil" label="Edit steps" onPress={() => router.push(`/add/manual?edit=${r.id}`)} />
              ) : null}
              <RoundButton icon="share" label="Share" onPress={() => router.push(`/share/${r.id}`)} />
            </View>
          }
        />
      }
      footer={
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <Button
            variant="secondary"
            label="Plan"
            icon="calendar"
            onPress={() => {
              ensureSaved();
              router.push(`/plan/${r.id}`);
            }}
            style={{ flex: 0.8 }}
          />
          <Button
            variant="hero"
            label="Start this look"
            onPress={() => {
              ensureSaved();
              router.push(`/brief/${r.id}`);
            }}
            style={{ flex: 1.4 }}
          />
        </View>
      }
    >
      {/* Full-bleed artwork with a warm fade into the background. */}
      <View style={[styles.hero, { marginHorizontal: -space.xl }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LinearGradient colors={isDark ? ['#3A2632', c.bg] : [palette.champagne, palette.peach, c.bg]} locations={isDark ? [0, 1] : [0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.heroMark, { borderColor: c.hairlineStrong, backgroundColor: c.glass }]}>
          {source === 'youtube' ? <Icon name="play" size={26} /> : <Icon name="sparkle" size={26} />}
        </View>
      </View>

      {fresh ? (
        <Card variant="outline" style={styles.banner}>
          <Icon name="check" size={20} />
          <Txt variant="callout" style={{ flex: 1 }}>
            Saved to your library.
          </Txt>
        </Card>
      ) : null}
      {already ? (
        <Card variant="outline" style={styles.banner}>
          <Icon name="info" size={20} />
          <Txt variant="callout" style={{ flex: 1 }}>
            You already saved this one.
          </Txt>
        </Card>
      ) : null}
      {saved?.isDemoContent ? (
        <Card variant="outline" style={styles.banner}>
          <Icon name="info" size={20} />
          <Txt variant="footnote" tone="secondary" style={{ flex: 1 }}>
            Demo mode: these are sample steps, not read from this video. The full build writes real steps from the tutorial.
          </Txt>
        </Card>
      ) : null}

      <View style={{ gap: space.s, marginTop: space.l }}>
        <View style={styles.metaRow}>
          <Badge label={r.category} />
          {r.occasion.slice(0, 2).map((o) => (
            <Badge key={o} label={o} />
          ))}
        </View>
        <Txt variant="title1" accessibilityRole="header">
          {r.title}
        </Txt>
        <Txt variant="callout" tone="secondary">
          {routineMeta(r)}
        </Txt>
        <Txt variant="footnote" tone="secondary">
          {sourceLabel}
          {r.creator && r.creator.name !== 'Mago sample' && r.creator.name !== 'You' ? ` · ${r.creator.name}` : ''}
          {saved && saved.doneCount > 0 ? ` · Done ${saved.doneCount} ${saved.doneCount === 1 ? 'time' : 'times'}` : ''}
        </Txt>
      </View>

      <View style={styles.actions}>
        <Chip
          label={saved?.favorite ? 'Favorite' : 'Add to favorites'}
          icon="heart"
          selected={!!saved?.favorite}
          onPress={() => {
            ensureSaved();
            lib.toggleFavorite(r.id);
          }}
        />
        <Chip label="Collections" icon="bookmark" selected={showCollections} onPress={() => setShowCollections(!showCollections)} />
        <Chip label={saved?.pinned ? 'Pinned' : 'Pin to Today'} icon="pin" selected={!!saved?.pinned} onPress={() => { ensureSaved(); lib.togglePinned(r.id); }} />
      </View>
      {showCollections ? (
        <View style={styles.actions}>
          {lib.collections.map((col) => (
            <Chip
              key={col.id}
              label={col.name}
              selected={!!saved?.collectionIds.includes(col.id)}
              onPress={() => {
                ensureSaved();
                lib.toggleInCollection(r.id, col.id);
              }}
            />
          ))}
        </View>
      ) : null}

      <PressableScale onPress={simplify} accessibilityLabel="Simplify my routine. Pro feature." style={{ marginTop: space.l }}>
        <Card variant="outline" style={styles.simplify}>
          <Icon name="wand" size={22} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{variant ? 'Open simplified version' : original ? 'This is a simplified version' : 'Simplify my routine'}</Txt>
            <Txt variant="footnote" tone="secondary">
              {original ? `Original has ${stepCount(original)} steps` : 'Keep the key steps, about 40% shorter'}
            </Txt>
          </View>
          {!isPro ? <Badge label="Pro" /> : <Icon name="chevronRight" size={18} />}
        </Card>
      </PressableScale>
      {original ? <Button variant="ghost" label="Switch to the original" onPress={() => router.replace(`/routine/${original.id}`)} /> : null}

      <View style={{ marginTop: space.xxl }}>
        <BagCheckCard routine={r} />
      </View>

      {r.products.length > 0 ? (
        <View style={{ marginTop: space.xxl, gap: space.m }}>
          <Txt variant="title3">Products in this look</Txt>
          <StepProducts products={r.products} title={`${r.products.length} products`} note />
        </View>
      ) : null}

      <View style={styles.stepsHead}>
        <Txt variant="title3">Steps</Txt>
        <PressableScale accessibilityLabel={showHints ? 'Hide tips' : 'Show tips'} onPress={() => setShowHints(!showHints)} style={styles.hintToggle}>
          <Txt variant="subhead" style={{ textDecorationLine: 'underline', textDecorationColor: c.accent }}>
            {showHints ? 'Hide tips' : 'Show tips'}
          </Txt>
        </PressableScale>
      </View>
      {checkCount > 0 ? (
        <View style={[styles.warn, { backgroundColor: c.warningBg }]}>
          <Icon name="info" size={18} color={c.warningInk} />
          <Txt variant="footnote" tone="warning" style={{ flex: 1 }}>
            {checkCount === 1 ? 'One product' : `${checkCount} products`} marked “Check this” — we weren’t sure. Tap Edit to fix.
          </Txt>
        </View>
      ) : null}

      {r.sections.map((sec, si) => {
        const offset = r.sections.slice(0, si).reduce((n, s) => n + s.steps.length, 0);
        return (
          <Card key={`${sec.name}-${si}`} style={{ marginTop: space.l, gap: space.l }}>
            <Txt variant="caption" tone="secondary" style={{ letterSpacing: 1.2 }}>
              {sec.name.toUpperCase()}
            </Txt>
            {sec.steps.map((st, i) => (
              <View key={st.id} style={{ gap: space.s }}>
                {i > 0 ? <Hairline style={{ marginBottom: space.s }} /> : null}
                <View style={styles.step}>
                  <Txt variant="title3" style={{ width: 28 }}>
                    {offset + i + 1}
                  </Txt>
                  <View style={{ flex: 1, gap: space.s }}>
                    <Txt variant="body">{st.text}</Txt>
                    {showHints && st.hint ? (
                      <Txt variant="callout" tone="secondary">
                        {st.hint}
                      </Txt>
                    ) : null}
                    <StepProducts matches={bagMatches} products={st.productRefs.map((ref) => productsByRef.get(ref)).filter((p): p is NonNullable<typeof p> => !!p)} />
                    {source === 'youtube' && st.timestampSec !== undefined ? (
                      <PressableScale accessibilityLabel={`Watch step ${offset + i + 1} in YouTube`} onPress={() => watch(st.timestampSec)} style={styles.watch}>
                        <Icon name="play" size={16} />
                        <Txt variant="footnote">Watch this step · {fmt(st.timestampSec)}</Txt>
                      </PressableScale>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        );
      })}

      {saved ? (
        <Button
          variant="ghost"
          label="Remove from library"
          icon="trash"
          onPress={() => {
            lib.remove(r.id);
            router.back();
          }}
          style={{ marginTop: space.xl }}
        />
      ) : null}
    </Screen>
  );
}

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  hero: { height: 200, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card, overflow: 'hidden' },
  heroMark: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.l, paddingVertical: space.m },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.l },
  simplify: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  stepsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xxl },
  hintToggle: { minHeight: 44, justifyContent: 'center' },
  warn: { flexDirection: 'row', gap: space.s, alignItems: 'center', padding: space.m, borderRadius: radius.chip, marginTop: space.s },
  step: { flexDirection: 'row', gap: space.m },
  watch: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, alignSelf: 'flex-start' },
});
