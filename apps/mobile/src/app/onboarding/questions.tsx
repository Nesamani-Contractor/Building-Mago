import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { ChoiceCard, Chip, ProgressBar } from '@/components/Bits';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import { useProfile, type Goal, type Skill, type SourceApp } from '@/data/profile';
import { track } from '@/services/analytics';
import { haptic } from '@/design/haptics';

const GOALS: { id: Goal; title: string; body: string; icon: 'sun' | 'sparkle' | 'calendar' | 'camera' }[] = [
  { id: 'everyday', title: 'An easy everyday look', body: 'Quick routines I can repeat', icon: 'sun' },
  { id: 'learn', title: 'Learn new techniques', body: 'Step up my skills', icon: 'sparkle' },
  { id: 'events', title: 'Looks for events', body: 'Dates, parties, weddings', icon: 'calendar' },
  { id: 'glowup', title: 'Track my glow-up', body: 'See progress over time', icon: 'camera' },
];
const SOURCES: { id: SourceApp; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'other', label: 'Somewhere else' },
];
const SKILLS: { id: Skill; title: string; body: string }[] = [
  { id: 'beginner', title: 'Just starting', body: 'I’ll show extra tips on every step' },
  { id: 'comfortable', title: 'Comfortable', body: 'Tips when they help' },
  { id: 'pro', title: 'Confident', body: 'Keep steps short, hide tips' },
];

/** Four skippable questions. Each answer visibly changes something later (see SCREENS.md). */
export default function Questions() {
  const router = useRouter();
  const { c } = useTheme();
  const p = useProfile();
  const [q, setQ] = useState(0);
  const total = 4;

  const events = ['onb_q_goal', 'onb_q_sources', 'onb_q_skill', 'onb_q_weekly_goal'] as const;
  const answered = [p.goal !== null, p.sources.length > 0, p.skill !== null, true][q];

  function next(skipped: boolean) {
    track(events[q] as (typeof events)[number], { result: skipped ? 'skipped' : 'answered' });
    if (q < total - 1) setQ(q + 1);
    else router.push('/onboarding/preview');
  }

  return (
    <Screen
      header={
        <TopBar
          onBack={() => (q === 0 ? router.back() : setQ(q - 1))}
          right={
            <PressableScale accessibilityLabel="Skip this question" onPress={() => next(true)} style={styles.skip}>
              <Txt variant="subhead" tone="secondary">
                Skip
              </Txt>
            </PressableScale>
          }
        />
      }
      footer={<Button label={q === total - 1 ? 'See my looks' : 'Continue'} disabled={!answered} onPress={() => next(false)} />}
    >
      {/* Progress never starts at zero: the age check already counts as step one. */}
      <View style={{ gap: space.s, marginTop: space.l }}>
        <ProgressBar value={(q + 2) / (total + 1)} />
        <Txt variant="caption" tone="secondary">{`Question ${q + 1} of ${total}`}</Txt>
      </View>

      {q === 0 ? (
        <View style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            What brings you to Mago?
          </Txt>
          <Txt variant="callout" tone="secondary">
            We’ll pick your first looks from this.
          </Txt>
          <View style={styles.list} accessibilityRole="radiogroup">
            {GOALS.map((g) => (
              <ChoiceCard key={g.id} title={g.title} body={g.body} icon={g.icon === 'sun' ? 'star' : g.icon} selected={p.goal === g.id} onPress={() => p.set({ goal: g.id })} />
            ))}
          </View>
        </View>
      ) : null}

      {q === 1 ? (
        <View style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            Where do you find looks?
          </Txt>
          <Txt variant="callout" tone="secondary">
            Pick all that apply. We’ll show you how to share from there.
          </Txt>
          <View style={styles.chips}>
            {SOURCES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={p.sources.includes(s.id)}
                onPress={() => p.set({ sources: p.sources.includes(s.id) ? p.sources.filter((x) => x !== s.id) : [...p.sources, s.id] })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {q === 2 ? (
        <View style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            How confident are you?
          </Txt>
          <Txt variant="callout" tone="secondary">
            This sets how much detail each step shows.
          </Txt>
          <View style={styles.list} accessibilityRole="radiogroup">
            {SKILLS.map((s) => (
              <ChoiceCard key={s.id} title={s.title} body={s.body} icon="sparkle" selected={p.skill === s.id} onPress={() => p.set({ skill: s.id })} />
            ))}
          </View>
        </View>
      ) : null}

      {q === 3 ? (
        <View style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            How many looks a week?
          </Txt>
          <Txt variant="callout" tone="secondary">
            Your weekly goal. No daily pressure — change it anytime.
          </Txt>
          <View style={styles.week} accessibilityRole="radiogroup">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const sel = p.weeklyGoal === n;
              return (
                <PressableScale
                  key={n}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  accessibilityLabel={`${n} ${n === 1 ? 'look' : 'looks'} a week`}
                  onPress={() => {
                    haptic.select();
                    p.set({ weeklyGoal: n });
                  }}
                  style={[styles.day, { borderColor: sel ? c.primary : c.hairlineStrong, backgroundColor: sel ? c.primary : c.surface }]}
                >
                  <Txt variant="title3" style={{ color: sel ? c.inkOnPrimary : c.ink }}>
                    {n}
                  </Txt>
                </PressableScale>
              );
            })}
          </View>
          <Txt variant="headline" align="center" style={{ marginTop: space.l }}>
            {p.weeklyGoal} {p.weeklyGoal === 1 ? 'look' : 'looks'} a week
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.m, marginTop: space.xxl },
  list: { gap: space.m, marginTop: space.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  week: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.l, justifyContent: 'center' },
  day: { width: layout.buttonHeight, height: layout.buttonHeight, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  skip: { minHeight: layout.tapMin, justifyContent: 'center', paddingHorizontal: space.s },
});
