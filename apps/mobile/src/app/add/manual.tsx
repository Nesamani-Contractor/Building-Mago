import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { countWords, MAX_STEP_WORDS, validateRoutine, type Routine } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';
import { useLibrary } from '@/data/library';
import { uid } from '@/lib/id';
import { track } from '@/services/analytics';
import { findRoutine } from '@/lib/routines';
import { haptic } from '@/design/haptics';

interface Draft {
  id: string;
  text: string;
}

/** M-23 Manual routine editor (no AI, no cost). Also used to edit any saved routine (M-26). */
export default function ManualEditor() {
  const router = useRouter();
  const { c } = useTheme();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const existing = edit ? findRoutine(edit) : undefined;
  const save = useLibrary((s) => s.save);
  const updateRoutine = useLibrary((s) => s.updateRoutine);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [steps, setSteps] = useState<Draft[]>(
    existing ? existing.sections.flatMap((s) => s.steps.map((st) => ({ id: st.id, text: st.text }))) : [1, 2, 3].map(() => ({ id: uid('st'), text: '' })),
  );
  const [error, setError] = useState<string | null>(null);

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j] as Draft, next[i] as Draft];
    setSteps(next);
    haptic.select();
  }

  function submit() {
    const filled = steps.filter((s) => s.text.trim());
    const routine: Routine = existing
      ? {
          ...existing,
          title: title.trim(),
          // Keep each step in its original section; new steps join the last section.
          sections: existing.sections
            .map((sec, si) => ({
              name: sec.name,
              steps: filled
                .filter((d) => {
                  const home = existing.sections.findIndex((x) => x.steps.some((st) => st.id === d.id));
                  return home === si || (home === -1 && si === existing.sections.length - 1);
                })
                .map((d) => {
                  const old = sec.steps.find((x) => x.id === d.id);
                  return { ...(old ?? { productRefs: [] }), id: d.id, text: d.text.trim() };
                }),
            }))
            .filter((sec) => sec.steps.length > 0),
        }
      : {
          id: uid('rt'),
          title: title.trim(),
          creator: { name: 'You' },
          source: { platform: 'manual', language: 'en' },
          totalTimeMin: Math.max(3, filled.length * 2),
          category: 'Full look',
          occasion: ['Everyday'],
          difficulty: 'easy',
          tags: [],
          sections: [{ name: 'Steps', steps: filled.map((s) => ({ id: s.id, text: s.text.trim(), productRefs: [] })) }],
          products: [],
        };
    if (existing) {
      const prodRefs = new Set(routine.sections.flatMap((s) => s.steps.flatMap((st) => st.productRefs)));
      routine.products = existing.products.filter((p) => prodRefs.has(p.ref));
    }
    const issues = validateRoutine(routine);
    if (issues.length) {
      const first = issues[0]?.message ?? '';
      setError(/at least/.test(first) ? 'Add at least 3 steps.' : /Title/.test(first) ? 'Give your look a name.' : first);
      return;
    }
    if (existing) {
      if (!useLibrary.getState().items[existing.id]) save(existing);
      updateRoutine(existing.id, routine);
      router.back();
    } else {
      save(routine);
      track('manual_routine_created', { steps: filled.length });
      router.replace(`/routine/${routine.id}`);
    }
  }

  return (
    <Screen
      mood="calm"
      header={<TopBar title={existing ? 'Edit steps' : 'Write a look'} />}
      footer={<Button label={existing ? 'Save changes' : 'Save this look'} onPress={submit} />}
    >
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
        Name
      </Txt>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. My 5-minute work face"
        placeholderTextColor={c.inkSecondary}
        accessibilityLabel="Look name"
        maxLength={80}
        style={[styles.title, { color: c.ink, borderColor: c.hairlineStrong }]}
      />
      <Txt variant="footnote" tone="secondary" style={{ marginTop: space.xl }}>
        Steps — short and clear works best (up to {MAX_STEP_WORDS} words)
      </Txt>
      <View style={{ gap: space.m, marginTop: space.s }}>
        {steps.map((s, i) => {
          const words = countWords(s.text);
          return (
            <Card key={s.id} style={{ gap: space.s, padding: space.l }}>
              <View style={styles.stepHead}>
                <Txt variant="subhead">Step {i + 1}</Txt>
                <View style={styles.tools}>
                  <Tool label={`Move step ${i + 1} up`} icon="chevronLeft" rotate onPress={() => move(i, -1)} />
                  <Tool label={`Move step ${i + 1} down`} icon="chevronRight" rotate onPress={() => move(i, 1)} />
                  <Tool label={`Delete step ${i + 1}`} icon="trash" onPress={() => setSteps(steps.filter((x) => x.id !== s.id))} />
                </View>
              </View>
              <TextInput
                value={s.text}
                multiline
                onChangeText={(t) => setSteps(steps.map((x) => (x.id === s.id ? { ...x, text: t } : x)))}
                placeholder="What to do"
                placeholderTextColor={c.inkSecondary}
                accessibilityLabel={`Step ${i + 1} text`}
                style={[styles.step, { color: c.ink }]}
              />
              {words > MAX_STEP_WORDS ? (
                <Txt variant="footnote" tone="danger">
                  {words} words — try splitting this into two steps.
                </Txt>
              ) : null}
            </Card>
          );
        })}
        <Button variant="secondary" icon="plus" label="Add a step" onPress={() => setSteps([...steps, { id: uid('st'), text: '' }])} />
        {error ? (
          <Txt variant="callout" tone="danger" accessibilityLiveRegion="assertive">
            {error}
          </Txt>
        ) : null}
      </View>
    </Screen>
  );
}

function Tool({ label, icon, onPress, rotate }: { label: string; icon: 'chevronLeft' | 'chevronRight' | 'trash'; onPress: () => void; rotate?: boolean }) {
  return (
    <PressableScale accessibilityLabel={label} onPress={onPress} style={styles.tool}>
      <View style={rotate ? { transform: [{ rotate: '90deg' }] } : undefined}>
        <Icon name={icon} size={18} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  title: { borderWidth: 1, borderRadius: radius.chip, minHeight: 52, paddingHorizontal: space.l, fontFamily: fonts.sans, fontSize: 17, marginTop: space.s },
  stepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tools: { flexDirection: 'row' },
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  step: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 24, minHeight: 48, maxHeight: 104, textAlignVertical: 'top' },
});
