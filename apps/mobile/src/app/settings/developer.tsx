import { View } from 'react-native';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card, Hairline } from '@/components/Surface';
import { StateView } from '@/components/States';
import { space } from '@/design/tokens';
import { useEventLog } from '@/services/analytics';

/** Demo-only: see the analytics events the app records (already stripped of personal data). */
export default function Developer() {
  const events = useEventLog((s) => s.events);
  return (
    <Screen header={<TopBar title="Analytics events" />}>
      {events.length === 0 ? (
        <StateView icon="info" title="No events yet" body="Use the app and come back — every onboarding step, import and look shows up here." />
      ) : (
        <Card style={{ marginTop: space.l }}>
          {events.map((e, i) => (
            <View key={i} style={{ gap: 2, paddingVertical: space.s }}>
              {i > 0 ? <Hairline style={{ marginBottom: space.s }} /> : null}
              <Txt variant="subhead">{e.name}</Txt>
              <Txt variant="footnote" tone="secondary">
                {new Date(e.at).toLocaleTimeString()} {Object.keys(e.props).length ? JSON.stringify(e.props) : ''}
              </Txt>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
