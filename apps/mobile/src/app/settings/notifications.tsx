import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card, Hairline } from '@/components/Surface';
import { ToggleRow } from '@/components/Bits';
import { space } from '@/design/tokens';
import { usePrefs } from '@/data/prefs';

/** M-63 Notifications. Max one a day (routine-ready excepted), quiet hours 10 pm–8 am, no guilt copy. */
export default function NotificationSettings() {
  const p = usePrefs();
  return (
    <Screen header={<TopBar title="Notifications" />}>
      <Card style={{ marginTop: space.l, paddingVertical: space.xs }}>
        <ToggleRow label="Routine ready" body="When a tutorial finishes turning into steps" value={p.notifyRoutineReady} onChange={(v) => p.set({ notifyRoutineReady: v })} />
        <Hairline />
        <ToggleRow label="Planned looks" body="One reminder at the time you picked" value={p.notifyPlanner} onChange={(v) => p.set({ notifyPlanner: v })} />
        <Hairline />
        <ToggleRow label="Weekly nudge" body="Only if your goal is open with two days left" value={p.notifyWeeklyNudge} onChange={(v) => p.set({ notifyWeeklyNudge: v })} />
      </Card>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
        We never send more than one a day, and never between 10 pm and 8 am.
      </Txt>
    </Screen>
  );
}
