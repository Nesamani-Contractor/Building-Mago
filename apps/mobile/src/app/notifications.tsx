import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon, type IconName } from '@/components/Icon';
import { space } from '@/design/tokens';
import { useTheme } from '@/design/theme';
import { usePrefs } from '@/data/prefs';
import { isDemo } from '@/services/config';

const ITEMS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'sparkle', title: 'Your routine is ready', body: 'When a tutorial finishes turning into steps.' },
  { icon: 'calendar', title: 'Planned looks', body: 'One reminder at the time you choose.' },
  { icon: 'star', title: 'A gentle weekly nudge', body: 'Only if your week’s goal is still open, with two days left.' },
];

/** M-24 Pre-permission: shown once, after the first successful import (never at launch). */
export default function NotificationsPrompt() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { c } = useTheme();
  const set = usePrefs((s) => s.set);

  function done(allow: boolean) {
    // Full build: Notifications.requestPermissionsAsync() here, only after "Allow".
    set({ notificationsAsked: true, notifyRoutineReady: allow, notifyPlanner: allow, notifyWeeklyNudge: allow });
    if (next) router.replace(next as never);
    else router.back();
  }

  return (
    <Screen
      mood="reveal"
      footer={
        <View style={{ gap: space.s }}>
          <Button label="Allow notifications" onPress={() => done(true)} />
          <Button variant="ghost" label="Not now" onPress={() => done(false)} />
        </View>
      }
    >
      <View style={{ gap: space.m, marginTop: space.x5 }}>
        <Txt variant="title1" accessibilityRole="header">
          Your first look is saved
        </Txt>
        <Txt variant="body" tone="secondary">
          Want a heads-up next time? We send at most one notification a day, never between 10 pm and 8 am.
        </Txt>
      </View>
      <Card style={{ marginTop: space.xxl, gap: space.l }}>
        {ITEMS.map((i) => (
          <View key={i.title} style={styles.row}>
            <View style={[styles.icon, { borderColor: 'transparent', backgroundColor: c.surfaceAlt }]}>
              <Icon name={i.icon} size={20} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="headline">{i.title}</Txt>
              <Txt variant="footnote" tone="secondary">
                {i.body}
              </Txt>
            </View>
          </View>
        ))}
      </Card>
      {isDemo ? (
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
          Demo mode: your choice is saved; real notifications arrive with the full build.
        </Txt>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.l, alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
