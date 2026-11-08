import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { allSteps } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Hairline } from '@/components/Surface';
import { MatchRow, useBagCheck } from '@/components/BagCheck';
import { ProductArt } from '@/components/ProductArt';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/design/theme';
import { fonts, radius, softShadow, space } from '@/design/tokens';
import { useRoutine } from '@/lib/routines';
import { useProfile } from '@/data/profile';
import { usePrefs } from '@/data/prefs';
import { track } from '@/services/analytics';

/**
 * The stylist's note: a handwritten-style preview of the look before it begins —
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
  const hand = { fontFamily: fonts.hand };

  return (
    <Screen
      mood="reveal"
      header={<TopBar title="Your stylist’s note" />}
      footer={
        <View style={{ gap: space.s }}>
          <Button variant="hero" label="Begin the look" onPress={() => router.replace(`/follow/${routine.id}`)} />
          <Button variant="ghost" label="Not now" onPress={() => router.back()} />
        </View>
      }
    >
      <View style={[styles.paper, { backgroundColor: c.surface, borderColor: c.hairline }, softShadow(c, 'raised')]}>
        <Txt variant="title2" style={[hand, styles.handTitle]} accessibilityRole="header">
          {routine.title}
        </Txt>
        <Txt variant="body" style={[hand, styles.handBody]}>
          {opener}
        </Txt>

        <View style={styles.facts}>
          <Fact icon="clock" text={`About ${routine.totalTimeMin} min`} />
          <Fact icon="sparkle" text={`${steps} steps`} />
          {readAloud ? <Fact icon="speaker" text="Read aloud" /> : null}
        </View>

        <Hairline style={{ marginVertical: space.l }} />

        <Txt variant="title3" style={[hand, styles.handHeading]}>
          The plan
        </Txt>
        <View style={{ gap: space.s }}>
          {sections.map((s, i) => (
            <View key={`${s}-${i}`} style={styles.planRow}>
              <View style={[styles.num, { borderColor: c.accent }]}>
                <Txt variant="caption">{i + 1}</Txt>
              </View>
              <Txt variant="body" style={[hand, { fontSize: 22, lineHeight: 26 }]}>
                {s}
              </Txt>
              <Txt variant="footnote" tone="secondary">
                · {routine.sections[i]?.steps.length} {routine.sections[i]?.steps.length === 1 ? 'step' : 'steps'}
              </Txt>
            </View>
          ))}
        </View>

        <Hairline style={{ marginVertical: space.l }} />

        <Txt variant="title3" style={[hand, styles.handHeading]}>
          Lay these out first
        </Txt>
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
          <View style={{ gap: space.m }}>
            <View style={styles.layout}>
              {routine.products.map((p) => (
                <View key={p.ref} style={styles.layoutItem}>
                  <ProductArt product={p} size={56} />
                  <Txt variant="caption" align="center" numberOfLines={2}>
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
            <Hairline style={{ marginVertical: space.l }} />
            <Txt variant="title3" style={[hand, styles.handHeading]}>
              Stylist’s tips
            </Txt>
            <View style={{ gap: space.s }}>
              {tips.map((t) => (
                <Txt key={t.id} variant="body" style={[hand, styles.handBody]}>
                  — {t.hint}
                </Txt>
              ))}
            </View>
          </>
        ) : null}

        <Txt variant="body" style={[hand, styles.sign]} align="right">
          — your Mago stylist
        </Txt>
      </View>
    </Screen>
  );
}

function Fact({ icon, text }: { icon: 'clock' | 'sparkle' | 'speaker'; text: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.fact, { borderColor: c.hairlineStrong }]}>
      <Icon name={icon} size={16} />
      <Txt variant="footnote">{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { marginTop: space.l, borderRadius: radius.card, borderWidth: 1, padding: space.xxl },
  handTitle: { fontSize: 38, lineHeight: 42 },
  handHeading: { fontSize: 30, lineHeight: 34, marginBottom: space.s },
  handBody: { fontSize: 22, lineHeight: 28 },
  sign: { fontSize: 24, lineHeight: 30, marginTop: space.xl },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.l },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.xs, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: space.xs },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  num: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  layoutItem: { width: 76, alignItems: 'center', gap: space.xs },
});
