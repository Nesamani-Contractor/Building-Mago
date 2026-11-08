import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card, Hairline } from '@/components/Surface';
import { ListRow, ToggleRow } from '@/components/Bits';
import { space } from '@/design/tokens';
import { usePrefs } from '@/data/prefs';
import { exportMyData } from '@/services/accountService';

/** M-65 Privacy & data. */
export default function Privacy() {
  const router = useRouter();
  const p = usePrefs();
  return (
    <Screen header={<TopBar title="Privacy & data" />}>
      <Card style={{ marginTop: space.l, gap: space.s }}>
        <Txt variant="headline">What stays on your phone</Txt>
        <Txt variant="callout" tone="secondary">
          Your library, notes, plans and photos. Our server keeps only your anonymous account, usage counts, subscription status and the shared steps for public videos.
        </Txt>
      </Card>
      <Card style={{ marginTop: space.l, paddingVertical: space.xs }}>
        <ToggleRow
          label="Share anonymous usage"
          body="Helps us see which screens work. Never your photos, notes or links."
          value={p.analyticsConsent !== 'denied'}
          onChange={(v) => p.set({ analyticsConsent: v ? 'granted' : 'denied' })}
        />
        <Hairline />
        <ToggleRow label="Photos at every step" body="Off by default" value={p.stepPhotos} onChange={(v) => p.set({ stepPhotos: v })} />
        <Hairline />
        <ToggleRow label="Also save photos to my Photos app" body="Off by default" value={p.savePhotosToLibrary} onChange={(v) => p.set({ savePhotosToLibrary: v })} />
      </Card>
      <Card style={{ marginTop: space.l, paddingVertical: space.xs }}>
        <ListRow icon="download" label="Export my data" onPress={() => exportMyData()} />
        <Hairline />
        <ListRow icon="trash" label="Delete account and data" danger onPress={() => router.push('/settings/delete')} />
      </Card>
    </Screen>
  );
}
