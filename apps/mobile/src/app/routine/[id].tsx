import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { needsCheck, simplifyRoutine } from '@mago/shared';
import { StepProducts } from '@/components/StepProducts';
import { BagCheckCard, useBagCheck } from '@/components/BagCheck';
import { Screen, TopBar, RoundButton } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Chip, Eyebrow, LookPhoto, stepCount } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { StateView } from '@/components/States';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { routineImage } from '@/design/media';
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
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const routine = useRoutine(id);
  const saved = useLibrary((s) => (id ? s.items[id] : undefined));
  const lib = useLibrary();
  const isPro = useAccount((s) => s.isPro);
  const recordSimplify = useAccount((s) => s.recordSimplify);
  const skill = useProfile((s) => s.skill);
  const [showHints, setShowHints] = useState(showHintsByDefault(skill));
  const [showCollections, setShowCollections] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

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

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function ensureSaved() {
    if (!saved) {
      lib.save(r);
      haptic.success();
      track('routine_saved', { source: 'detail' });
      flash('Saved to Library');
    }
  }

  function toggleSave() {
    if (saved) {
      lib.remove(r.id);
      haptic.select();
      flash('Removed from Library');
    } else ensureSaved();
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

  const eyebrow = [r.category, ...r.occasion.slice(0, 2)].join(' · ');

  return (
    <Screen
      mood="none"
      edgeToEdge
      footer={
        <Button
          label={`Start the look · ${r.totalTimeMin} min`}
          onPress={() => {
            ensureSaved();
            router.push(`/brief/${r.id}`);
          }}
        />
      }
    >
      {/* Full-bleed hero photo with glass controls over it. */}
      <View style={[styles.hero, { marginHorizontal: -space.xl, height: Math.min(520, Math.round(height * 0.58)) }]}>
        <LookPhoto image={routineImage(r)} style={StyleSheet.absoluteFill} accessibilityLabel={r.title} />
        <LinearGradient colors={['rgba(10,6,8,0.55)', 'rgba(10,6,8,0)']} style={styles.heroTopScrim} />
        <View style={[styles.heroBar, { top: insets.top + space.s }]}>
          <RoundButton onPhoto icon="chevronLeft" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <RoundButton onPhoto icon="bookmark" filled={!!saved} selected={!!saved} label={saved ? 'Saved to Library. Tap to remove' : 'Save this look'} onPress={toggleSave} />
        </View>
        {source === 'youtube' && r.source.videoId ? (
          <PressableScale accessibilityLabel="Watch the tutorial in YouTube" onPress={() => watch()} style={[styles.heroWatch, { backgroundColor: c.glassOnPhoto }]}>
            <Icon name="play" size={16} color={c.inkOnPhoto} filled />
            <Txt variant="subhead" style={{ color: c.inkOnPhoto, fontWeight: '600' }}>
              Watch the tutorial
            </Txt>
          </PressableScale>
        ) : null}
      </View>

      {fresh || already ? (
        <View style={[styles.banner, { backgroundColor: c.surface }]}>
          <Icon name={fresh ? 'check' : 'info'} size={18} color={c.inkSecondary} />
          <Txt variant="callout" style={{ flex: 1 }}>
            {fresh ? 'Saved to your looks.' : 'You already saved this one.'}
          </Txt>
        </View>
      ) : null}
      {saved?.isDemoContent ? (
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
          Preview: these are sample steps, not read from this video yet.
        </Txt>
      ) : null}

      <View style={{ gap: space.s, marginTop: space.xxl }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Txt variant="title1" accessibilityRole="header">
          {r.title}
        </Txt>
        <Txt variant="callout" tone="secondary">
          {sourceLabel}
          {r.creator && r.creator.name !== 'Mago sample' && r.creator.name !== 'You' ? ` · ${r.creator.name}` : ''}
          {saved && saved.doneCount > 0 ? ` · Done ${saved.doneCount}×` : ''}
        </Txt>
      </View>

      <View style={styles.stats} accessible accessibilityLabel={`${r.totalTimeMin} minutes, ${stepCount(r)} steps${bagCheck ? `, ${bagCheck.have + bagCheck.swaps} of ${r.products.length} products covered by your bag` : `, ${r.products.length} products`}`}>
        <Stat value={String(r.totalTimeMin)} label="minutes" />
        <Stat value={String(stepCount(r))} label="steps" />
        {bagCheck ? <Stat value={String(bagCheck.have + bagCheck.swaps)} of={r.products.length} label="in your bag" /> : <Stat value={String(r.products.length)} label="products" />}
      </View>

      <View style={styles.actions}>
        <IconAction
          icon="heart"
          label={saved?.favorite ? 'Favorite' : 'Favorite'}
          active={!!saved?.favorite}
          onPress={() => {
            ensureSaved();
            lib.toggleFavorite(r.id);
          }}
        />
        <IconAction icon="bookmark" label="Collections" active={showCollections} onPress={() => setShowCollections(!showCollections)} />
        <IconAction
          icon="calendar"
          label="Plan"
          active={false}
          onPress={() => {
            ensureSaved();
            router.push(`/plan/${r.id}`);
          }}
        />
        <IconAction icon="share" label="Share" active={false} onPress={() => router.push(`/share/${r.id}`)} />
        {saved ? <IconAction icon="pencil" label="Edit" active={false} onPress={() => router.push(`/add/manual?edit=${r.id}`)} /> : null}
      </View>
      {showCollections ? (
        <View style={styles.chips}>
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

      <PressableScale onPress={simplify} accessibilityLabel="Simplify my routine. Pro feature." scaleTo={0.985} style={[styles.simplify, { backgroundColor: c.surface }]}>
        <View style={{ flex: 1, gap: 4 }}>
          {!isPro ? <Eyebrow>Mago Pro</Eyebrow> : null}
          <Txt variant="headline">{variant ? 'Open the simplified version' : original ? 'This is a simplified version' : 'Simplify this look'}</Txt>
          <Txt variant="footnote" tone="secondary">
            {original ? `The original has ${stepCount(original)} steps` : 'Keep the key steps, about 40% shorter'}
          </Txt>
        </View>
        <Icon name="chevronRight" size={20} color={c.inkSecondary} />
      </PressableScale>
      {original ? <Button variant="ghost" label="Switch to the original" onPress={() => router.replace(`/routine/${original.id}`)} /> : null}

      <View style={{ marginTop: space.xxl }}>
        <BagCheckCard routine={r} />
      </View>

      {r.products.length > 0 ? (
        <View style={{ marginTop: space.x4 }}>
          <StepProducts products={r.products} title={`In this look · ${r.products.length}`} matches={bagMatches} />
        </View>
      ) : null}

      <View style={styles.stepsHead}>
        <Txt variant="title3">Steps</Txt>
        <PressableScale accessibilityLabel={showHints ? 'Hide tips' : 'Show tips'} onPress={() => setShowHints(!showHints)} style={styles.hintToggle}>
          <Txt variant="subhead" style={{ color: c.primary }}>
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
          <View key={`${sec.name}-${si}`} style={{ marginTop: space.xxl }}>
            <Eyebrow style={{ marginBottom: space.s }}>{sec.name}</Eyebrow>
            {sec.steps.map((st, i) => (
              <View key={st.id} style={[styles.step, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairlineStrong }]}>
                <Txt variant="title3" tone="secondary" style={styles.stepNum}>
                  {offset + i + 1}
                </Txt>
                <View style={{ flex: 1, gap: space.s }}>
                  <Txt variant="body">{st.text}</Txt>
                  {showHints && st.hint ? (
                    <Txt variant="callout" tone="secondary">
                      {st.hint}
                    </Txt>
                  ) : null}
                  <StepProducts title="" matches={bagMatches} products={st.productRefs.map((ref) => productsByRef.get(ref)).filter((p): p is NonNullable<typeof p> => !!p)} />
                  {source === 'youtube' && st.timestampSec !== undefined ? (
                    <PressableScale accessibilityLabel={`Watch step ${offset + i + 1} in YouTube`} onPress={() => watch(st.timestampSec)} style={styles.watch}>
                      <Icon name="play" size={14} color={c.primary} filled />
                      <Txt variant="footnote" style={{ color: c.primary, fontWeight: '600' }}>
                        Watch · {fmt(st.timestampSec)}
                      </Txt>
                    </PressableScale>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        );
      })}

      {saved ? (
        <Button
          variant="ghost"
          label="Remove from my looks"
          icon="trash"
          onPress={() => {
            lib.remove(r.id);
            router.back();
          }}
          style={{ marginTop: space.xl }}
        />
      ) : null}
      {toast ? (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: c.ink, bottom: 104 + insets.bottom }]}>
          <Icon name="check" size={14} color={c.bg} strokeWidth={2.2} />
          <Txt variant="subhead" style={{ color: c.bg }}>
            {toast}
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}

function IconAction({ icon, label, active, onPress }: { icon: 'heart' | 'bookmark' | 'calendar' | 'share' | 'pencil'; label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={styles.iconAction}
    >
      <Icon name={icon} size={24} color={active ? c.primary : c.ink} filled={active} />
      <Txt variant="footnote" tone={active ? 'ink' : 'secondary'}>
        {label}
      </Txt>
    </PressableScale>
  );
}

function Stat({ value, of, label }: { value: string; of?: number; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="title3" style={{ fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }}>
        {value}
        {of !== undefined ? (
          <Txt variant="headline" tone="secondary">
            /{of}
          </Txt>
        ) : null}
      </Txt>
      <Txt variant="footnote" tone="secondary">
        {label}
      </Txt>
    </View>
  );
}

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet, borderCurve: 'continuous' },
  heroTopScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 170 },
  heroBar: { position: 'absolute', left: space.l, right: space.l, flexDirection: 'row', justifyContent: 'space-between' },
  heroWatch: { position: 'absolute', left: space.xl, bottom: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 44, paddingHorizontal: space.l, borderRadius: radius.pill },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.l, padding: space.m, borderRadius: radius.thumb },
  stats: { flexDirection: 'row', gap: space.m, marginTop: space.xl },
  actions: { flexDirection: 'row', gap: space.m, marginTop: space.xl },
  toast: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.s, height: 40, paddingHorizontal: space.l, borderRadius: 20 },
  iconAction: { alignItems: 'center', gap: 4, minWidth: 64, minHeight: 56, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  simplify: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.xl, padding: space.l, borderRadius: radius.thumb },
  stepsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.x4 },
  hintToggle: { minHeight: 44, justifyContent: 'center' },
  warn: { flexDirection: 'row', gap: space.s, alignItems: 'center', padding: space.m, borderRadius: radius.chip, marginTop: space.s },
  step: { flexDirection: 'row', gap: space.l, paddingVertical: space.l },
  stepNum: { width: 28, fontVariant: ['tabular-nums'] },
  watch: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, alignSelf: 'flex-start' },
});
