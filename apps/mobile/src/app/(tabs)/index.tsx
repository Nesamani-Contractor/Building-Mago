import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { extractFirstUrl, type Category, type ProductRef, type Routine } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card, Badge } from '@/components/Surface';
import { Carousel, ProgressBar, RoutineRow, RoutineThumb, RoutineTile, SectionHeader, StreakRing, routineMeta, stepCount } from '@/components/Bits';
import { Avatar, CategoryCircle, IconCircle, PromoBanner, SearchPill, SerifHero } from '@/components/Rose';
import { ProductArt } from '@/components/ProductArt';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, space } from '@/design/tokens';
import { useLibrary, IMPORT_STAGES } from '@/data/library';
import { useSessions, resumableSession, plansOn } from '@/data/sessions';
import { useProfile } from '@/data/profile';
import { useAccount } from '@/data/account';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { useStreak } from '@/lib/hooks';
import { findRoutine, startersFor } from '@/lib/routines';
import { useBag } from '@/data/bag';

type Promo = 'new' | 'bag' | 'share' | 'pro';

/** Home circles: Mago's look categories (the reference's Makeup/Skincare/… row, for looks), each with its own product picture. */
const art = (ref: string, kind: ProductRef['kind'], shadeHex: string): ProductRef => ({ ref, name: ref, confidence: 1, kind, shadeHex });
const HOME_CATEGORIES: { cat: Category; label: string; product: ProductRef }[] = [
  { cat: 'Full look', label: 'Full looks', product: art('Palette', 'palette', '#E7A1A0') },
  { cat: 'Eyes', label: 'Eyes', product: art('Mascara', 'mascara', '#2A1E1D') },
  { cat: 'Lips', label: 'Lips', product: art('Lipstick', 'lipstick', '#C45F5D') },
  { cat: 'Face/Base', label: 'Face', product: art('Foundation', 'bottle', '#E2B48F') },
  { cat: 'Skincare', label: 'Skincare', product: art('Moisturizer', 'pot', '#F6EEE9') },
];

