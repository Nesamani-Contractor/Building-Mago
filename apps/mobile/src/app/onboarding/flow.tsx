import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { allSteps, kindForRole, type Occasion, type ProductRef, type ProductRole, type Routine } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Chip, Eyebrow, LookPhoto, ProgressBar, stepCount } from '@/components/Bits';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { FloatingProduct } from '@/components/FloatingProduct';
import { NameField } from '@/components/NameField';
import { CheckLine, Head, LoaderRing, Option, Reply } from '@/components/OnboardingBits';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { routineImage } from '@/design/media';
import { haptic } from '@/design/haptics';
import { useProfile, type Goal, type Skill, type SourceApp } from '@/data/profile';
import { usePrefs } from '@/data/prefs';
import { useBag } from '@/data/bag';
import { useLibrary } from '@/data/library';
import { useSessions } from '@/data/sessions';
import { useAccount } from '@/data/account';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { isoDay } from '@/lib/hooks';
import { linkAccount } from '@/services/accountService';
import { OFFERINGS, purchase, trialTimeline } from '@/services/purchases';
import { speak, stopSpeaking } from '@/services/voice';
import { track } from '@/services/analytics';

/**
 * The onboarding journey from the owner's "Mago — Onboarding Flow" skill (D-27), drawn in the app's
 * WOW v2 style. Screen 1 (welcome reel with music) is `index.tsx`; this route runs screens 2–25,
 * then lands on a ready Home (screen 26). Screen 8 (iOS tracking prompt) is left out: Mago never
 * tracks across apps (CLAUDE.md privacy rule).
 */

type StepId =
  | 'problem' | 'insight' | 'goals' | 'occasions' | 'level' | 'how' | 'sources' | 'time' | 'weekly' | 'promise' | 'bag'
  | 'looks' | 'mic' | 'try' | 'win' | 'heard' | 'name' | 'loader' | 'plan' | 'notif' | 'account' | 'paywall' | 'offer';

/** Screen numbers from the skill (for the progress bar and analytics). */
const SCREEN_NO: Record<StepId, number> = {
  problem: 2, insight: 3, goals: 4, occasions: 5, level: 6, how: 7, sources: 9, time: 10, weekly: 11, promise: 12, bag: 13,
  looks: 14, mic: 15, try: 16, win: 17, heard: 18, name: 19, loader: 20, plan: 21, notif: 22, account: 23, paywall: 24, offer: 25,
};
const ORDER: StepId[] = ['problem', 'insight', 'goals', 'occasions', 'level', 'how', 'sources', 'time', 'weekly', 'promise', 'bag', 'looks', 'mic', 'try', 'win', 'heard', 'name', 'loader', 'plan', 'notif', 'account', 'paywall', 'offer'];

const PILE = [
  { id: 'few' as const, label: 'A few' },
  { id: 'dozens' as const, label: 'Dozens' },
  { id: 'lots' as const, label: 'Honestly, too many to count' },
];
const FOCUS = [
  { id: 'everyday', label: 'Everyday makeup' },
  { id: 'going-out', label: 'Going-out looks' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'base', label: 'Base & skin' },
  { id: 'brows', label: 'Brows' },
  { id: 'lips', label: 'Lips' },
];
const OCCASIONS = ['Workdays', 'Date nights', 'Parties', 'Weddings & events', 'Weekends', 'Every day'];
const LEVELS: { id: Skill; label: string; reply: string }[] = [
  { id: 'beginner', label: 'Just starting', reply: 'Lovely — every step will say exactly what to do, and how much.' },
  { id: 'comfortable', label: 'I know the basics', reply: 'Perfect — we’ll keep steps clear and quick, with tips only where they help.' },
  { id: 'pro', label: 'Pretty skilled', reply: 'Nice — one-line steps with the product and amount, nothing extra.' },
];
const SOURCES: { id: SourceApp; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'other', label: 'Somewhere else' },
];
const TIMES = [
  { m: 5, label: '5 minutes' },
  { m: 10, label: 'About 10 minutes' },
  { m: 20, label: 'About 20 minutes' },
  { m: 0, label: 'As long as it takes' },
];
const BAG_CHOICES: { label: string; role: ProductRole }[] = [
  { label: 'Foundation', role: 'foundation' },
  { label: 'Concealer', role: 'concealer' },
  { label: 'Powder', role: 'powder' },
  { label: 'Blush', role: 'blush' },
  { label: 'Bronzer', role: 'bronzer' },
  { label: 'Mascara', role: 'mascara' },
  { label: 'Eyeliner', role: 'eyeliner' },
  { label: 'Eyeshadow', role: 'eyeshadow' },
  { label: 'Brow pencil', role: 'brow' },
  { label: 'Lipstick', role: 'lipstick' },
  { label: 'Setting spray', role: 'setting spray' },
  { label: 'Brushes', role: 'brush' },
];
const HEARD = ['TikTok', 'Instagram', 'A friend', 'YouTube', 'App Store'];

const GUIDE_LINE = 'Hi, I’m your Mago guide. I’ll read every step to you, so your hands stay free for your makeup.';
const DEMO_CONCEALER: ProductRef = { ref: 'demo-concealer', name: 'Concealer', confidence: 1, kind: 'tube', shadeHex: '#EFCDB0' };

