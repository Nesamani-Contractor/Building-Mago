import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { OCCASIONS, type Category, type Occasion, type Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Eyebrow, LookPhoto, OccasionTile, SectionHeader } from '@/components/Bits';
import { Greeting, LookTile } from '@/components/LookActions';
import { PressableScale } from '@/components/PressableScale';
import { StateView } from '@/components/States';
import { GlassButton, LoopVideo, PhotoScrim, Segments } from '@/components/Wow';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/design/theme';
import { fonts, layout, palette, space } from '@/design/tokens';
import { LOOPS, OCCASION_PHOTO, PHOTOS, VIBES, photo, type Vibe } from '@/design/media';
import { useLibrary } from '@/data/library';
import { OCCASION_TILES, SAMPLE_ROUTINES } from '@/data/samples';
import { haptic } from '@/design/haptics';

const VIBE_LOOK: Record<Vibe, string> = {
  soft: 'sample-soft-glam',
  clean: 'sample-dewy-skin',
  night: 'sample-party-liner',
  bold: 'sample-glossy-lips',
};

const CATEGORY_FILTER: Record<string, { title: string; cats: Category[] }> = {
  makeup: { title: 'Makeup looks', cats: ['Eyes', 'Lips', 'Face/Base', 'Brows', 'Full look'] },
  skincare: { title: 'Skincare', cats: ['Skincare'] },
  hair: { title: 'Hair', cats: ['Hair'] },
  nails: { title: 'Nails', cats: [] },
};

/**
 * Discover (WOW v2): full-bleed vibe hero — "Every look, unveiled." — with the giant serif vibe
 * picker (Doji pattern), then categories, occasions, quick looks and the full grid.
 */
