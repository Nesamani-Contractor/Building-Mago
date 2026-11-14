import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Chip, LookPhoto, ProgressBar } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, space } from '@/design/tokens';
import { photo, type PHOTOS } from '@/design/media';
import { useProfile, type Goal, type Skill, type SourceApp } from '@/data/profile';
import { track } from '@/services/analytics';
import { haptic } from '@/design/haptics';

const GOALS: { id: Goal; title: string; photo: keyof typeof PHOTOS; reply: string }[] = [
  { id: 'recreate', title: 'Recreate looks I save', photo: 'softGlam', reply: 'Love that. Every look you save becomes calm, numbered steps.' },
  { id: 'everyday', title: 'Quick everyday makeup', photo: 'workFace', reply: 'Nice. We’ll start you with looks that take 10 minutes or less.' },
  { id: 'events', title: 'Event & going-out looks', photo: 'weddingGuest', reply: 'Fun. Date nights, parties and weddings, coming right up.' },
  { id: 'learn', title: 'Learn new techniques', photo: 'partyLiner', reply: 'Great. We’ll explain the why behind every step.' },
];
const SOURCES: { id: SourceApp; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'other', label: 'Somewhere else' },
];
const SKILLS: { id: Skill; title: string; body: string; reply: string }[] = [
  { id: 'beginner', title: 'Just starting', body: 'Explain every step to me', reply: 'Perfect. Every step will say exactly what to do, and how much.' },
  { id: 'comfortable', title: 'I know the basics', body: 'Tips when they help', reply: 'Got it. Clear steps, with tips only where they help.' },
  { id: 'pro', title: 'Pretty skilled', body: 'Keep it short', reply: 'Nice. One-line steps with the product and amount, nothing extra.' },
];

/**
 * S-03–S-06 (PRD J1) with the Onboarding-flow book applied: 4 skippable questions about her, framed as
 * customization (pe-6), multi-select goals (pe-2), a reply to each answer (pe-7), and a value-return
 * screen after two inputs — how sharing works from YouTube, TikTok and Instagram (FR-ONB-05, le-5). Progress counts the
 * age check as step one, so it never starts at zero.
 */
