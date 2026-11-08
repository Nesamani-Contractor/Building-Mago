import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { space } from '@/design/tokens';
import { useAccount } from '@/data/account';
import { deleteEverything } from '@/services/accountService';

/** M-66 Delete account: required by Apple & Google; actually deletes. */
export default function DeleteAccount() {
  const router = useRouter();
  const isPro = useAccount((s) => s.isPro);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen header={<TopBar title="Delete account" />}>
      <View style={{ gap: space.m, marginTop: space.xl }}>
        <Txt variant="title2">This can’t be undone</Txt>
        <Txt variant="body" tone="secondary">
          We’ll delete your account, usage history, referrals and backup from our server, and wipe your library, plans and photos from this phone.
        </Txt>
      </View>
      {isPro ? (
        <Card variant="outline" style={{ marginTop: space.xl, gap: space.s }}>
          <Txt variant="headline">Your subscription keeps running</Txt>
          <Txt variant="callout" tone="secondary">
            Apple and Google bill you directly. Cancel it in Settings → Subscription first so you aren’t charged again.
          </Txt>
        </Card>
      ) : null}
      <View style={{ gap: space.m, marginTop: space.x3 }}>
        {!confirm ? (
          <Button variant="secondary" label="Delete my account" onPress={() => setConfirm(true)} />
        ) : (
          <Button
            label="Yes, delete everything"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              await deleteEverything();
              router.replace('/onboarding');
            }}
          />
        )}
        <Button variant="ghost" label="Keep my account" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
