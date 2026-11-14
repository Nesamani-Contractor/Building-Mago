import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { useProfile } from '@/data/profile';
import { config } from '@/services/config';
import { track } from '@/services/analytics';

/** Age confirmation, 18+ (D-08). */
export default function Age() {
  const router = useRouter();
  const set = useProfile((s) => s.set);
  const { c } = useTheme();
  return (
    <Screen
      header={<TopBar />}
      footer={
        <View style={{ gap: space.s }}>
          <Button
            label="I’m 18 or older"
            onPress={() => {
              set({ ageConfirmed: true });
              track('onb_age_confirmed');
              router.push('/onboarding/name');
            }}
          />
          <Button variant="ghost" label="I’m under 18" onPress={() => router.replace('/onboarding/blocked')} />
        </View>
      }
    >
      <View style={{ gap: space.l, marginTop: space.x3 }}>
        <Txt variant="title1" accessibilityRole="header">
          One quick check
        </Txt>
        <Txt variant="body" tone="secondary">
          Mago is made for adults. Please confirm you’re 18 or older to continue.
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.x3 }}>
        <Icon name="lock" size={18} color={c.inkSecondary} />
        <Txt variant="callout" tone="secondary" style={{ flex: 1 }}>
          Private by default — your looks and photos stay on your phone. No sign-up needed.
        </Txt>
      </View>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xxl }}>
        By continuing you agree to our{' '}
        <Txt variant="footnote" style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(config.termsUrl)} accessibilityRole="link">
          Terms
        </Txt>{' '}
        and{' '}
        <Txt variant="footnote" style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL(config.privacyUrl)} accessibilityRole="link">
          Privacy Policy
        </Txt>
        .
      </Txt>
    </Screen>
  );
}
