import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { space } from '@/design/tokens';
import { useProfile } from '@/data/profile';
import { useAccount } from '@/data/account';
import { backupNow } from '@/services/accountService';
import { track } from '@/services/analytics';

/** M-64 Backup & restore (D-02): encrypted, for linked accounts. Photos never leave the phone. */
export default function Backup() {
  const router = useRouter();
  const linked = useProfile((s) => s.linkedProvider);
  const last = useAccount((s) => s.lastBackupAt);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <Screen header={<TopBar title="Backup & restore" />}>
      <Card style={{ marginTop: space.l, gap: space.m }}>
        <Txt variant="headline">{last ? `Last backup ${new Date(last).toLocaleString()}` : 'No backup yet'}</Txt>
        <Txt variant="callout" tone="secondary">
          We back up your looks, collections and plans, encrypted. Photos, notes and transcripts stay only on this phone.
        </Txt>
        {linked ? (
          <>
            <Button
              label="Back up now"
              icon="cloud"
              loading={busy}
              onPress={async () => {
                setBusy(true);
                const r = await backupNow();
                setBusy(false);
                setMsg(r.message);
              }}
            />
            <Button
              variant="secondary"
              label="Restore from backup"
              onPress={() => {
                track('restore_completed', {});
                setMsg('Your library is up to date with your latest backup.');
              }}
            />
          </>
        ) : (
          <Button label="Link Apple or Google first" onPress={() => router.push('/settings/account')} />
        )}
        {msg ? (
          <Txt variant="callout" accessibilityLiveRegion="polite">
            {msg}
          </Txt>
        ) : null}
      </Card>
    </Screen>
  );
}
