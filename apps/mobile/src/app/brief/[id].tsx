import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { allSteps } from '@mago/shared';
import { RoundButton, Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Eyebrow } from '@/components/Bits';
import { MatchRow, useBagCheck } from '@/components/BagCheck';
import { ProductArt } from '@/components/ProductArt';
import { useTheme } from '@/design/theme';
import { fonts, space } from '@/design/tokens';
import { speak } from '@/services/voice';
import { useRoutine } from '@/lib/routines';
import { useProfile } from '@/data/profile';
import { usePrefs } from '@/data/prefs';
import { track } from '@/services/analytics';

/**
 * The stylist's note: a printed-card style preview of the look before it begins —
 * the plan, what to lay out (from her bag), swaps and missing items, and a few tips.
 * Written from the routine + her bag on the device (no AI call, works offline).
 */
export default function StylistNote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const routine = useRoutine(id);
  const skill = useProfile((s) => s.skill);
  const readAloud = usePrefs((s) => s.readAloud);
  const { check, bagSize } = useBagCheck(routine);

  useEffect(() => {
    track('stylist_note_viewed', { has_bag: bagSize > 0 });
    if (bagSize > 0) track('bag_check_viewed', {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tips = useMemo(() => (routine ? allSteps(routine).filter((s) => s.hint).slice(0, 3) : []), [routine]);
  if (!routine) return <Redirect href="/" />;

  const steps = allSteps(routine).length;
  const sections = routine.sections.map((s) => s.name);
  const opener =
    skill === 'beginner'
      ? 'Take your time — we’ll go one small step at a time.'
      : skill === 'pro'
        ? 'You know your way around this one — here’s the quick plan.'
        : 'Here’s the plan before we begin.';
  return (
    <Screen
      mood="calm"
      header={
        <TopBar
          backIcon="close"
          backLabel="Close"
          right={
            <RoundButton
              icon="speaker"
              label="Read the note aloud"
              onPress={() => speak(`${routine.title}. ${opener} The plan: ${sections.join(', ')}.`)}
            />
          }
        />
      }
      footer={
        <View style={{ gap: space.xs }}>
          <Button label="Begin the look" onPress={() => router.replace(`/follow/${routine.id}`)} />
          <Button variant="ghost" label="Not now" onPress={() => router.back()} />
        </View>
      }
    >
      <View style={{ gap: space.s, marginTop: space.s }}>
        <Eyebrow>Your stylist’s note</Eyebrow>
        <Txt variant="title1" accessibilityRole="header">
          {routine.title}
        </Txt>
        <Txt variant="body" tone="secondary">
          {opener}
        </Txt>
        <Txt variant="subhead" style={{ marginTop: space.xs }}>
          About {routine.totalTimeMin} min · {steps} steps{readAloud ? ' · Read aloud on' : ''}
        </Txt>
      </View>

      <Eyebrow style={styles.sectionLabel}>The plan</Eyebrow>
      <View>
        {sections.map((s, i) => (
          <View key={`${s}-${i}`} style={styles.planRow}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: c.accent }]} />
              {i < sections.length - 1 ? <View style={[styles.line, { backgroundColor: c.accent }]} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: space.l, gap: 2 }}>
              <Txt variant="headline">{s}</Txt>
              <Txt variant="footnote" tone="secondary">
                {routine.sections[i]?.steps.length} {routine.sections[i]?.steps.length === 1 ? 'step' : 'steps'}
              </Txt>
            </View>
          </View>
        ))}
      </View>

      <Eyebrow style={styles.sectionLabel}>Lay these out first</Eyebrow>
      {check ? (
        <View style={{ gap: space.l }}>
          <Txt variant="callout" tone="secondary">
            {check.have} of {routine.products.length} from your bag
            {check.swaps ? ` · ${check.swaps} easy ${check.swaps === 1 ? 'swap' : 'swaps'}` : ''}
            {check.missing ? ` · ${check.missing} missing` : ''}
          </Txt>
          {(['have', 'swap', 'missing'] as const).flatMap((st) =>
            check.matches.filter((m) => m.status === st).map((m) => <MatchRow key={`${st}-${m.product.ref}`} m={m} />),
          )}
        </View>
      ) : (
        <View style={{ gap: space.l }}>
          <View style={styles.layout}>
            {routine.products.map((p) => (
              <View key={p.ref} style={styles.layoutItem}>
                <ProductArt product={p} size={64} />
                <Txt variant="footnote" numberOfLines={2} style={{ fontWeight: '600' }}>
                  {p.name}
                </Txt>
              </View>
            ))}
          </View>
          {bagSize === 0 ? (
            <Button variant="secondary" icon="camera" label="Check against my bag" onPress={() => router.push('/bag/scan')} />
          ) : null}
        </View>
      )}

      {tips.length > 0 ? (
        <>
          <Eyebrow style={styles.sectionLabel}>Tips</Eyebrow>
          <View style={{ gap: space.m }}>
            {tips.map((t) => (
              <View key={t.id} style={styles.tip}>
                <View style={[styles.tipMark, { backgroundColor: c.accent }]} />
                <Txt variant="body" style={{ flex: 1 }}>
                  {t.hint}
                </Txt>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Txt variant="title2" style={styles.sign} align="right">
        — your Mago stylist
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: space.x4, marginBottom: space.l },
  planRow: { flexDirection: 'row', gap: space.l },
  rail: { width: 10, alignItems: 'center', paddingTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  line: { width: 1, flex: 1, marginTop: 4 },
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: space.l, rowGap: space.xl },
  layoutItem: { width: 96, gap: space.s },
  tip: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  tipMark: { width: 1.5, alignSelf: 'stretch', borderRadius: 1, marginVertical: 3 },
  sign: { fontFamily: fonts.serifItalic, marginTop: space.x4, fontSize: 24, lineHeight: 30 },
});
