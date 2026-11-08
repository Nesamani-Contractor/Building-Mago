import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card, Hairline } from '@/components/Surface';
import { Chip, ListRow } from '@/components/Bits';
import { space } from '@/design/tokens';
import { usePrefs, type Appearance } from '@/data/prefs';
import { useProfile } from '@/data/profile';
import { useAccount } from '@/data/account';
import { config, isDemo } from '@/services/config';

/** M-60 Settings home (Ulta Account list pattern). */
export default function Settings() {
  const router = useRouter();
  const appearance = usePrefs((s) => s.appearance);
  const setPrefs = usePrefs((s) => s.set);
  const linked = useProfile((s) => s.linkedProvider);
  const weeklyGoal = useProfile((s) => s.weeklyGoal);
  const setProfile = useProfile((s) => s.set);
  const isPro = useAccount((s) => s.isPro);

  return (
    <Screen header={<TopBar title="Settings" />}>
      <Group title="Account">
        <ListRow icon="person" label="Account" value={linked ? (linked === 'apple' ? 'Apple' : 'Google') : 'Not linked'} onPress={() => router.push('/settings/account')} />
        <Hairline />
        <ListRow icon="sparkle" label="Subscription" value={isPro ? 'Pro' : 'Free'} onPress={() => router.push('/settings/subscription')} />
        <Hairline />
        <ListRow icon="cloud" label="Backup & restore" onPress={() => router.push('/settings/backup')} />
      </Group>

      <Group title="Your week">
        <Txt variant="callout" tone="secondary">
          Weekly goal
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.s, marginBottom: space.m }}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} label={`${n}`} selected={weeklyGoal === n} onPress={() => setProfile({ weeklyGoal: n })} />
          ))}
        </View>
      </Group>

      <Group title="App">
        <ListRow icon="bell" label="Notifications" onPress={() => router.push('/settings/notifications')} />
        <Hairline />
        <ListRow icon="speaker" label="Read-aloud voice" onPress={() => router.push('/settings/voice')} />
        <Hairline />
        <ListRow icon="lock" label="Privacy & data" onPress={() => router.push('/settings/privacy')} />
        <Hairline />
        <Txt variant="callout" tone="secondary" style={{ marginTop: space.m }}>
          Appearance
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.s, marginTop: space.s, marginBottom: space.m }}>
          {(['system', 'light', 'dark'] as Appearance[]).map((a) => (
            <Chip key={a} label={a === 'system' ? 'Match phone' : a === 'light' ? 'Light' : 'Dark'} selected={appearance === a} onPress={() => setPrefs({ appearance: a })} />
          ))}
        </View>
      </Group>

      <Group title="About">
        <ListRow icon="info" label="Terms" onPress={() => Linking.openURL(config.termsUrl)} />
        <Hairline />
        <ListRow icon="lock" label="Privacy Policy" onPress={() => Linking.openURL(config.privacyUrl)} />
        {isDemo ? (
          <>
            <Hairline />
            <ListRow icon="settings" label="Developer: analytics events" onPress={() => router.push('/settings/developer')} />
          </>
        ) : null}
      </Group>
      <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.xl }}>
        Mago {Constants.expoConfig?.version ?? ''} · {isDemo ? 'Demo mode' : 'Live'}
      </Txt>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: space.xxl, gap: space.s }}>
      <Txt variant="caption" tone="secondary" style={{ letterSpacing: 1.2 }}>
        {title.toUpperCase()}
      </Txt>
      <Card style={{ paddingVertical: space.xs }}>{children}</Card>
    </View>
  );
}
