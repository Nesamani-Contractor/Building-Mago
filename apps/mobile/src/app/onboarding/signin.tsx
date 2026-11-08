import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { space } from '@/design/tokens';
import { useProfile } from '@/data/profile';
import { linkAccount } from '@/services/accountService';
import { config, isDemo } from '@/services/config';

/** M-06 "I already have an account": Apple/Google only (no passwords, no email — D-01). */
export default function SignIn() {
  const router = useRouter();
  const set = useProfile((s) => s.set);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(p: 'apple' | 'google') {
    setBusy(p);
    setError(null);
    try {
      await linkAccount(p);
      set({ onboarded: true, ageConfirmed: true });
      router.replace('/(tabs)');
    } catch {
      setError('Sign-in didn’t finish. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen header={<TopBar backIcon="close" backLabel="Close" />}>
      <View style={{ gap: space.l, marginTop: space.x3 }}>
        <Txt variant="title1" accessibilityRole="header">
          Welcome back
        </Txt>
        <Txt variant="body" tone="secondary">
          Sign in with the account you linked before. Your Pro membership and backup come with you.
        </Txt>
      </View>
      <View style={{ gap: space.m, marginTop: space.x4 }}>
        {Platform.OS !== 'android' ? (
          <Button label="Continue with Apple" icon="lock" loading={busy === 'apple'} onPress={() => go('apple')} />
        ) : null}
        <Button variant="secondary" label="Continue with Google" loading={busy === 'google'} onPress={() => go('google')} />
        {error ? (
          <Txt variant="callout" tone="danger" accessibilityLiveRegion="assertive">
            {error}
          </Txt>
        ) : null}
        {isDemo ? (
          <Txt variant="footnote" tone="secondary">
            Demo mode: sign-in is simulated. Real Apple and Google sign-in arrive with the full build.
          </Txt>
        ) : null}
      </View>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.x4 }}>
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