/** Looks matched to her goals and time (screen 14). */
function lookChoices(focus: string[], minutes: number | null): Routine[] {
  const want = new Set<string>();
  if (focus.includes('everyday') || focus.includes('base')) want.add('sample-work-face').add('sample-dewy-skin');
  if (focus.includes('going-out')) want.add('sample-soft-glam').add('sample-party-liner');
  if (focus.includes('eyes')) want.add('sample-party-liner').add('sample-soft-glam');
  if (focus.includes('brows')) want.add('sample-five-min-brows');
  if (focus.includes('lips')) want.add('sample-glossy-lips');
  ['sample-work-face', 'sample-soft-glam', 'sample-glossy-lips'].forEach((id) => want.add(id));
  let list = [...want].map((id) => SAMPLE_ROUTINES.find((r) => r.id === id)).filter((r): r is Routine => !!r);
  if (minutes) {
    const fits = list.filter((r) => r.totalTimeMin <= minutes + 5);
    if (fits.length >= 3) list = fits;
  }
  return list.slice(0, 3);
}

function goalsFrom(focus: string[]): Goal[] {
  const g = new Set<Goal>(['recreate']);
  if (focus.includes('everyday') || focus.includes('base')) g.add('everyday');
  if (focus.includes('going-out')) g.add('events');
  if (focus.some((f) => ['eyes', 'brows', 'lips'].includes(f))) g.add('learn');
  return [...g];
}

function occasionFor(occasions: string[]): Occasion {
  if (occasions.includes('Date nights')) return 'Date night';
  if (occasions.includes('Workdays')) return 'Work';
  if (occasions.includes('Parties')) return 'Party';
  if (occasions.includes('Weddings & events')) return 'Wedding/Event';
  return 'Everyday';
}