/** Home (S-05). Rose hero layout: serif greeting, search/paste pill, category circles, promo banner, rails. */
export default function Home() {
  const router = useRouter();
  const { c } = useTheme();
  const items = useLibrary((s) => s.items);
  const imports = useLibrary((s) => s.imports);
  const sessions = useSessions((s) => s.sessions);
  const plans = useSessions((s) => s.plans);
  const goal = useProfile((s) => s.goal);
  const name = useProfile((s) => s.name);
  const isPro = useAccount((s) => s.isPro);
  const streak = useStreak();
  const bagCount = useBag((s) => s.items.length);

  const saved = useMemo(() => Object.values(items).sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [items]);
  const pinned = saved.filter((s) => s.pinned);
  const resume = resumableSession(sessions);
  const resumeRoutine = resume ? findRoutine(resume.routineId) : undefined;
  const todayPlan = plansOn(plans, new Date()).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))[0];
  const planRoutine = todayPlan ? findRoutine(todayPlan.routineId) : undefined;
  const inFlight = Object.values(imports).filter((j) => j.status === 'processing' || j.status === 'pending_offline');
  const starters = startersFor(goal);
  const trending = SAMPLE_ROUTINES.slice(0, 6);
  const next = planRoutine ?? saved[0]?.routine;
  const promos: Promo[] = ['new', ...(bagCount === 0 ? (['bag'] as Promo[]) : []), 'share', ...(isPro ? [] : (['pro'] as Promo[]))];
  const flatLay = SAMPLE_ROUTINES.find((r) => r.products.length >= 3) ?? SAMPLE_ROUTINES[0];

  function onSearch(text: string) {
    const url = extractFirstUrl(text);
    if (url) router.push({ pathname: '/add', params: { url } });
    else router.push({ pathname: '/(tabs)/library', params: { q: text } });
  }

  return (
    <Screen mood="warm" bottomInset={layout.tabBarSpace}>
      <View style={styles.header}>
        <Avatar initial={(name?.trim()[0] ?? 'M').toUpperCase()} onPress={() => router.push('/(tabs)/me')} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconCircle icon="bell" label="Reminders" onPress={() => router.push('/notifications')} dot={!!todayPlan} />
          <IconCircle icon="search" label="Search your looks" onPress={() => router.push('/(tabs)/library')} />
        </View>
      </View>

      <SerifHero line1="Discover" line2="Your Beauty" subtitle="Turn any beauty video into easy follow-along steps." style={{ marginTop: 18 }} />

      <View style={{ marginTop: 18 }}>
        <SearchPill placeholder="Search looks or paste a video link…" onSubmit={onSearch} onFilters={() => router.push('/(tabs)/discover')} />
      </View>

      <View style={styles.cats} accessibilityRole="tablist" accessibilityLabel="Categories">
        {HOME_CATEGORIES.map(({ cat, label, product }) => (
          <CategoryCircle key={cat} label={label} onPress={() => router.push({ pathname: '/(tabs)/discover', params: { cat } })}>
            <ProductArt product={product} size={44} bare />
          </CategoryCircle>
        ))}
      </View>

      <View style={{ marginTop: 22 }}>
        <Carousel<Promo>
          data={promos}
          height={150}
          render={(p) =>
            p === 'new' ? (
              <PromoBanner
                title={'New\nLooks'}
                body="Fresh tutorials for you"
                cta="Explore"
                onPress={() => router.push('/(tabs)/discover')}
                art={flatLay ? <FlatLay routine={flatLay} /> : undefined}
              />
            ) : p === 'bag' ? (
              <PromoBanner
                title={'Your\nmakeup bag'}
                body="Scan what you own — see swaps for every look"
                cta="Scan"
                onPress={() => router.push('/bag/scan')}
                art={<BannerIcon name="camera" />}
              />
            ) : p === 'share' ? (
              <PromoBanner title={'Saw a look\nyou love?'} body="Share → Copy link, then paste it here" cta="Add a look" onPress={() => router.push('/add')} art={<BannerIcon name="link" />} />
            ) : (
              <PromoBanner title={'Mago\nPro'} body="Unlimited looks and Simplify. 7 days free." cta="Try free" onPress={() => router.push('/paywall?from=today')} art={<BannerIcon name="sparkle" />} />
            )
          }
        />
      </View>

      {inFlight.map((j) => (
        <PressableScale key={j.id} onPress={() => router.push(`/import/${j.id}`)} accessibilityLabel="Open import in progress">
          <Card style={[styles.row, { marginTop: space.l }]}>
            <View style={[styles.rowIcon, { backgroundColor: c.tint }]}>
              <Icon name={j.status === 'pending_offline' ? 'wifiOff' : 'sparkle'} size={20} color={c.accentText} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{j.status === 'pending_offline' ? 'Waiting for a connection' : 'Writing your steps…'}</Txt>
              <Txt variant="footnote" tone="secondary">
                {j.status === 'pending_offline' ? 'We’ll start as soon as you’re online.' : IMPORT_STAGES[j.stage]}
              </Txt>
            </View>
            <Icon name="chevronRight" size={18} />
          </Card>
        </PressableScale>
      ))}

      {resume && resumeRoutine ? (
        <Card style={{ marginTop: space.l, gap: space.m }}>
          <View style={styles.row}>
            <RoutineThumb routine={resumeRoutine} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="caption" tone="secondary">
                Pick up where you left off
              </Txt>
              <Txt variant="headline" numberOfLines={1}>
                {resumeRoutine.title}
              </Txt>
              <Txt variant="footnote" tone="secondary">
                Step {resume.stepIndex + 1} of {stepCount(resumeRoutine)}
              </Txt>
            </View>
            <Button label="Resume" onPress={() => router.push(`/follow/${resumeRoutine.id}?session=${resume.id}`)} style={{ alignSelf: 'center', flexShrink: 0 }} />
          </View>
          <ProgressBar value={(resume.stepIndex + 1) / stepCount(resumeRoutine)} />
        </Card>
      ) : null}

      <SectionHeader title="Trending Now" chevron onAction={() => router.push('/(tabs)/discover')} />
      <Rail>
        {trending.map((r) => (
          <RoutineTile key={r.id} routine={r} width={110} onPress={() => router.push(`/routine/${r.id}`)} badge={items[r.id] ? 'Saved' : undefined} />
        ))}
      </Rail>

      {next ? (
        <>
          <SectionHeader title={planRoutine ? 'Today’s look' : 'Your next look'} />
          <Card style={{ marginTop: space.m, gap: space.l }}>
            <View style={styles.row}>
              <RoutineThumb routine={next} size={72} />
              <View style={{ flex: 1, gap: 4 }}>
                {todayPlan ? (
                  <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
                    <Txt variant="caption" tone="secondary">
                      {todayPlan.time ? `Today at ${todayPlan.time}` : 'Planned for today'}
                    </Txt>
                    <Badge label={todayPlan.occasion} />
                  </View>
                ) : null}
                <Txt variant="title3" numberOfLines={2}>
                  {next.title}
                </Txt>
                <Txt variant="footnote" tone="secondary">
                  {routineMeta(next)}
                </Txt>
              </View>
            </View>
            <Button variant="hero" label="Start this look" onPress={() => router.push(`/brief/${next.id}`)} />
            {!planRoutine ? <Button variant="ghost" label="Plan it for later" icon="calendar" onPress={() => router.push(`/plan/${next.id}`)} /> : null}
          </Card>
        </>
      ) : (
        <>
          <SectionHeader title="Your first look" />
          <Card style={{ marginTop: space.m, paddingVertical: space.xs }}>
            {starters.map((r) => (
              <RoutineRow key={r.id} routine={r} onPress={() => router.push(`/routine/${r.id}`)} />
            ))}
          </Card>
        </>
      )}

      <SectionHeader title="Your week" />
      <Card style={[styles.row, { marginTop: space.m }]}>
        <StreakRing done={streak.thisWeekCount} goal={streak.weeklyGoal} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline">{streak.thisWeekMet ? 'Your week is complete' : `${streak.thisWeekCount} of ${streak.weeklyGoal} looks this week`}</Txt>
          <Txt variant="footnote" tone="secondary" numberOfLines={2}>
            {streak.thisWeekMet
              ? `${streak.streakWeeks} ${streak.streakWeeks === 1 ? 'week' : 'weeks'} in a row. Lovely.`
              : streak.shouldNudge
                ? 'Two days left — a quick 5-minute look counts.'
                : `${streak.weeklyGoal - streak.thisWeekCount} more and your week is complete.`}
          </Txt>
        </View>
      </Card>

      {pinned.length > 0 ? (
        <>
          <SectionHeader title="Pinned" />
          <Rail>
            {pinned.map((s) => (
              <RoutineTile key={s.routine.id} routine={s.routine} onPress={() => router.push(`/routine/${s.routine.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}

      {saved.length > 0 ? (
        <>
          <SectionHeader title="Recently saved" action="See all" onAction={() => router.push('/(tabs)/library')} />
          <Rail>
            {saved.slice(0, 8).map((s) => (
              <RoutineTile key={s.routine.id} routine={s.routine} onPress={() => router.push(`/routine/${s.routine.id}`)} />
            ))}
          </Rail>
        </>
      ) : null}
    </Screen>
  );
}

/** The look's products laid out loosely on the banner (no box behind them). */
function FlatLay({ routine }: { routine: Routine }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {routine.products.slice(0, 3).map((p, i) => (
        <View key={p.ref} style={{ marginLeft: i === 0 ? 0 : -14, transform: [{ rotate: `${(i - 1) * 14}deg` }, { translateY: i === 1 ? -8 : 6 }] }}>
          <ProductArt product={p} size={64} bare />
        </View>
      ))}
    </View>
  );
}

function BannerIcon({ name }: { name: 'camera' | 'link' | 'sparkle' }) {
  const { c } = useTheme();
  return (
    <View style={[styles.bannerIcon, { backgroundColor: c.surface }]}>
      <Icon name={name} size={34} color={c.accentText} strokeWidth={1.4} />
    </View>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m, paddingTop: space.s }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  cats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  rowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bannerIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
});
