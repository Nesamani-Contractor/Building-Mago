import React, { useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { LookPhoto, RoutineRow, stepCount } from '@/components/Bits';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { fonts, layout, radius, space } from '@/design/tokens';
import { photo, routineImage, type LookImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { useLibrary, IMPORT_STAGES } from '@/data/library';
import { useSessions, resumableSession } from '@/data/sessions';
import { useProfile } from '@/data/profile';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { findRoutine } from '@/lib/routines';
import { extractFirstUrl } from '@mago/shared';

type CategoryId = 'makeup' | 'skincare' | 'hair' | 'nails' | 'tools';
const CATEGORIES: { id: CategoryId; label: string; image: LookImage }[] = [
  { id: 'makeup', label: 'Makeup', image: { ...photo('palette'), focus: '30% 55%' } },
  { id: 'skincare', label: 'Skincare', image: photo('dewySkin') },
  { id: 'hair', label: 'Hair', image: { ...photo('heroClean'), focus: '30% 30%' } },
  { id: 'nails', label: 'Nails', image: { ...photo('brows'), focus: '88% 18%' } },
  { id: 'tools', label: 'Tools', image: { ...photo('flatlay'), focus: '70% 45%' } },
];

/**
 * Home — "Discover Your Beauty" (rose accents, D-21). Header · serif hero · search-or-paste ·
 * category circles · New Looks banner · Trending Now. Plus her in-progress look and imports.
 */
export default function Home() {
  const router = useRouter();
  const { c } = useTheme();
  const name = useProfile((s) => s.name);
  const items = useLibrary((s) => s.items);
  const imports = useLibrary((s) => s.imports);
  const sessions = useSessions((s) => s.sessions);
  const [query, setQuery] = useState('');
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  const resume = resumableSession(sessions);
  const resumeRoutine = resume ? findRoutine(resume.routineId) : undefined;
  const inFlight = Object.values(imports).filter((j) => j.status === 'processing' || j.status === 'pending_offline');
  const trending = useMemo(() => [...SAMPLE_ROUTINES].sort((a, b) => stepCount(a) - stepCount(b)), []);
  const fresh = useMemo(() => SAMPLE_ROUTINES.filter((r) => !items[r.id]), [items]);

  function submit() {
    const q = query.trim();
    if (!q) return;
    if (extractFirstUrl(q)) router.push(`/add?link=${encodeURIComponent(q)}`);
    else router.push(`/(tabs)/library?q=${encodeURIComponent(q)}`);
  }

  function openCategory(id: CategoryId) {
    haptic.select();
    if (id === 'tools') router.push('/bag');
    else router.push(`/(tabs)/discover?cat=${id}`);
  }

  return (
    <Screen mood="home" bottomInset={layout.tabBarSpace}>
      <View style={styles.header}>
        <PressableScale accessibilityLabel="Open your profile" onPress={() => router.push('/(tabs)/me')} style={[styles.avatar, { backgroundColor: c.home.tint, borderColor: c.home.card }]}>
          <Txt variant="headline" style={{ fontFamily: fonts.serifSemibold, fontSize: 18, color: c.home.accentText }}>
            {(name?.trim()[0] ?? 'M').toUpperCase()}
          </Txt>
        </PressableScale>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <RoundWhite icon="calendar" label="Planner" onPress={() => router.push('/planner')} />
          <RoundWhite icon="search" label="Search" onPress={() => input.current?.focus()} />
        </View>
      </View>

      <View style={{ marginTop: space.l }}>
        <Txt variant="display" accessibilityRole="header" style={styles.heroLine}>
          Discover
        </Txt>
        <Txt variant="display" style={[styles.heroLine, { color: c.home.accentText }]}>
          Your Beauty
        </Txt>
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.s }}>
          Turn any beauty video into easy follow-along steps.
        </Txt>
      </View>

      <View style={[styles.search, { backgroundColor: c.home.card }, cardShadow(c.shadow)]}>
        <Icon name="search" size={18} color={c.inkSecondary} />
        <TextInput
          ref={input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder="Search looks or paste a video link…"
          placeholderTextColor={c.inkSecondary}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search your looks, or paste a video link to unveil it"
          style={[styles.searchInput, { color: c.ink }]}
        />
        <PressableScale
          accessibilityLabel={query.trim() ? 'Go' : 'Unveil a look'}
          onPress={() => (query.trim() ? submit() : router.push('/add'))}
          style={[styles.searchBtn, { backgroundColor: c.home.tint }]}
        >
          <Icon name={query.trim() ? 'arrowRight' : 'sliders'} size={18} color={c.home.fill} />
        </PressableScale>
      </View>

      <View style={styles.cats} accessibilityRole="menu">
        {CATEGORIES.map((cat) => (
          <PressableScale key={cat.id} accessibilityRole="button" accessibilityLabel={cat.label} onPress={() => openCategory(cat.id)} style={styles.cat}>
            <View style={[styles.catCircle, { backgroundColor: c.home.tint }, cardShadow(c.shadow)]}>
              <LookPhoto image={cat.image} style={StyleSheet.absoluteFill} />
            </View>
            <Txt variant="caption" tone="secondary" style={{ fontSize: 11 }}>
              {cat.label}
            </Txt>
          </PressableScale>
        ))}
      </View>

      <PressableScale
        accessibilityLabel="New looks. Fresh tutorials for you. Explore"
        onPress={() => router.push('/(tabs)/discover')}
        scaleTo={0.985}
        style={[styles.banner, cardShadow(c.shadow)]}
      >
        <LinearGradient colors={[c.home.bannerFrom, c.home.bannerTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.bannerImage}>
          <LookPhoto image={{ ...photo('flatlay'), focus: '55% 50%' }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={[c.home.bannerFrom, 'rgba(248,217,211,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 0.45, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.bannerText}>
          <Txt variant="title3" style={{ fontFamily: fonts.serifSemibold, fontSize: 26, lineHeight: 26, color: c.ink }}>
            {'New\nLooks'}
          </Txt>
          <Txt variant="footnote" style={{ color: c.ink, opacity: 0.8 }}>
            Fresh tutorials for you
          </Txt>
          <View style={[styles.pill, { backgroundColor: c.home.fill }]}>
            <Txt variant="caption" style={{ color: c.home.onFill, fontWeight: '600' }}>
              Explore
            </Txt>
            <Icon name="arrowRight" size={13} color={c.home.onFill} strokeWidth={2} />
          </View>
        </View>
      </PressableScale>

      {inFlight.map((j) => (
        <PressableScale key={j.id} onPress={() => router.push(`/import/${j.id}`)} accessibilityLabel="Open the look being unveiled" style={[styles.notice, { backgroundColor: c.home.card }, cardShadow(c.shadow)]}>
          <Icon name={j.status === 'pending_offline' ? 'wifiOff' : 'sparkle'} size={20} color={c.home.fill} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{j.status === 'pending_offline' ? 'Waiting for a connection' : 'Unveiling your look…'}</Txt>
            <Txt variant="footnote" tone="secondary">
              {j.status === 'pending_offline' ? 'We’ll start as soon as you’re online.' : IMPORT_STAGES[j.stage]}
            </Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.inkSecondary} />
        </PressableScale>
      ))}

      {resume && resumeRoutine ? (
        <>
          <SectionTitle title="Pick up where you left off" />
          <RoutineRow
            routine={resumeRoutine}
            subtitle={`Step ${resume.stepIndex + 1} of ${stepCount(resumeRoutine)}`}
            progress={(resume.stepIndex + 1) / stepCount(resumeRoutine)}
            onPress={() => router.push(`/follow/${resumeRoutine.id}?session=${resume.id}`)}
          />
        </>
      ) : null}

      <SectionTitle title="Trending Now" onPress={() => router.push('/(tabs)/discover')} />
      <Rail>
        {trending.map((r) => (
          <TrendCard key={r.id} title={r.title} caption={`${stepCount(r)} steps · ${r.totalTimeMin} min`} image={routineImage(r)} onPress={() => router.push(`/unveil/${r.id}`)} />
        ))}
      </Rail>

      {fresh.length > 0 ? (
        <>
          <SectionTitle title="New this week" onPress={() => router.push('/(tabs)/discover')} />
          <Rail>
            {fresh.slice(0, 6).map((r) => (
              <TrendCard key={r.id} wide title={r.title} caption={`${r.totalTimeMin} min · ${r.occasion[0] ?? r.category}`} image={routineImage(r)} onPress={() => router.push(`/routine/${r.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}
    </Screen>
  );
}

function cardShadow(color: string) {
  return { shadowColor: color, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;
}

function RoundWhite({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={styles.hit}>
      <View style={[styles.round, { backgroundColor: c.home.card }, cardShadow(c.shadow)]}>
        <Icon name={icon} size={18} color={c.ink} />
      </View>
    </PressableScale>
  );
}

function SectionTitle({ title, onPress }: { title: string; onPress?: () => void }) {
  const { c } = useTheme();
  const body = (
    <View style={styles.sectionRow}>
      <Txt variant="headline" accessibilityRole="header">
        {title}
      </Txt>
      {onPress ? <Icon name="chevronRight" size={16} color={c.ink} strokeWidth={1.8} /> : null}
    </View>
  );
  return onPress ? (
    <PressableScale accessibilityLabel={`${title}, see all`} onPress={onPress} style={styles.section}>
      {body}
    </PressableScale>
  ) : (
    <View style={styles.section}>{body}</View>
  );
}

function TrendCard({ title, caption, image, onPress, wide }: { title: string; caption: string; image: LookImage; onPress: () => void; wide?: boolean }) {
  const w = wide ? 150 : 110;
  const h = wide ? 190 : 110;
  return (
    <PressableScale accessibilityLabel={`${title}. ${caption}`} onPress={onPress} style={{ width: w, gap: 6 }}>
      <LookPhoto image={image} style={{ width: w, height: h, borderRadius: radius.thumb }} />
      <View style={{ gap: 1 }}>
        <Txt variant="caption" numberOfLines={2} style={{ fontWeight: '600', fontSize: 12, lineHeight: 16 }}>
          {title}
        </Txt>
        <Txt variant="caption" tone="secondary" style={{ fontSize: 11, lineHeight: 14 }}>
          {caption}
        </Txt>
      </View>
    </PressableScale>
  );
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m, paddingTop: space.s }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroLine: { fontFamily: fonts.serifSemibold, fontSize: 38, lineHeight: 40, letterSpacing: -0.6 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 26, paddingLeft: space.l, paddingRight: 6, marginTop: space.l },
  searchInput: { flex: 1, minWidth: 0, height: 48, fontFamily: fonts.sans, fontSize: 15 },
  searchBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xxl },
  cat: { width: 64, alignItems: 'center', gap: 6 },
  catCircle: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  banner: { height: 150, borderRadius: radius.card, overflow: 'hidden', marginTop: space.xxl },
  bannerImage: { position: 'absolute', right: -24, top: 0, bottom: 0, width: '62%' },
  bannerText: { flex: 1, justifyContent: 'space-between', padding: 18, width: '55%' },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 14, borderRadius: 16 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.card, marginTop: space.l },
  section: { marginTop: space.xxl, minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
