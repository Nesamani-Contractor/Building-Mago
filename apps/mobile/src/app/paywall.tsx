import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { LookPhoto } from '@/components/Bits';
import { photo } from '@/design/media';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, softShadow, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useAccount, type PlanId } from '@/data/account';
import { OFFERINGS, purchase, restore, trialTimeline } from '@/services/purchases';
import { config, isDemo } from '@/services/config';
import { track } from '@/services/analytics';


/** S-26 Paywall (v3): real looks, "How your free trial works" timeline, one clear price, yearly pre-selected, close always visible. */
export default function Paywall() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isPro = useAccount((s) => s.isPro);
  const [plan, setPlan] = useState<PlanId>('yearly');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const t = trialTimeline();
  const offer = OFFERINGS.find((o) => o.id === plan) ?? OFFERINGS[0]!;

  useEffect(() => {
    track('paywall_viewed', { trigger: from ?? 'unknown' });
  }, [from]);

  async function buy() {
    setBusy(true);
    setMsg(null);
    const r = await purchase(plan);
    setBusy(false);
    if (r.ok) {
      haptic.success();
      router.back();
    } else setMsg(r.message ?? 'The purchase didn’t go through. You haven’t been charged.');
  }

  const context =
    from === 'limit'
      ? 'You’ve used this month’s 5 free looks. Your saved looks always stay free.'
      : from === 'simplify'
        ? 'Simplify is part of Pro.'
        : null;
  const trial = offer.trialDays > 0;
  const steps = [
    { icon: 'lock' as const, d: `Today · ${t.today}`, s: 'Everything unlocks: up to 150 looks a month, Simplify, and swaps from your bag.' },
    { icon: 'bell' as const, d: `Day 5 · ${t.reminder}`, s: 'We’ll remind you that your trial is ending.' },
    { icon: 'star' as const, d: `Day 7 · ${t.charge}`, s: `Your first charge, ${offer.price.replace('/year', ' for the year')}. Cancel any time before and pay nothing.` },
  ];

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.s, paddingBottom: insets.bottom + 260 }} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <View style={styles.topRow}>
            <PressableScale accessibilityLabel="Close" onPress={() => router.back()} style={[styles.close, { backgroundColor: c.surfaceAlt }]}>
              <Icon name="close" size={18} color={c.ink} />
            </PressableScale>
          </View>
          <View style={styles.strip} accessible accessibilityLabel="Looks you can unveil with Pro">
            {(['softGlam', 'partyLiner', 'glossyLips'] as const).map((k) => (
              <LookPhoto key={k} image={photo(k)} style={[styles.stripPhoto, { height: Math.min(168, Math.round(height * 0.18)) }]} />
            ))}
          </View>
          <Txt variant="footnote" tone="secondary" style={{ marginTop: space.s }}>
            Unveil looks like these — up to 150 a month, not 5.
          </Txt>

          {context ? (
            <Txt variant="callout" style={{ marginTop: space.xl }}>
              {context}
            </Txt>
          ) : null}
          <Txt variant="title1" accessibilityRole="header" style={{ marginTop: context ? space.s : space.xl }}>
            {trial ? 'How your free trial works' : 'Mago Pro, month to month'}
          </Txt>

          {trial ? (
            <View style={{ marginTop: space.l }}>
              {steps.map((x, i) => (
                <View key={x.d} style={styles.timeline}>
                  <View style={styles.rail}>
                    <View style={[styles.tdot, { backgroundColor: i === 0 ? c.primary : c.surfaceAlt }]}>
                      <Icon name={x.icon} size={16} color={i === 0 ? c.inkOnPrimary : c.primary} strokeWidth={1.8} />
                    </View>
                    {i < steps.length - 1 ? <View style={[styles.tline, { backgroundColor: c.hairlineStrong }]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: space.l, gap: 2 }}>
                    <Txt variant="headline">{x.d}</Txt>
                    <Txt variant="callout" tone="secondary">
                      {x.s}
                    </Txt>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Txt variant="callout" tone="secondary" style={{ marginTop: space.s }}>
              Up to 150 looks a month, Simplify, and swaps from your bag. Billed {offer.price}; cancel any time in Settings.
            </Txt>
          )}

          <View style={{ gap: space.s, marginTop: space.l }} accessibilityRole="radiogroup">
            {OFFERINGS.map((o) => {
              const sel = plan === o.id;
              return (
                <PressableScale
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  accessibilityLabel={`${o.title}, ${o.price}${o.trialDays ? `, ${o.trialDays} days free` : ', no trial'}`}
                  onPress={() => {
                    haptic.select();
                    setPlan(o.id);
                  }}
                >
                  <View style={[styles.plan, { backgroundColor: c.surface, borderColor: sel ? c.primary : c.hairlineStrong, borderWidth: sel ? 2 : 1 }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="headline">{o.trialDays ? `${o.title} · ${o.trialDays} days free` : o.title}</Txt>
                      <Txt variant="footnote" tone="secondary">
                        {o.trialDays ? `${o.perMonth.replace('/month', ' a month')}, billed ${o.price.replace('/year', ' a year')}` : `${o.price.replace('/month', ' a month')}, no trial`}
                      </Txt>
                    </View>
                    {o.savings ? (
                      <View style={[styles.save, { backgroundColor: c.surfaceAlt }]}>
                        <Txt variant="caption" style={{ color: c.success, fontWeight: '700' }}>
                          {o.savings}
                        </Txt>
                      </View>
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.l), backgroundColor: c.bg }, softShadow(c, 'card')]}>
        <View style={[styles.column, { gap: space.s }]}>
          {isPro ? (
            <Button label="You’re already Pro" onPress={() => router.back()} />
          ) : (
            <Button loading={busy} label={trial ? 'Start my free trial' : `Subscribe for ${offer.price.replace('/month', ' a month')}`} onPress={buy} />
          )}
          <Txt variant="footnote" tone="secondary" align="center">
            {trial ? 'Start in 2 taps · $0 today · cancel in Settings' : 'Renews monthly · cancel any time in Settings'}
          </Txt>
          {msg ? (
            <Txt variant="footnote" tone="danger" align="center" accessibilityLiveRegion="assertive">
              {msg}
            </Txt>
          ) : null}
          <Txt variant="caption" align="center" style={{ color: c.inkTertiary }}>
            {trial ? `Free for ${offer.trialDays} days, then ${offer.price}. ` : `${offer.price}. `}
            Renews automatically unless cancelled at least 24 hours before the period ends. Payment is charged to your {Platform.OS === 'android' ? 'Google Play' : 'Apple ID'} account.
            {isDemo ? ' Demo mode: no real charge.' : ''}
          </Txt>
          <View style={styles.links}>
            <LinkText label="Restore purchases" onPress={async () => setMsg((await restore()).message)} />
            <LinkText label="Terms" onPress={() => Linking.openURL(config.termsUrl)} />
            <LinkText label="Privacy" onPress={() => Linking.openURL(config.privacyUrl)} />
          </View>
        </View>
      </View>
    </View>
  );
}

function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.s }}>
      <Txt variant="footnote" style={{ textDecorationLine: 'underline' }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: space.xl },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', gap: space.s, marginTop: space.xs },
  stripPhoto: { flex: 1, borderRadius: radius.thumb },
  timeline: { flexDirection: 'row', gap: space.m },
  rail: { width: 32, alignItems: 'center' },
  tdot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tline: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 64, paddingHorizontal: space.l, paddingVertical: space.m, borderRadius: radius.card },
  save: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.l, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
});
