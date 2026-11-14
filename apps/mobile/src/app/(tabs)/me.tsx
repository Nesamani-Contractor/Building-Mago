import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { earnedBadges, nextBadge } from '@mago/shared';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Hairline } from '@/components/Surface';
import { LinearGradient } from 'expo-linear-gradient';
import { Eyebrow, ListRow, LookPhoto, SectionHeader, StreakRing } from '@/components/Bits';
import { Greeting } from '@/components/LookActions';
import { photo } from '@/design/media';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, scrimColors, space } from '@/design/tokens';
import { useSessions } from '@/data/sessions';
import { useAccount } from '@/data/account';
import { useProfile } from '@/data/profile';
import { useStreak } from '@/lib/hooks';
import { useBag } from '@/data/bag';
import { BagThumb } from '@/components/BagItemForm';

/** M-14 Me: glow-up preview, stats, badges, referral, Pro status, settings (Ulta Account pattern). */
export default function Me() {
  const router = useRouter();
  const { c } = useTheme();
  const sessions = useSessions((s) => s.sessions);
  const isPro = useAccount((s) => s.isPro);
  const trialEndsAt = useAccount((s) => s.trialEndsAt);
  const linked = useProfile((s) => s.linkedProvider);
  const name = useProfile((s) => s.name);
  const streak = useStreak();
  const bag = useBag((s) => s.items);
  const photos = useMemo(
    () => Object.values(sessions).filter((s) => s.completedAt && (s.afterPhoto || s.beforePhoto)).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [sessions],
  );
  const badges = earnedBadges(streak.lifetimeLooks);
  const next = nextBadge(streak.lifetimeLooks);

  const started = streak.lifetimeLooks > 0;
  const earned = [1, 5, 10, 25, 50, 100].filter((t) => badges.includes(t as (typeof badges)[number]));

  return (
    <Screen mood="warm" bottomInset={layout.tabBarSpace}>
      <Greeting style={{ marginTop: space.s }} />
      <View style={{ marginTop: space.m, gap: 6 }}>
        <Eyebrow>Your Mago</Eyebrow>
        <Txt variant="display" accessibilityRole="header">
          Me
        </Txt>
      </View>

      {started ? (
        <View style={[styles.stats, { backgroundColor: c.surface }]}>
          <StreakRing done={streak.thisWeekCount} goal={streak.weeklyGoal} size={64} />
          <View style={styles.stat}>
            <Txt variant="title2">{streak.lifetimeLooks}</Txt>
            <Txt variant="footnote" tone="secondary">
              {streak.lifetimeLooks === 1 ? 'look done' : 'looks done'}
            </Txt>
          </View>
          {streak.streakWeeks > 0 ? (
            <View style={styles.stat}>
              <Txt variant="title2">{streak.streakWeeks}</Txt>
              <Txt variant="footnote" tone="secondary">
                {streak.streakWeeks === 1 ? 'week in a row' : 'weeks in a row'}
              </Txt>
            </View>
          ) : null}
        </View>
      ) : (
        <Txt variant="body" tone="secondary" style={{ marginTop: space.m }}>
          Your first look unlocks your glow-up timeline and progress.
        </Txt>
      )}

      <SectionHeader title="Glow-up timeline" action={photos.length > 0 ? 'See all' : undefined} onAction={() => router.push('/glowup')} />
      {photos.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: c.mediaTint }]}>
          <LookPhoto image={photo('brows')} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={scrimColors(c)} style={[StyleSheet.absoluteFill, { top: '35%' }]} />
          <View style={styles.emptyText}>
            <Txt variant="headline" style={{ color: c.inkOnPhoto }}>
              Your before and afters live here
            </Txt>
            <Txt variant="footnote" style={{ color: c.inkOnPhoto, opacity: 0.9 }}>
              Optional photos at the start and end of a look. Private, on this phone.
            </Txt>
          </View>
        </View>
      ) : (
        <PressableScale onPress={() => router.push('/glowup')} accessibilityLabel="Open glow-up timeline" style={styles.photos}>
          {photos.slice(0, 3).map((s) => (
            <Image key={s.id} source={{ uri: s.afterPhoto ?? s.beforePhoto }} style={[styles.photo, { backgroundColor: c.surfaceAlt }]} contentFit="cover" accessibilityLabel="Your look photo" />
          ))}
        </PressableScale>
      )}

      <SectionHeader title="My makeup bag" action={bag.length > 0 ? 'Open' : undefined} onAction={() => router.push('/bag')} />
      <PressableScale
        onPress={() => router.push(bag.length ? '/bag' : '/bag/scan')}
        accessibilityLabel={bag.length ? `My makeup bag, ${bag.length} products` : 'Scan your makeup products'}
        scaleTo={0.985}
        style={[styles.bagCard, { backgroundColor: c.surface }]}
      >
        {bag.length > 0 ? (
          <View style={styles.bagThumbs}>
            {bag.slice(0, 4).map((i) => (
              <BagThumb key={i.id} item={i} size={48} />
            ))}
          </View>
        ) : (
          <Icon name="camera" size={22} color={c.inkSecondary} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="headline">{bag.length ? `${bag.length} ${bag.length === 1 ? 'product' : 'products'}` : 'Scan what you own'}</Txt>
          <Txt variant="footnote" tone="secondary">
            {bag.length ? 'Every look checks what you have' : 'Every look then shows have, swap or missing'}
          </Txt>
        </View>
        <Icon name="chevronRight" size={20} color={c.inkSecondary} />
      </PressableScale>

      {earned.length > 0 ? (
        <>
          <SectionHeader title="Milestones" />
          <View style={styles.badges}>
            {earned.map((t) => (
              <View key={t} style={[styles.badge, { borderColor: c.accent }]} accessibilityLabel={`${t} looks milestone, earned`}>
                <Txt variant="title2" style={{ fontSize: 24, lineHeight: 28 }}>
                  {t}
                </Txt>
              </View>
            ))}
          </View>
          {next ? (
            <Txt variant="footnote" tone="secondary" style={{ marginTop: space.m }}>
              Next milestone at {next} looks.
            </Txt>
          ) : null}
        </>
      ) : null}

      <View style={[styles.group, { backgroundColor: c.surface }]}>
        <ListRow icon="person" label="Your name" value={name?.trim() ? name.trim() : 'Add your name'} onPress={() => router.push('/name')} />
        <Hairline />
        <ListRow icon="sparkle" label="Mago Pro" value={isPro ? (trialEndsAt ? 'Free trial' : 'Active') : 'Try free'} onPress={() => (isPro ? router.push('/settings/subscription') : router.push('/paywall?from=me'))} />
        <Hairline />
        <ListRow icon="calendar" label="Planner" onPress={() => router.push('/planner')} />
        <Hairline />
        <ListRow icon="gift" label="Invite friends" value="A free month each" onPress={() => router.push('/referral')} />
        <Hairline />
        <ListRow icon="cloud" label="Backup" value={linked ? 'On' : 'Off'} onPress={() => router.push('/settings/backup')} />
        <Hairline />
        <ListRow icon="settings" label="Settings" onPress={() => router.push('/settings')} />
      </View>
      <View style={styles.privacy}>
        <Icon name="lock" size={16} color={c.inkSecondary} />
        <Txt variant="footnote" tone="secondary">
          Your looks and photos stay on this phone.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', alignItems: 'center', gap: space.xl, marginTop: space.xl, padding: space.l, borderRadius: radius.card },
  bagCard: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.m, padding: space.l, borderRadius: radius.thumb },
  bagThumbs: { flexDirection: 'row', gap: -8 },
  stat: { flex: 1, gap: 2 },
  empty: { height: 220, borderRadius: radius.card, overflow: 'hidden', marginTop: space.m },
  emptyText: { position: 'absolute', left: space.xl, right: space.xl, bottom: space.xl, gap: 4 },
  photos: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  photo: { flex: 1, aspectRatio: 3 / 4, borderRadius: radius.thumb },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, marginTop: space.m },
  badge: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  group: { marginTop: space.x4, paddingHorizontal: space.l, borderRadius: radius.card },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, marginTop: space.xl },
});
