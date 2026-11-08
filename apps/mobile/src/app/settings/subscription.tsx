import { useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { space } from '@/design/tokens';
import { useAccount, conversionsUsed } from '@/data/account';
import { checkConversionQuota } from '@mago/shared';
import { restore } from '@/services/purchases';

/** M-62 Subscription status, usage, manage in store, restore. */
export default function Subscription() {
  const router = useRouter();
  const acct = useAccount();
  const [msg, setMsg] = useState<string | null>(null);
  const q = checkConversionQuota(conversionsUsed(acct), acct.isPro, new Date());
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '');

  return (
    <Screen header={<TopBar title="Subscription" />}>
      <Card style={{ marginTop: space.l, gap: space.s }}>
        <Txt variant="title3">{acct.isPro ? 'Mago Pro' : 'Mago Free'}</Txt>
        {acct.isPro ? (
          <Txt variant="callout" tone="secondary">
            {acct.trialEndsAt ? `Free trial until ${fmt(acct.trialEndsAt)}. Then ${acct.plan === 'yearly' ? '$39.99/year' : '$5.99/month'}.` : `Renews ${fmt(acct.renewsAt)}.`}
          </Txt>
        ) : (
          <Txt variant="callout" tone="secondary">
            5 new looks a month. Looks others already converted are always free.
          </Txt>
        )}
      </Card>
      <Card style={{ marginTop: space.l, gap: space.xs }}>
        <Txt variant="headline">This month</Txt>
        <Txt variant="callout" tone="secondary">
          {q.used} of {q.limit} conversions used · Refreshes {new Date(q.refreshesOn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Txt>
      </Card>
      <Card style={{ marginTop: space.l, gap: space.m }}>
        {acct.isPro ? (
          <Button
            variant="secondary"
            label={`Manage in ${Platform.OS === 'android' ? 'Google Play' : 'App Store'}`}
            onPress={() =>
              Linking.openURL(Platform.OS === 'android' ? 'https://play.google.com/store/account/subscriptions' : 'https://apps.apple.com/account/subscriptions')
            }
          />
        ) : (
          <Button label="See Mago Pro" onPress={() => router.push('/paywall?from=settings')} />
        )}
        <Button variant="ghost" label="Restore purchases" onPress={async () => setMsg((await restore()).message)} />
        {msg ? (
          <Txt variant="footnote" tone="secondary" align="center" accessibilityLiveRegion="polite">
            {msg}
          </Txt>
        ) : null}
      </Card>
    </Screen>
  );
}
