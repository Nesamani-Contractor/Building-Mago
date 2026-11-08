import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card, Hairline } from '@/components/Surface';
import { ListRow } from '@/components/Bits';
import { space } from '@/design/tokens';
import { useProfile } from '@/data/profile';
import { linkAccount } from '@/services/accountService';

/** M-61 Account: link Apple/Google (same user id + entitlements), sign out, delete. */
export default function Account() {
  const router = useRouter();
  const linked = useProfile((s) => s.linkedProvider);
  const set = useProfile((s) => s.set);
  const [busy, setBusy] = useState<string | null>(null);

  async function link(p: 'apple' | 'google') {
    setBusy(p);
    await linkAccount(p).finally(() => setBusy(null));
  }

  return (
    <Screen header={<TopBar title="Account" />}>
      <Card style={{ marginTop: space.l, gap: space.m }}>
        <Txt variant="headline">{linked ? `Linked with ${linked === 'apple' ? 'Apple' : 'Google'}` : 'You’re using Mago without an account'}</Txt>
        <Txt variant="callout" tone="secondary">
          {linked
            ? 'Your Pro membership and backup follow you to a new phone or iPad when you sign in.'
            : 'Link Apple or Google to keep your Pro membership and back up your looks. Nothing changes in your library.'}
        </Txt>
        {!linked ? (
          <View style={{ gap: space.s }}>
            {Platform.OS !== 'android' ? <Button label="Link Apple" icon="lock" loading={busy === 'apple'} onPress={() => link('apple')} /> : null}
            <Button variant="secondary" label="Link Google" loading={busy === 'google'} onPress={() => link('google')} />
          </View>
        ) : null}
      </Card>
      <Card style={{ marginTop: space.l, paddingVertical: space.xs }}>
        {linked ? (
          <>
            <ListRow icon="person" label="Sign out everywhere" onPress={() => set({ linkedProvider: null })} />
            <Hairline />
          </>
        ) : null}
        <ListRow icon="trash" label="Delete account" danger onPress={() => router.push('/settings/delete')} />
      </Card>
    </Screen>
  );
}
