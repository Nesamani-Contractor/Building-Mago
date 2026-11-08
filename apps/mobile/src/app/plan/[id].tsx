import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OCCASIONS, type Occasion } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Chip, ToggleRow } from '@/components/Bits';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useSessions } from '@/data/sessions';
import { useLibrary } from '@/data/library';
import { useRoutine } from '@/lib/routines';
import { isoDay } from '@/lib/hooks';
import { track } from '@/services/analytics';

const TIMES = ['7:00', '7:30', '8:00', '9:00', '12:00', '17:00', '18:30', '19:00', '20:00'];

/** M-40 Plan sheet: up to 60 days ahead, occasion, optional time, weekday repeat. */
export default function PlanSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const routine = useRoutine(id);
  const addPlan = useSessions((s) => s.addPlan);
  const save = useLibrary((s) => s.save);
  const [days] = useState(() => {
    const today = new Date();
    return Array.from({ length: 60 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  });
  const [day, setDay] = useState(isoDay(days[0] as Date));
  const [time, setTime] = useState<string | undefined>('8:00');
  const [occasion, setOccasion] = useState<Occasion>(routine?.occasion[0] ?? 'Everyday');
  const [repeat, setRepeat] = useState(false);

  if (!routine) return null;

  return (
    <Screen
      header={<TopBar title="Plan this look" backIcon="close" backLabel="Close" />}
      footer={
        <Button
          label="Add to my plan"
          onPress={() => {
            save(routine);
            addPlan({ routineId: routine.id, date: day, time, occasion, repeatWeekdays: repeat });
            haptic.success();
            track('plan_created', { occasion, repeat });
            router.back();
          }}
        />
      }
    >
      <Txt variant="title2" style={{ marginTop: space.l }}>
        {routine.title}
      </Txt>
      <Txt variant="subhead" tone="secondary" style={{ marginTop: space.xl }}>
        Day
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl, marginTop: space.s }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.s }}>
        {days.map((d, i) => {
          const key = isoDay(d);
          const sel = key === day;
          return (
            <PressableScale
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              accessibilityLabel={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              onPress={() => {
                haptic.select();
                setDay(key);
              }}
              style={[styles.day, { backgroundColor: sel ? c.primary : c.surface, borderColor: sel ? c.primary : c.hairline }]}
            >
              <Txt variant="caption" style={{ color: sel ? c.inkOnPrimary : c.inkSecondary }}>
                {i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' })}
              </Txt>
              <Txt variant="title3" style={{ color: sel ? c.inkOnPrimary : c.ink }}>
                {d.getDate()}
              </Txt>
            </PressableScale>
          );
        })}
      </ScrollView>

      <Txt variant="subhead" tone="secondary" style={{ marginTop: space.xl }}>
        Time
      </Txt>
      <View style={styles.wrap}>
        <Chip label="Any time" selected={!time} onPress={() => setTime(undefined)} />
        {TIMES.map((t) => (
          <Chip key={t} label={t} selected={time === t} onPress={() => setTime(t)} />
        ))}
      </View>

      <Txt variant="subhead" tone="secondary" style={{ marginTop: space.xl }}>
        Occasion
      </Txt>
      <View style={styles.wrap}>
        {OCCASIONS.map((o) => (
          <Chip key={o} label={o} selected={occasion === o} onPress={() => setOccasion(o)} />
        ))}
      </View>

      <Card style={{ marginTop: space.xl }}>
        <ToggleRow label="Every weekday" body="Repeat Monday to Friday" value={repeat} onChange={setRepeat} />
      </Card>
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
        {time ? `We’ll send one gentle reminder at ${time}, never during quiet hours (10 pm–8 am).` : 'No reminder without a time.'}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  day: { width: 60, height: 76, borderRadius: radius.thumb, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.s },
});