export default function Discover() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { cat, occ: occParam } = useLocalSearchParams<{ cat?: string; occ?: string }>();
  const items = useLibrary((s) => s.items);
  const [vibe, setVibe] = useState<Vibe>('soft');
  const [occ, setOcc] = useState<Occasion | null>(() => (OCCASIONS as readonly string[]).includes(occParam ?? '') ? (occParam as Occasion) : null);
  const heroH = Math.min(620, Math.round(height * 0.66));
  const colW = Math.floor((Math.min(width, layout.maxContentWidth) - space.xl * 2 - space.m) / 2);

  const current = VIBES.find((v) => v.id === vibe) ?? VIBES[0]!;
  const vibeLook = SAMPLE_ROUTINES.find((r) => r.id === VIBE_LOOK[vibe]) ?? SAMPLE_ROUTINES[0];
  const filter = cat ? CATEGORY_FILTER[cat] : undefined;
  const filtered = useMemo(() => (filter ? SAMPLE_ROUTINES.filter((r) => filter.cats.includes(r.category)) : []), [filter]);
  const byOcc = useMemo(() => (occ ? SAMPLE_ROUTINES.filter((r) => r.occasion.includes(occ)) : []), [occ]);
  const quick = SAMPLE_ROUTINES.filter((r) => r.totalTimeMin < 10);

  return (
    <Screen mood="none" edgeToEdge bottomInset={layout.tabBarSpace}>
      <View style={[styles.hero, { height: heroH, marginHorizontal: -space.xl }]}>
        {VIBES.map((v) => (
          <VibeLayer key={v.id} on={v.id === vibe}>
            {v.id === 'soft' ? (
              <LoopVideo video={LOOPS.softGlam.video} poster={LOOPS.softGlam.poster} style={StyleSheet.absoluteFill} accessibilityLabel="Soft glam: warm bronze lid, brushed in window light" />
            ) : (
              <LookPhoto image={{ source: PHOTOS[v.photo], focus: v.focus }} style={StyleSheet.absoluteFill} accessibilityLabel={`${v.label} look`} />
            )}
          </VibeLayer>
        ))}
        <PhotoScrim top height={150} />
        <PhotoScrim height={320} />
        <View style={[styles.heroTop, { top: insets.top + space.s }]}>
          <Segments count={VIBES.length} active={VIBES.findIndex((v) => v.id === vibe)} />
          <View style={styles.heroBar}>
            <Greeting onPhoto style={{ flex: 1 }} />
            <GlassButton icon="search" accessibilityLabel="Search your looks" onPress={() => router.push('/(tabs)/library')} />
          </View>
        </View>
        <View style={styles.heroText}>
          <Eyebrow onPhoto>Tonight · {current.label}</Eyebrow>
          <Txt variant="display" style={{ color: c.inkOnPhoto, fontSize: 44, lineHeight: 46, letterSpacing: -0.8 }} accessibilityRole="header">
            Every look, unveiled.
          </Txt>
          <View style={styles.heroRow}>
            <Txt variant="callout" style={{ color: c.inkOnPhoto, opacity: 0.92, flex: 1 }}>
              {vibeLook?.title}
            </Txt>
            {vibeLook ? (
              <PressableScale accessibilityLabel={`Unveil ${vibeLook.title}`} onPress={() => router.push(`/unveil/${vibeLook.id}`)} style={styles.heroPill}>
                <Txt variant="subhead" style={{ color: palette.plum, fontWeight: '600' }}>
                  Unveil it
                </Txt>
                <Icon name="arrowRight" size={16} color={palette.plum} strokeWidth={1.8} />
              </PressableScale>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ marginTop: space.xxl }}>
        <Eyebrow>What’s your vibe?</Eyebrow>
        <View style={styles.vibes} accessibilityRole="radiogroup">
          {VIBES.map((v) => {
            const on = v.id === vibe;
            return (
              <PressableScale
                key={v.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={v.label}
                onPress={() => {
                  if (!on) haptic.select();
                  setVibe(v.id);
                }}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Txt style={[styles.vibeWord, { color: on ? c.primary : c.ink, opacity: on ? 1 : 0.25 }]}>{v.label}</Txt>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {filter ? (
        <>
          <View style={styles.filterHead}>
            <Txt variant="title3" accessibilityRole="header" style={{ flex: 1 }}>
              {filter.title}
            </Txt>
            <PressableScale accessibilityLabel="Clear category" onPress={() => router.setParams({ cat: undefined })} style={styles.clear}>
              <Txt variant="subhead" style={{ color: c.primary }}>
                Show all
              </Txt>
            </PressableScale>
          </View>
          {filtered.length === 0 ? (
            <StateView
              icon="sparkle"
              title={`${filter.title} looks are coming soon`}
              body="Paste any tutorial you love and Mago will unveil it into steps."
              actionLabel="Unveil a look"
              onAction={() => router.push('/add')}
            />
          ) : (
            <Grid routines={filtered} colW={colW} items={items} onOpen={(r) => router.push(`/routine/${r.id}`)} />
          )}
        </>
      ) : null}

      <SectionHeader title="By occasion" />
      <Rail>
        {OCCASION_TILES.map((o) => (
          <OccasionTile
            key={o.occasion}
            label={occ === o.occasion ? `${o.label} ✓` : o.label}
            image={photo(OCCASION_PHOTO[o.occasion])}
            onPress={() => {
              haptic.select();
              setOcc(occ === o.occasion ? null : o.occasion);
            }}
          />
        ))}
      </Rail>
      {occ ? (
        <Rail>
          {byOcc.map((r) => (
            <LookTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
          ))}
        </Rail>
      ) : null}

      <SectionHeader title="Quick looks" />
      <Txt variant="footnote" tone="secondary">
        Under 10 minutes
      </Txt>
      <Rail>
        {quick.map((r) => (
          <LookTile key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
        ))}
      </Rail>

      <SectionHeader title="All looks" />
      <Grid routines={SAMPLE_ROUTINES} colW={colW} items={items} onOpen={(r) => router.push(`/routine/${r.id}`)} />
    </Screen>
  );
}

/** Each vibe's hero layer cross-fades (300 ms, never bounces). */
function VibeLayer({ on, children }: { on: boolean; children: ReactNode }) {
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    o.set(withTiming(on ? 1 : 0, { duration: 300 }));
  }, [on, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none" importantForAccessibility={on ? 'auto' : 'no-hide-descendants'}>
      {children}
    </Animated.View>
  );
}

function Grid({ routines, colW, items, onOpen }: { routines: Routine[]; colW: number; items: Record<string, unknown>; onOpen: (r: Routine) => void }) {
  return (
    <View style={styles.grid}>
      {routines.map((r) => (
        <LookTile key={r.id} width={colW} routine={r} onPress={() => onOpen(r)} badge={items[r.id] ? 'Saved' : undefined} />
      ))}
    </View>
  );
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m, paddingTop: space.m }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: '#2A1E26' },
  heroTop: { position: 'absolute', left: space.l, right: space.l, gap: 14 },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroText: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xxl + 2, gap: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: 6 },
  heroPill: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: palette.porcelain, flexDirection: 'row', alignItems: 'center', gap: 6 },
  vibes: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, marginTop: 4 },
  vibeWord: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  filterHead: { flexDirection: 'row', alignItems: 'center', marginTop: space.x4, marginBottom: space.m },
  clear: { minHeight: 44, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, rowGap: space.xl, marginTop: space.m },
});