export default function OnboardingFlow() {
  const router = useRouter();
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const p = useProfile();
  const setPrefs = usePrefs((s) => s.set);
  const [i, setI] = useState(0);
  const step = ORDER[i]!;

  // Local answers that don't live in the profile.
  const [bagPicks, setBagPicks] = useState<string[]>([]);
  const [lookId, setLookId] = useState<string | null>(null);
  const [tryIndex, setTryIndex] = useState(0);
  const [handsFree, setHandsFree] = useState(false);
  const [name, setName] = useState(p.name ?? '');
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [closeShown, setCloseShown] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const heardOrder = useMemo(() => [...HEARD].sort(() => Math.random() - 0.5).concat('Other'), []);

  const looks = useMemo(() => lookChoices(p.focus, p.timeBudget), [p.focus, p.timeBudget]);
  const look = looks.find((l) => l.id === lookId) ?? looks[0];
  const trySteps = useMemo(() => (look ? allSteps(look).slice(0, 2) : []), [look]);
  const firstName = name.trim() || p.name?.trim() || '';
  const minutes = p.timeBudget;

  useEffect(() => {
    track('onboarding_step_viewed', { step: SCREEN_NO[step] });
  }, [step]);

  // Screen 16: read the step aloud.
  useEffect(() => {
    if (step !== 'try' || !trySteps[tryIndex]) return;
    speak(trySteps[tryIndex]!.text);
    return () => stopSpeaking();
  }, [step, tryIndex, trySteps]);

  // Screen 20: the plan-building loader plays her answers back, then moves on.
  useEffect(() => {
    if (step !== 'loader') return;
    const timers = [0, 1, 2, 3, 4, 5].map((k) =>
      setTimeout(() => {
        setLoaderStep(k + 1);
        if (k < 5) haptic.select();
      }, 650 * (k + 1)),
    );
    const done = setTimeout(() => next(), 650 * 6 + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Screen 24: the close button appears after 3 seconds (soft paywall).
  useEffect(() => {
    if (step !== 'paywall') return;
    const t = setTimeout(() => setCloseShown(true), 3000);
    return () => clearTimeout(t);
  }, [step]);

  function next() {
    track('onboarding_step_completed', { step: SCREEN_NO[step] });
    // Already Pro (e.g. a restored account): no paywall.
    if (ORDER[i + 1] === 'paywall' && useAccount.getState().isPro) return finish();
    if (i < ORDER.length - 1) setI(i + 1);
  }
  function back() {
    stopSpeaking();
    if (i === 0) router.back();
    else setI(i - 1);
  }
  function jump(to: StepId) {
    setI(ORDER.indexOf(to));
  }

  /** Screen 26: everything she chose becomes her app, then Home. */
  function finish() {
    const chosen = look;
    const lib = useLibrary.getState();
    if (chosen) {
      lib.ensureSaved(chosen);
      if (!lib.items[chosen.id]?.pinned) lib.togglePinned(chosen.id);
    }
    p.set({ onboarded: true, firstLookId: chosen?.id ?? null, goals: goalsFrom(p.focus), goal: goalsFrom(p.focus)[0] ?? null });
    track('onb_completed', {});
    router.replace('/(tabs)');
  }

  // ---------- plan (screen 21) ----------
  const planDays = useMemo(() => {
    const n = Math.min(3, Math.max(1, p.weeklyGoal));
    const offsets = n === 1 ? [0] : n === 2 ? [0, 3] : [0, 2, 5];
    const extra = SAMPLE_ROUTINES.filter((r) => r.id !== look?.id && (!minutes || r.totalTimeMin <= minutes + 10));
    return offsets.map((o, k) => {
      const d = new Date();
      d.setDate(d.getDate() + o);
      const r = k === 0 ? look : extra[k - 1] ?? look;
      return { date: d, routine: r! };
    });
  }, [p.weeklyGoal, look, minutes]);
  const projection = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    return { count: p.weeklyGoal * 4, date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) };
  }, [p.weeklyGoal]);

  // ---------- layout ----------
  const noBar: StepId[] = ['try', 'win', 'loader', 'paywall', 'offer'];
  const header = noBar.includes(step) ? undefined : (
    <View style={{ gap: space.s }}>
      <TopBar onBack={back} />
      <ProgressBar value={SCREEN_NO[step] / 26} />
    </View>
  );
  const enter = reduced ? undefined : FadeInDown.duration(320);

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  let scroll = true;

  switch (step) {
    case 'problem': {
      const reply = p.savedPile ? 'You’re in good company. Let’s turn them into looks you actually wear.' : null;
      body = (
        <>
          <Head lead="How many tutorials have you saved but " em="never tried?" />
          <View style={styles.opts}>
            {PILE.map((o) => (
              <Option key={o.id} label={o.label} selected={p.savedPile === o.id} onPress={() => p.set({ savedPile: o.id })} />
            ))}
          </View>
          {reply ? <Reply text={reply} /> : null}
        </>
      );
      footer = <Button label="Continue" disabled={!p.savedPile} onPress={next} />;
      break;
    }
    case 'insight':
      body = (
        <>
          <Head lead="It’s not you. Tutorials are made to " em="watch," after=" not follow." />
          <View style={styles.insight}>
            <View style={{ flex: 1 }}>
              <LookPhoto image={routineImage(SAMPLE_ROUTINES.find((r) => r.id === 'sample-soft-glam')!)} style={styles.insightPhoto} />
              <View style={[styles.insightChip, { backgroundColor: c.glass }]}>
                <Txt variant="caption">0:47 · fast cuts</Txt>
              </View>
            </View>
            <Icon name="arrowRight" size={20} color={c.primary} />
            <View style={{ flex: 1, gap: space.xs }}>
              {['Prep skin', 'Skin tint', 'Conceal', 'Blush'].map((t, k) => (
                <View key={t} style={[styles.miniStep, { backgroundColor: c.surface }]}>
                  <Txt variant="footnote" style={{ fontWeight: '600' }}>
                    {k + 1}. {t}
                  </Txt>
                </View>
              ))}
            </View>
          </View>
          <Txt variant="body" tone="secondary">
            Fast cuts, no pauses, products named once. Mago turns any tutorial into calm steps you can actually do.
          </Txt>
        </>
      );
      footer = <Button label="Show me how" onPress={next} />;
      break;
    case 'goals':
      body = (
        <>
          <Head lead="What do you want to " em="nail?" />
          <Txt variant="callout" tone="secondary">
            Choose all that apply.
          </Txt>
          <View style={styles.opts}>
            {FOCUS.map((f) => (
              <Option
                key={f.id}
                multi
                label={f.label}
                selected={p.focus.includes(f.id)}
                onPress={() => p.set({ focus: p.focus.includes(f.id) ? p.focus.filter((x) => x !== f.id) : [...p.focus, f.id] })}
              />
            ))}
          </View>
        </>
      );
      footer = <Button label={p.focus.length ? `Continue · ${p.focus.length} selected` : 'Continue'} disabled={!p.focus.length} onPress={next} />;
      break;
    case 'occasions':
      body = (
        <>
          <Head lead="When do you want to " em="look your best?" />
          <Txt variant="callout" tone="secondary">
            Choose all that apply.
          </Txt>
          <View style={styles.chips}>
            {OCCASIONS.map((o) => (
              <Chip key={o} label={o} selected={p.occasions.includes(o)} onPress={() => p.set({ occasions: p.occasions.includes(o) ? p.occasions.filter((x) => x !== o) : [...p.occasions, o] })} />
            ))}
          </View>
        </>
      );
      footer = <Button label="Continue" disabled={!p.occasions.length} onPress={next} />;
      break;
    case 'level': {
      const lv = LEVELS.find((l) => l.id === p.skill);
      body = (
        <>
          <Head lead="How confident are you " em="with makeup?" />
          <View style={styles.opts}>
            {LEVELS.map((l) => (
              <Option key={l.id} label={l.label} selected={p.skill === l.id} onPress={() => p.set({ skill: l.id })} />
            ))}
          </View>
          {lv ? <Reply text={lv.reply} /> : null}
        </>
      );
      footer = <Button label="Continue" disabled={!p.skill} onPress={next} />;
      break;
    }
    case 'how':
      body = (
        <>
          <Head lead="Save it. Do it. " em="Love it." />
          <View style={{ gap: space.s, marginTop: space.s }}>
            {['Share a tutorial', 'Get clear steps + products', 'Follow along, hands-free'].map((t, k) => (
              <Animated.View key={t} entering={reduced ? undefined : FadeInDown.delay(150 + k * 160).duration(350)} style={[styles.howRow, { backgroundColor: c.surface }]}>
                <View style={[styles.howNum, { backgroundColor: c.surfaceAlt }]}>
                  <Txt variant="headline" style={{ color: c.primary }}>
                    {k + 1}
                  </Txt>
                </View>
                <Txt variant="headline" style={{ flex: 1 }}>
                  {t}
                </Txt>
              </Animated.View>
            ))}
          </View>
          <PressableScale accessibilityLabel="Tap to hear your guide" onPress={() => speak(GUIDE_LINE)} style={[styles.guide, { borderColor: c.primary }]}>
            <Icon name="play" size={16} color={c.primary} filled />
            <Txt variant="headline" style={{ flex: 1, color: c.primary }}>
              Tap to hear your guide
            </Txt>
            <Txt variant="footnote" tone="secondary">
              0:06
            </Txt>
          </PressableScale>
        </>
      );
      footer = <Button label="Continue" onPress={() => { stopSpeaking(); next(); }} />;
      break;
    case 'sources':
      body = (
        <>
          <Head lead="Where do you " em="find your looks?" />
          <Txt variant="callout" tone="secondary">
            Choose all that apply.
          </Txt>
          <View style={styles.chips}>
            {SOURCES.map((s) => (
              <Chip key={s.id} label={s.label} selected={p.sources.includes(s.id)} onPress={() => p.set({ sources: p.sources.includes(s.id) ? p.sources.filter((x) => x !== s.id) : [...p.sources, s.id] })} />
            ))}
          </View>
        </>
      );
      footer = <Button label="Continue" disabled={!p.sources.length} onPress={next} />;
      break;
    case 'time':
      body = (
        <>
          <Head lead="How much time do you usually have " em="for makeup?" />
          <View style={styles.opts}>
            {TIMES.map((t) => (
              <Option key={t.m} label={t.label} selected={p.timeBudget === t.m} onPress={() => p.set({ timeBudget: t.m })} />
            ))}
          </View>
        </>
      );
      footer = <Button label="Continue" disabled={p.timeBudget === null} onPress={next} />;
      break;
    case 'weekly':
      body = (
        <>
          <Head lead="How many looks do you want to do " em="each week?" />
          <Txt variant="display" align="center" style={{ fontSize: 88, lineHeight: 92, marginTop: space.l, color: c.primary }}>
            {p.weeklyGoal}
          </Txt>
          <Txt variant="callout" tone="secondary" align="center">
            {p.weeklyGoal === 1 ? 'look a week' : 'looks a week'}
          </Txt>
          <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`Weekly goal, ${p.weeklyGoal}`} accessibilityValue={{ min: 1, max: 7, now: p.weeklyGoal }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => p.set({ weeklyGoal: Math.max(1, Math.min(7, p.weeklyGoal + (e.nativeEvent.actionName === 'increment' ? 1 : -1))) })}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <PressableScale key={n} accessibilityLabel={`${n} a week`} onPress={() => { haptic.select(); p.set({ weeklyGoal: n }); }} style={styles.dotHit}>
                <View style={[styles.dot, { backgroundColor: n <= p.weeklyGoal ? c.primary : c.surfaceAlt }]} />
                <Txt variant="caption" tone="secondary">
                  {n}
                </Txt>
              </PressableScale>
            ))}
          </View>
          <Reply text={`${p.weeklyGoal} a week? Your glow-up starts now.`} />
        </>
      );
      footer = <Button label="Set my goal" onPress={next} />;
      break;
    case 'promise':
      body = (
        <>
          <Head lead="Never guess " em="what to use." />
          <View style={[styles.promise, { backgroundColor: c.surface }]}>
            <View style={{ flex: 1, gap: space.s }}>
              <Eyebrow>Step 3 of 6 · Base</Eyebrow>
              <Txt variant="step">Blend concealer upward with a damp sponge.</Txt>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <FloatingProduct product={DEMO_CONCEALER} size={84} />
              <Txt variant="caption" style={{ color: c.success, fontWeight: '600' }}>
                In your bag
              </Txt>
            </View>
          </View>
          <Txt variant="body" tone="secondary">
            Every step shows the exact products — and checks them against your makeup bag.
          </Txt>
        </>
      );
      footer = <Button label="Continue" onPress={next} />;
      break;
    case 'bag':
      body = (
        <>
          <Head lead="What’s already in " em="your makeup bag?" />
          <Txt variant="callout" tone="secondary">
            Tap what you own. You can add photos later.
          </Txt>
          <View style={styles.chips}>
            {BAG_CHOICES.map((b) => (
              <Chip key={b.label} label={b.label} selected={bagPicks.includes(b.label)} onPress={() => setBagPicks((cur) => (cur.includes(b.label) ? cur.filter((x) => x !== b.label) : [...cur, b.label]))} />
            ))}
          </View>
        </>
      );
      footer = (
        <View style={{ gap: space.s }}>
          <Button
            label="Continue"
            disabled={!bagPicks.length}
            onPress={() => {
              useBag.getState().add(BAG_CHOICES.filter((b) => bagPicks.includes(b.label)).map((b) => ({ name: b.label, role: b.role, kind: kindForRole(b.role) })));
              track('bag_item_added', { count: bagPicks.length, source: 'onboarding' });
              next();
            }}
          />
          <Button variant="ghost" label="Skip for now" onPress={next} />
        </View>
      );
      break;
    case 'looks':
      body = (
        <>
          <Head lead="Let’s try your " em="first look." />
          <Txt variant="callout" tone="secondary">
            Picked for your goals, level{minutes ? ` and ${minutes} minutes` : ''}.
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: space.m }}>
            {looks.map((r) => {
              const sel = (lookId ?? looks[0]?.id) === r.id;
              return (
                <PressableScale key={r.id} accessibilityRole="radio" accessibilityState={{ checked: sel }} accessibilityLabel={`${r.title}, ${r.totalTimeMin} minutes`} onPress={() => { haptic.select(); setLookId(r.id); }} style={{ width: 170, gap: space.s }}>
                  <View>
                    <LookPhoto image={routineImage(r)} style={[styles.lookPhoto, { borderColor: sel ? c.primary : 'transparent' }]} />
                    {sel ? (
                      <View style={[styles.lookCheck, { backgroundColor: c.primary }]}>
                        <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.4} />
                      </View>
                    ) : null}
                  </View>
                  <Txt variant="headline" numberOfLines={2}>
                    {r.title}
                  </Txt>
                  <Txt variant="footnote" tone="secondary">
                    {r.totalTimeMin} min · {stepCount(r)} steps
                  </Txt>
                </PressableScale>
              );
            })}
          </ScrollView>
          <Txt variant="footnote" tone="secondary">
            Products shown on every step.
          </Txt>
        </>
      );
      footer = <Button label="Try this look" onPress={() => { if (!lookId && looks[0]) setLookId(looks[0].id); next(); }} />;
      break;
    case 'mic':
      body = (
        <>
          <Head lead="Go " em="hands-free." />
          <Txt variant="body" tone="secondary">
            Just say “next” while your hands are busy. Mago listens only while a look is open.
          </Txt>
          <View style={{ alignItems: 'center', marginTop: space.x3, gap: space.m }}>
            <View style={[styles.listen, { backgroundColor: c.surface }]}>
              <View style={[styles.listenDot, { backgroundColor: c.primary }]} />
              <Txt variant="headline">Listening — say “next”</Txt>
            </View>
            <Txt variant="callout" tone="secondary">
              “next” · “back” · “repeat”
            </Txt>
          </View>
        </>
      );
      footer = (
        <View style={{ gap: space.s }}>
          <Button
            label="Turn on hands-free"
            icon="mic"
            onPress={async () => {
              let ok = true;
              const md = (globalThis as { navigator?: { mediaDevices?: { getUserMedia?: (c: unknown) => Promise<{ getTracks: () => { stop: () => void }[] }> } } }).navigator?.mediaDevices;
              if (Platform.OS === 'web' && md?.getUserMedia) {
                try {
                  const stream = await md.getUserMedia({ audio: true });
                  stream.getTracks().forEach((t) => t.stop());
                } catch {
                  ok = false;
                }
              }
              setHandsFree(ok);
              setPrefs({ voiceCommands: ok });
              track('fa_voice_enabled', { result: ok ? 'granted' : 'denied' });
              next();
            }}
          />
          <Button variant="ghost" label="Not now — I’ll tap" onPress={() => { setHandsFree(false); next(); }} />
        </View>
      );
      break;
    case 'try': {
      const st = trySteps[tryIndex];
      const prod = st ? look?.products.find((x) => st.productRefs.includes(x.ref)) : undefined;
      scroll = false;
      body = st ? (
        <View style={{ flex: 1 }}>
          <View style={styles.tryTop}>
            <Eyebrow>
              Step {tryIndex + 1} of 2 · {look?.title}
            </Eyebrow>
            <PressableScale accessibilityLabel="Skip the try-out" onPress={() => { stopSpeaking(); jump('win'); }} style={styles.tryClose}>
              <Icon name="close" size={18} />
            </PressableScale>
          </View>
          <ProgressBar value={(tryIndex + 1) / 2} />
          <Animated.View key={st.id} entering={reduced ? undefined : FadeInDown.duration(250)} style={styles.tryBody}>
            <Txt variant="title1" style={{ flex: 1 }}>
              {st.text}
            </Txt>
            {prod ? (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <FloatingProduct product={prod} size={96} />
                {st.amount ? (
                  <Txt variant="caption" tone="secondary" align="center" style={{ width: 100 }}>
                    {st.amount}
                  </Txt>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
          <PressableScale accessibilityLabel="Hear this step again" onPress={() => speak(st.text)} style={[styles.guide, { borderColor: c.hairlineStrong }]}>
            <Icon name="speaker" size={16} color={c.ink} />
            <Txt variant="subhead" style={{ flex: 1 }}>
              Read it again
            </Txt>
          </PressableScale>
          {handsFree ? (
            <View style={{ alignItems: 'center', marginTop: space.l }}>
              <View style={[styles.listen, { backgroundColor: c.surface }]}>
                <View style={[styles.listenDot, { backgroundColor: c.primary }]} />
                <Txt variant="subhead">Say “next” — or tap below</Txt>
              </View>
            </View>
          ) : null}
        </View>
      ) : null;
      footer = (
        <Button
          large
          label={tryIndex === 0 ? 'Next step' : 'Done'}
          onPress={() => {
            haptic.select();
            stopSpeaking();
            if (tryIndex === 0) setTryIndex(1);
            else next();
          }}
        />
      );
      break;
    }
    case 'win':
      body = (
        <View style={{ alignItems: 'center', gap: space.l, marginTop: space.x6 }}>
          <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(14)} style={[styles.winRing, { borderColor: c.primary }]}>
            <Icon name="check" size={40} color={c.primary} strokeWidth={2.2} />
          </Animated.View>
          <Head center lead="That’s it. " em="You’re doing it." />
          <Txt variant="body" tone="secondary" align="center">
            Your full look takes about {look?.totalTimeMin ?? 10} minutes. We’ve saved it to your plan.
          </Txt>
        </View>
      );
      footer = <Button label="Continue" onPress={() => { haptic.success(); next(); }} />;
      break;
    case 'heard':
      body = (
        <>
          <Head lead="How did you " em="hear about Mago?" />
          <View style={styles.opts}>
            {heardOrder.map((h) => (
              <Option key={h} label={h} selected={p.heardFrom === h} onPress={() => p.set({ heardFrom: h })} />
            ))}
          </View>
        </>
      );
      footer = <Button label="Continue" disabled={!p.heardFrom} onPress={() => { track('onb_heard_from', { source: p.heardFrom ?? 'unknown' }); next(); }} />;
      break;
    case 'name':
      body = (
        <>
          <Head lead="What should we " em="call you?" />
          <Txt variant="callout" tone="secondary">
            We’ll greet you by name every morning.
          </Txt>
          <NameField autoFocus value={name} onChange={setName} onSubmit={() => name.trim() && (p.set({ name: name.trim() }), next())} />
        </>
      );
      footer = <Button label="Continue" disabled={!name.trim()} onPress={() => { p.set({ name: name.trim() }); track('onb_q_name', { result: 'answered' }); next(); }} />;
      break;
    case 'loader': {
      const occ = p.occasions.slice(0, 2).join(' & ').toLowerCase();
      const checks = [
        occ ? `Looks for ${occ}` : 'Looks for your week',
        minutes ? `Under ${minutes} minutes each` : 'Full looks, at your pace',
        p.skill === 'pro' ? 'Short, expert steps' : p.skill === 'beginner' ? 'Every step explained' : 'Steps explained clearly',
        `${p.weeklyGoal} ${p.weeklyGoal === 1 ? 'look' : 'looks'} a week`,
        bagPicks.length ? 'Checked against your bag' : 'Products shown on every step',
      ];
      body = (
        <View style={{ gap: space.xl, marginTop: space.x5 }}>
          <LoaderRing progress={Math.min(1, loaderStep / 6)} />
          <Txt variant="title2" align="center" accessibilityLiveRegion="polite">
            Creating your look plan{firstName ? `, ${firstName}` : ''}…
          </Txt>
          <View style={{ gap: space.s }}>
            {checks.slice(0, Math.min(loaderStep, 5)).map((t, k) => (
              <CheckLine key={t} text={t} delay={k === loaderStep - 1 ? 0 : 0} />
            ))}
          </View>
        </View>
      );
      break;
    }
    case 'plan':
      body = (
        <>
          <Head lead="Your first week of looks " em="is ready." />
          <View style={{ gap: space.s }}>
            {planDays.map(({ date, routine }) => (
              <View key={date.toISOString()} style={[styles.planRow, { backgroundColor: c.surface }]}>
                <View style={[styles.planDay, { backgroundColor: c.surfaceAlt }]}>
                  <Txt variant="caption" tone="secondary">
                    {date.toLocaleDateString(undefined, { weekday: 'short' })}
                  </Txt>
                  <Txt variant="headline">{date.getDate()}</Txt>
                </View>
                <LookPhoto image={routineImage(routine)} style={styles.planPhoto} />
                <View style={{ flex: 1 }}>
                  <Txt variant="headline" numberOfLines={2}>
                    {routine.title}
                  </Txt>
                  <Txt variant="footnote" tone="secondary">
                    {routine.totalTimeMin} min · steps ready
                  </Txt>
                </View>
              </View>
            ))}
          </View>
          <Reply text={`Keep this pace and you’ll have done ${projection.count} looks by ${projection.date}.`} />
        </>
      );
      footer = (
        <Button
          label="Love it"
          onPress={() => {
            const ses = useSessions.getState();
            const lib = useLibrary.getState();
            for (const { date, routine } of planDays) {
              lib.ensureSaved(routine);
              ses.addPlan({ routineId: routine.id, date: isoDay(date), occasion: occasionFor(p.occasions), repeatWeekdays: false });
            }
            track('plan_created', { count: planDays.length, source: 'onboarding' });
            next();
          }}
        />
      );
      break;
    case 'notif':
      body = (
        <>
          <Head lead="Want a nudge " em="on look days?" />
          <View style={[styles.notif, { backgroundColor: c.surface }]}>
            <View style={[styles.notifIcon, { backgroundColor: c.primary }]}>
              <Txt variant="caption" style={{ color: c.inkOnPrimary, fontWeight: '700' }}>
                M
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="footnote" tone="secondary">
                Mago · now
              </Txt>
              <Txt variant="subhead">
                Your {look?.title ?? 'look'} is ready — {look?.totalTimeMin ?? 10} min, {look ? stepCount(look) : 6} steps
              </Txt>
            </View>
          </View>
          <Txt variant="callout" tone="secondary">
            One reminder on the days you planned. Never more than one a day.
          </Txt>
        </>
      );
      footer = (
        <View style={{ gap: space.s }}>
          <Button
            label="Remind me"
            icon="bell"
            onPress={async () => {
              const N = (globalThis as { Notification?: { requestPermission?: () => Promise<string> } }).Notification;
              if (Platform.OS === 'web' && N?.requestPermission) {
                try {
                  await N.requestPermission();
                } catch {
                  /* the preview may not allow it; the setting is still saved */
                }
              }
              setPrefs({ notificationsAsked: true, notifyPlanner: true });
              next();
            }}
          />
          <Button variant="ghost" label="Not now" onPress={() => { setPrefs({ notificationsAsked: true, notifyPlanner: false }); next(); }} />
        </View>
      );
      break;
    case 'account':
      body = (
        <>
          <Head lead="Keep your looks " em="safe." />
          <Txt variant="body" tone="secondary">
            Your library and plan are backed up and encrypted, on every phone you use.
          </Txt>
          <View style={[styles.planRow, { backgroundColor: c.surface }]}>
            <View style={[styles.planDay, { backgroundColor: c.surfaceAlt }]}>
              <Txt variant="headline">{planDays.length}</Txt>
              <Txt variant="caption" tone="secondary">
                looks
              </Txt>
            </View>
            <Txt variant="callout" style={{ flex: 1 }}>
              Your plan, goals and makeup bag
            </Txt>
          </View>
          <PressableScale accessibilityRole="checkbox" accessibilityState={{ checked: adult }} accessibilityLabel="I’m 18 or older" onPress={() => { haptic.select(); setAdult(!adult); }} style={styles.adult}>
            <View style={[styles.box, { borderColor: adult ? c.primary : c.hairlineStrong, backgroundColor: adult ? c.primary : 'transparent' }]}>
              {adult ? <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.4} /> : null}
            </View>
            <Txt variant="body">I’m 18 or older</Txt>
          </PressableScale>
          <Txt variant="footnote" tone="secondary">
            By continuing you agree to the Terms and Privacy Policy.
          </Txt>
        </>
      );
      footer = (
        <View style={{ gap: space.s }}>
          {Platform.OS !== 'android' ? (
            <Button label="Continue with Apple" icon="lock" disabled={!adult || busy} loading={busy} onPress={() => link('apple')} />
          ) : null}
          <Button variant={Platform.OS === 'android' ? 'primary' : 'secondary'} label="Continue with Google" disabled={!adult || busy} onPress={() => link('google')} />
          <Button variant="ghost" label="Not now" disabled={!adult} onPress={() => { p.set({ ageConfirmed: true }); track('onb_age_confirmed'); next(); }} />
          <PressableScale accessibilityLabel="I’m under 18" onPress={() => router.replace('/onboarding/blocked')} style={{ alignSelf: 'center', minHeight: 32, justifyContent: 'center' }}>
            <Txt variant="footnote" tone="secondary">
              I’m under 18
            </Txt>
          </PressableScale>
        </View>
      );
      break;
    case 'paywall': {
      const t = trialTimeline();
      const yearly = OFFERINGS.find((o) => o.id === 'yearly')!;
      const monthly = OFFERINGS.find((o) => o.id === 'monthly')!;
      body = (
        <>
          <View style={styles.payTop}>
            <View style={[styles.badge, { backgroundColor: c.surfaceAlt }]}>
              <Txt variant="eyebrow" style={{ color: c.primary }}>
                Mago Pro
              </Txt>
            </View>
            {closeShown ? (
              <PressableScale accessibilityLabel="Close" onPress={() => { track('paywall_closed', { from: 'onboarding' }); jump('offer'); }} style={[styles.tryClose, { backgroundColor: c.surfaceAlt }]}>
                <Icon name="close" size={18} />
              </PressableScale>
            ) : (
              <View style={{ width: 44, height: 44 }} />
            )}
          </View>
          <Head lead="Do every look " em="you love." />
          <View style={{ gap: space.xs }}>
            {['Unlimited looks from every tutorial', 'Hands-free, with the exact products', 'Your week of looks, planned'].map((b) => (
              <CheckLine key={b} text={b} />
            ))}
          </View>
          <View style={[styles.timeline, { backgroundColor: c.surface }]}>
            {[
              ['Today', `Full access · ${t.today}`],
              ['Day 5', `We remind you · ${t.reminder}`],
              ['Day 7', `Plan starts · ${t.charge}`],
            ].map(([a, b]) => (
              <View key={a} style={styles.tlRow}>
                <Txt variant="headline" style={{ width: 64 }}>
                  {a}
                </Txt>
                <Txt variant="callout" tone="secondary" style={{ flex: 1 }}>
                  {b}
                </Txt>
              </View>
            ))}
          </View>
          {[yearly, monthly].map((o) => {
            const sel = plan === o.id;
            return (
              <PressableScale key={o.id} accessibilityRole="radio" accessibilityState={{ checked: sel }} accessibilityLabel={`${o.title}, ${o.price}${o.trialDays ? ', 7 days free' : ''}`} onPress={() => { haptic.select(); setPlan(o.id); }} style={[styles.planOpt, { backgroundColor: c.surface, borderColor: sel ? c.primary : 'transparent' }]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="headline">
                    {o.title}
                    {o.trialDays ? ' · 7 days free' : ''}
                  </Txt>
                  <Txt variant="footnote" tone="secondary">
                    {o.price}
                    {o.id === 'yearly' ? ` · ${o.perMonth}` : ' · no trial'}
                  </Txt>
                </View>
                {o.id === 'yearly' ? (
                  <View style={[styles.badge, { backgroundColor: c.primary }]}>
                    <Txt variant="eyebrow" style={{ color: c.inkOnPrimary }}>
                      Best value
                    </Txt>
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </>
      );
      footer = (
        <View style={{ gap: space.xs }}>
          <Button
            variant="hero"
            label={plan === 'yearly' ? 'Start my free week' : 'Subscribe monthly'}
            loading={busy}
            onPress={async () => {
              setBusy(true);
              const r = await purchase(plan);
              setBusy(false);
              if (r.ok) finish();
            }}
          />
          <Txt variant="footnote" tone="secondary" align="center">
            {plan === 'yearly' ? 'No payment today · ' : ''}Cancel anytime · Restore in Settings
          </Txt>
        </View>
      );
      break;
    }
    case 'offer':
      body = (
        <View style={{ gap: space.l, marginTop: space.l }}>
          <View style={[styles.gift, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="gift" size={52} color={c.primary} />
          </View>
          <Head center lead="A gift for " em="your first look." />
          <Txt variant="body" tone="secondary" align="center">
            Your first year of Pro for {RECOVERY_OFFER.price} instead of {OFFERINGS[0]!.price.replace('/year', '')}. This offer ends in 24 hours.
          </Txt>
          <Countdown />
        </View>
      );
      footer = (
        <View style={{ gap: space.s }}>
          <Button
            variant="hero"
            label="Claim my gift"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              track('offer_claimed', { from: 'onboarding' });
              const r = await purchase('yearly');
              setBusy(false);
              if (r.ok) finish();
            }}
          />
          <Button variant="ghost" label="Continue with 5 free looks a month" onPress={finish} />
        </View>
      );
      break;
  }

  async function link(provider: 'apple' | 'google') {
    setBusy(true);
    try {
      await linkAccount(provider);
      p.set({ ageConfirmed: true });
      track('onb_age_confirmed');
      next();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={header} footer={footer} scroll={scroll} contentStyle={scroll ? undefined : { flex: 1 }}>
      <Animated.View key={step} entering={enter} style={[styles.block, !scroll && { flex: 1 }]}>
        {body}
      </Animated.View>
    </Screen>
  );
}

/**
 * Recovery offer price (skill screen 25: "[offer price]"). OWNER TO CONFIRM — set to the price you
 * want in RevenueCat; it is shown on the offer screen.
 */
const RECOVERY_OFFER = { price: '$29.99' };

function Countdown() {
  const { c } = useTheme();
  const [end] = useState(() => Date.now() + 24 * 3600 * 1000);
  const [now, setNow] = useState(() => Date.now());
  const t = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    t.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (t.current) clearInterval(t.current);
    };
  }, []);
  const left = Math.max(0, end - now);
  const hh = String(Math.floor(left / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.badge, { backgroundColor: c.surfaceAlt, paddingHorizontal: space.l }]}>
        <Txt variant="headline" style={{ fontVariant: ['tabular-nums'], color: c.primary }} accessibilityLabel={`Ends in ${hh} hours ${mm} minutes`}>
          {hh} : {mm} : {ss}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.l, marginTop: space.l },
  opts: { gap: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  insight: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  insightPhoto: { width: '100%', height: 170, borderRadius: radius.card },
  insightChip: { position: 'absolute', left: 8, top: 8, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  miniStep: { borderRadius: radius.chip, paddingHorizontal: space.m, paddingVertical: space.s },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card },
  howNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  guide: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56, paddingHorizontal: space.l, borderRadius: radius.card, borderWidth: 1.5 },
  dots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.l },
  dotHit: { width: 44, alignItems: 'center', gap: 6, paddingVertical: space.s },
  dot: { width: 22, height: 22, borderRadius: 11 },
  promise: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.card },
  lookPhoto: { width: 170, height: 220, borderRadius: radius.card, borderWidth: 2 },
  lookCheck: { position: 'absolute', right: 10, top: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  listen: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.l, minHeight: 44, borderRadius: radius.pill },
  listenDot: { width: 10, height: 10, borderRadius: 5 },
  tryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.s },
  tryClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tryBody: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m, marginTop: space.x3, marginBottom: space.xl },
  winRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card },
  planDay: { width: 52, height: 56, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center' },
  planPhoto: { width: 52, height: 56, borderRadius: radius.thumb },
  notif: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card, marginVertical: space.m },
  notifIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  adult: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 48 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  payTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: 6 },
  timeline: { borderRadius: radius.card, padding: space.l, gap: space.s },
  tlRow: { flexDirection: 'row', alignItems: 'center' },
  planOpt: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.l, borderRadius: radius.card, borderWidth: 1.5 },
  gift: { alignSelf: 'center', width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
});