export default function Questions() {
  const router = useRouter();
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const p = useProfile();
  const [q, setQ] = useState(0);
  const STEPS = 5; // goals, sources, share how-to, skill, weekly

  const events = ['onb_q_goal', 'onb_q_sources', 'onb_share_howto_viewed', 'onb_q_skill', 'onb_q_weekly_goal'] as const;
  const answered = [p.goals.length > 0, p.sources.length > 0, true, p.skill !== null, true][q];
  const isInput = q !== 2;

  function next(skipped: boolean) {
    track(events[q]!, q === 2 ? {} : { result: skipped ? 'skipped' : 'answered' });
    haptic.select();
    if (q < STEPS - 1) setQ(q + 1);
    else router.push('/onboarding/building');
  }

  function toggleGoal(id: Goal) {
    haptic.select();
    const goals = p.goals.includes(id) ? p.goals.filter((g) => g !== id) : [...p.goals, id];
    p.set({ goals, goal: goals[0] ?? null });
  }

  const enter = reduced ? undefined : FadeInDown.duration(350);
  const lastGoal = GOALS.find((g) => g.id === p.goals[p.goals.length - 1]);
  const skill = SKILLS.find((s) => s.id === p.skill);

  return (
    <Screen
      header={
        <TopBar
          onBack={() => (q === 0 ? router.back() : setQ(q - 1))}
          right={
            isInput ? (
              <PressableScale accessibilityLabel="Skip this question" onPress={() => next(true)} style={styles.skip}>
                <Txt variant="subhead" tone="secondary">
                  Skip
                </Txt>
              </PressableScale>
            ) : undefined
          }
        />
      }
      footer={
        <Button
          label={q === 2 ? 'Got it' : q === STEPS - 1 ? 'Build my Mago' : 'Continue'}
          disabled={!answered}
          onPress={() => next(false)}
        />
      }
    >
      <View style={{ gap: space.s, marginTop: space.s }}>
        <ProgressBar value={(q + 2) / (STEPS + 1)} />
      </View>

      {q === 0 ? (
        <Animated.View key="q0" entering={enter} style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            What do you want help with?
          </Txt>
          <Txt variant="callout" tone="secondary">
            Pick as many as you like. We’ll choose your first looks from this.
          </Txt>
          <View style={styles.grid} accessibilityRole="list">
            {GOALS.map((g) => {
              const sel = p.goals.includes(g.id);
              return (
                <PressableScale
                  key={g.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: sel }}
                  accessibilityLabel={g.title}
                  onPress={() => toggleGoal(g.id)}
                  scaleTo={0.97}
                  style={[styles.goal, { borderColor: sel ? c.primary : 'transparent' }]}
                >
                  <LookPhoto image={photo(g.photo)} style={styles.goalPhoto} />
                  <View style={styles.goalScrim} />
                  <Txt variant="headline" style={[styles.goalLabel, { color: c.inkOnPhoto }]}>
                    {g.title}
                  </Txt>
                  {sel ? (
                    <View style={[styles.check, { backgroundColor: c.primary }]}>
                      <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.4} />
                    </View>
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
          {lastGoal ? (
            <Animated.View key={lastGoal.id} entering={reduced ? undefined : FadeIn.duration(250)}>
              <Txt variant="callout" style={{ color: c.primary }} accessibilityLiveRegion="polite">
                {lastGoal.reply}
              </Txt>
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}

      {q === 1 ? (
        <Animated.View key="q1" entering={enter} style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            Where do you find your looks?
          </Txt>
          <Txt variant="callout" tone="secondary">
            Pick all that apply. Next, we’ll show you how to send them to Mago.
          </Txt>
          <View style={styles.chips}>
            {SOURCES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={p.sources.includes(s.id)}
                onPress={() => {
                  haptic.select();
                  p.set({ sources: p.sources.includes(s.id) ? p.sources.filter((x) => x !== s.id) : [...p.sources, s.id] });
                }}
              />
            ))}
          </View>
        </Animated.View>
      ) : null}

      {q === 2 ? (
        <Animated.View key="q2" entering={enter} style={styles.block}>
          <Txt variant="eyebrow" tone="secondary">
            The one trick to know
          </Txt>
          <Txt variant="title1" accessibilityRole="header">
            Send any YouTube, TikTok or Instagram video to Mago in two taps
          </Txt>
          <View style={{ gap: space.m, marginTop: space.m }}>
            {[
              { n: 1, icon: 'share' as const, t: 'Tap Share on the video', b: 'In YouTube, TikTok or Instagram.' },
              { n: 2, icon: 'sparkle' as const, t: 'Pick Mago', b: 'First time? It’s under More.' },
              { n: 3, icon: 'check' as const, t: 'Your steps appear', b: 'With every product, in about a minute.' },
            ].map((s, i) => (
              <Animated.View key={s.n} entering={reduced ? undefined : FadeInDown.delay(150 + i * 140).duration(350)} style={[styles.howRow, { backgroundColor: c.surface }]}>
                <View style={[styles.howNum, { backgroundColor: c.surfaceAlt }]}>
                  <Icon name={s.icon} size={20} color={c.primary} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="headline">{s.t}</Txt>
                  <Txt variant="footnote" tone="secondary">
                    {s.b}
                  </Txt>
                </View>
                <Txt variant="title3" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
                  {s.n}
                </Txt>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ) : null}

      {q === 3 ? (
        <Animated.View key="q3" entering={enter} style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            How confident are you with makeup?
          </Txt>
          <Txt variant="callout" tone="secondary">
            This sets how much detail each step shows. You can change it anytime.
          </Txt>
          <View style={{ gap: space.s, marginTop: space.m }} accessibilityRole="radiogroup">
            {SKILLS.map((s) => {
              const sel = p.skill === s.id;
              return (
                <PressableScale
                  key={s.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  accessibilityLabel={`${s.title}. ${s.body}`}
                  onPress={() => {
                    haptic.select();
                    p.set({ skill: s.id });
                  }}
                  style={[styles.skill, { backgroundColor: c.surface, borderColor: sel ? c.primary : 'transparent' }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="headline">{s.title}</Txt>
                    <Txt variant="footnote" tone="secondary">
                      {s.body}
                    </Txt>
                  </View>
                  <View style={[styles.radio, { borderColor: sel ? c.primary : c.hairlineStrong, backgroundColor: sel ? c.primary : 'transparent' }]}>
                    {sel ? <Icon name="check" size={13} color={c.inkOnPrimary} strokeWidth={2.4} /> : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
          {skill ? (
            <Animated.View key={skill.id} entering={reduced ? undefined : FadeIn.duration(250)}>
              <Txt variant="callout" style={{ color: c.primary }} accessibilityLiveRegion="polite">
                {skill.reply}
              </Txt>
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : null}

      {q === 4 ? (
        <Animated.View key="q4" entering={enter} style={styles.block}>
          <Txt variant="title1" accessibilityRole="header">
            How many looks a week feels right?
          </Txt>
          <Txt variant="callout" tone="secondary">
            Your weekly goal. No daily pressure, and you can change it anytime.
          </Txt>
          <Txt variant="display" align="center" style={{ fontSize: 88, lineHeight: 92, marginTop: space.xl, color: c.primary, fontVariant: ['tabular-nums'] }}>
            {p.weeklyGoal}
          </Txt>
          <Txt variant="headline" align="center" tone="secondary">
            {p.weeklyGoal === 1 ? 'look a week' : 'looks a week'}
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
                  style={[styles.day, { backgroundColor: sel ? c.primary : c.surfaceAlt }]}
                >
                  <Txt variant="headline" style={{ color: sel ? c.inkOnPrimary : c.ink }}>
                    {n}
                  </Txt>
                </PressableScale>
              );
            })}
          </View>
          <Txt variant="footnote" tone="secondary" align="center">
            {p.weeklyGoal <= 2 ? 'Easy to keep. Most people start here.' : p.weeklyGoal <= 4 ? 'A lovely rhythm for trying new looks.' : 'Ambitious! We’ll cheer you on.'}
          </Txt>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.m, marginTop: space.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, marginTop: space.s },
  goal: { width: '47.5%', aspectRatio: 0.8, borderRadius: radius.card, overflow: 'hidden', borderWidth: 3 },
  goalPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.card - 3 },
  goalScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,30,38,0.28)' },
  goalLabel: { position: 'absolute', left: space.m, right: space.m, bottom: space.m },
  check: { position: 'absolute', top: space.s, right: space.s, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card },
  howNum: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  skill: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 72, paddingHorizontal: space.l, borderRadius: radius.card, borderWidth: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', gap: 6, marginTop: space.l, justifyContent: 'center' },
  day: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  skip: { minHeight: layout.tapMin, justifyContent: 'center', paddingHorizontal: space.s },
});
