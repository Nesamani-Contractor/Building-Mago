import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Card, Badge } from '@/components/Surface';
import { RoutineRow } from '@/components/Bits';
import { StateView } from '@/components/States';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { plansOn, useSessions } from '@/data/sessions';
import { findRoutine } from '@/lib/routines';
import { isoDay } from '@/lib/hooks';

/** M-41 Planner: month view with dots, day list. */
export default function Planner() {
  const router = useRouter();
  const { c } = useTheme();
  const plans = useSessions((s) => s.plans);
  const removePlan = useSessions((s) => s.removePlan);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(isoDay(new Date()));

  const cells = useMemo(() => {
    const first = (month.getDay() + 6) % 7;
    const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))] as (Date | null)[];
  }, [month]);
  const selDate = new Date(`${selected}T12:00:00`);
  const dayPlans = plansOn(plans, selDate);
  const today = isoDay(new Date());

  return (
    <Screen header={<TopBar title="Planner" />}>
      <Card style={{ marginTop: space.l, gap: space.m }}>
        <View style={styles.monthRow}>
          <PressableScale accessibilityLabel="Previous month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.nav}>
            <Icon name="chevronLeft" size={20} />
          </PressableScale>
          <Txt variant="title3">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Txt>
          <PressableScale accessibilityLabel="Next month" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.nav}>
            <Icon name="chevronRight" size={20} />
          </PressableScale>
        </View>
        <View style={styles.grid}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Txt key={i} variant="caption" tone="secondary" align="center" style={styles.cell}>
              {d}
            </Txt>
          ))}
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={styles.cell} />;
            const key = isoDay(d);
            const sel = key === selected;
            const has = plansOn(plans, d).length > 0;
            return (
              <PressableScale
                key={key}
                accessibilityLabel={`${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}${has ? ', has a planned look' : ''}`}
                accessibilityState={{ selected: sel }}
                onPress={() => {
                  haptic.select();
                  setSelected(key);
                }}
                style={[styles.cell, styles.day, sel && { backgroundColor: c.primary }]}
              >
                <Txt variant="callout" style={{ color: sel ? c.inkOnPrimary : c.ink, fontWeight: key === today ? '700' : '400' }}>
                  {d.getDate()}
                </Txt>
                <View style={[styles.dot, { backgroundColor: has ? (sel ? c.inkOnPrimary : c.accent) : 'transparent' }]} />
              </PressableScale>
            );
          })}
        </View>
      </Card>

      <Txt variant="title3" style={{ marginTop: space.xxl }}>
        {selDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </Txt>
      {dayPlans.length === 0 ? (
        <StateView icon="calendar" title="Nothing planned" body="Open any look and tap Plan to put it on a day." actionLabel="Browse my library" onAction={() => router.push('/(tabs)/library')} />
      ) : (
        <Card style={{ marginTop: space.m, paddingVertical: space.xs }}>
          {dayPlans.map((p) => {
            const r = findRoutine(p.routineId);
            if (!r) return null;
            return (
              <RoutineRow
                key={p.id}
                routine={r}
                subtitle={`${p.time ?? 'Any time'}${p.repeatWeekdays ? ' · Weekdays' : ''}`}
                onPress={() => router.push(`/routine/${r.id}`)}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
                    <Badge label={p.occasion} />
                    <PressableScale accessibilityLabel="Remove from plan" onPress={() => removePlan(p.id)} style={styles.nav}>
                      <Icon name="close" size={18} />
                    </PressableScale>
                  </View>
                }
              />
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  day: { borderRadius: 22, gap: 2, paddingVertical: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
