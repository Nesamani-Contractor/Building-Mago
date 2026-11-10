import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { earnedBadges, nextBadge } from '@mago/shared';
import { SerifHero } from '@/components/Rose';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card, Hairline } from '@/components/Surface';
import { ListRow, SectionHeader, StreakRing } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
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
  const streak = useStreak();
  const bag = useBag((s) => s.items);
  const photos = useMemo(
    () => Object.values(sessions).filter((s) => s.completedAt && (s.afterPhoto || s.beforePhoto)).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [sessions],
  );
  const badges = earnedBadges(streak.lifetimeLooks);
  const next = nextBadge(streak.lifetimeLooks);

  return (
    <Screen mood="calm" bottomInset={layout.tabBarSpace}>
      <SerifHero line1="Your" line2="Profile" style={{ marginTop: space.l }} />

      <Card style={[styles.stats, { marginTop: space.xl }]}>
        <StreakRing done={streak.thisWeekCount} goal={streak.weeklyGoal} size={72} />
        <View style={styles.stat}>
          <Txt variant="title2">{streak.lifetimeLooks}</Txt>
          <Txt variant="footnote" tone="secondary">
            looks done
          </Txt>
        </View>
        <View style={styles.stat}>
          <Txt variant="title2">{streak.streakWeeks}</Txt>
          <Txt variant="footnote" tone="secondary">
            {streak.streakWeeks === 1 ? 'week' : 'weeks'} in a row
          </Txt>
        </View>
      </Card>

      <SectionHeader title="My makeup bag" action={bag.length > 0 ? 'Open' : undefined} onAction={() => router.push('/bag')} />
      <PressableScale onPress={() => router.push(bag.length ? '/bag' : '/bag/scan')} accessibilityLabel={bag.length ? `My makeup bag, ${bag.length} products` : 'Scan your makeup products'} style={{ marginTop: space.m }}>
        <Card style={styles.bagCard}>
          {bag.length > 0 ? (
            <View style={styles.bagThumbs}>
              {bag.slice(0, 4).map((i) => (
                <BagThumb key={i.id} item={i} size={48} />
              ))}
            </View>
          ) : (
            <View style={[styles.badge, { borderColor: c.hairlineStrong }]}>
              <Icon name="camera" size={22} />
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="headline">{bag.length ? `${bag.length} ${bag.length === 1 ? 'product' : 'products'}` : 'Scan what you own'}</Txt>
            <Txt variant="footnote" tone="secondary">
              {bag.length ? 'Every look checks what you have' : 'See what you have for every look'}
            </Txt>
          </View>
          <Icon name="chevronRight" size={18} />
        </Card>
      </PressableScale>

      <SectionHeader title="Glow-up timeline" action={photos.length > 0 ? 'See all' : undefined} onAction={() => router.push('/glowup')} />
      {photos.length === 0 ? (
        <Card variant="outline" style={{ gap: space.s, marginTop: space.m }}>
          <Txt variant="headline">Your before and afters live here</Txt>
          <Txt variant="callout" tone="secondary">
            Take an optional photo when you start and finish a look. They stay private on your phone.
          </Txt>
        </Card>
      ) : (
        <PressableScale onPress={() => router.push('/glowup')} accessibilityLabel="Open glow-up timeline" style={styles.photos}>
          {photos.slice(0, 3).map((s) => (
            <Image key={s.id} source={{ uri: s.afterPhoto ?? s.beforePhoto }} style={[styles.photo, { backgroundColor: c.surfaceAlt }]} contentFit="cover" accessibilityLabel="Your look photo" />
          ))}
        </PressableScale>
      )}

      <SectionHeader title="Badges" />
      <Card style={{ marginTop: space.m, gap: space.m }}>
        <View style={styles.badges}>
          {[1, 5, 10, 25, 50, 100].map((t) => {
            const got = badges.includes(t as (typeof badges)[number]);
            return (
              <View key={t} style={[styles.badge, { borderColor: got ? c.accent : c.hairline, opacity: got ? 1 : 0.5 }]} accessibilityLabel={`${t} looks badge, ${got ? 'earned' : 'not yet earned'}`}>
                <Txt variant="headline">{t}</Txt>
              </View>
            );
          })}
        </View>
        <Txt variant="footnote" tone="secondary">
          {next ? `${next - streak.lifetimeLooks} more ${next - streak.lifetimeLooks === 1 ? 'look' : 'looks'} to your ${next}-look badge.` : 'Every badge earned. Wow.'}
        </Txt>
      </Card>

      <Card style={{ marginTop: space.xxl, paddingVertical: space.xs }}>
        <ListRow icon="sparkle" label="Mago Pro" value={isPro ? (trialEndsAt ? 'Free trial' : 'Active') : 'Try free'} onPress={() => (isPro ? router.push('/settings/subscription') : router.push('/paywall?from=me'))} />
        <Hairline />
        <ListRow icon="gift" label="Invite friends" value="Get a free month" onPress={() => router.push('/referral')} />
        <Hairline />
        <ListRow icon="calendar" label="Planner" onPress={() => router.push('/planner')} />
        <Hairline />
        <ListRow icon="cloud" label="Backup" value={linked ? 'On' : 'Off'} onPress={() => router.push('/settings/backup')} />
        <Hairline />
        <ListRow icon="settings" label="Settings" onPress={() => router.push('/settings')} />
      </Card>
      <View style={{ alignItems: 'center', marginTop: space.xl, gap: space.xs }}>
        <Icon name="lock" size={18} color={c.inkSecondary} />
        <Txt variant="footnote" tone="secondary" align="center">
          Your library and photos stay on this device.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  bagCard: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  bagThumbs: { flexDirection: 'row', gap: -8 },
  stat: { flex: 1, gap: 2 },
  photos: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  photo: { flex: 1, aspectRatio: 3 / 4, borderRadius: radius.thumb },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  badge: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
