import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Surface';
import { Eyebrow, LookPhoto } from '@/components/Bits';
import { photo } from '@/design/media';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { layout, radius, scrimColors, softShadow, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { useAccount, type PlanId } from '@/data/account';
import { OFFERINGS, purchase, restore, trialTimeline } from '@/services/purchases';
import { config, isDemo } from '@/services/config';
import { track } from '@/services/analytics';

const BENEFITS: { icon: string; title: string; body: string }[] = [
  { icon: 'sparkle', title: 'Every tutorial, turned into steps', body: 'No monthly limit on new looks (fair use: 150 a month).' },
  { icon: 'wand', title: 'Simplify any routine', body: 'A shorter version of long looks that keeps the key effect.' },
  { icon: 'heart', title: 'Your saved looks stay yours', body: 'Everything you saved works forever, Pro or not.' },
];

/** S-26 Paywall. Benefit-led, yearly pre-selected, trial explained in plain words, close always visible. */
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

  const headline =
    from === 'limit'
      ? 'You’ve used this month’s free looks'
      : from === 'simplify'
        ? 'Simplify is part of Pro'
        : from === 'products'
          ? 'See exactly what to use, step by step'
          : 'Every tutorial, ready for your mirror';

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 240 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { height: Math.min(440, Math.round(height * 0.46)) }]}>
          <LookPhoto image={photo('softGlam')} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={scrimColors(c)} style={[StyleSheet.absoluteFill, { top: '30%' }]} />
          <View style={[styles.column, styles.headerText]}>
            <Eyebrow onPhoto>Mago Pro</Eyebrow>
            <Txt variant="title1" style={{ color: c.inkOnPhoto }} accessibilityRole="header">
              {headline}
            </Txt>
            {from === 'limit' ? (
              <Txt variant="callout" style={{ color: c.inkOnPhoto, opacity: 0.92 }}>
                Your saved looks always stay free. Pro removes the monthly limit.
              </Txt>
            ) : null}
          </View>
        </View>

        <View style={[styles.column, { gap: space.l, marginTop: space.xxl }]}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefit}>
              <Icon name="check" size={18} color={c.accent} strokeWidth={2} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="headline">{b.title}</Txt>
                <Txt variant="callout" tone="secondary">
                  {b.body}
                </Txt>
              </View>
            </View>
          ))}

          <View style={{ gap: space.m, marginTop: space.s }} accessibilityRole="radiogroup">
            {OFFERINGS.map((o) => {
              const sel = plan === o.id;
              return (
                <PressableScale
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  accessibilityLabel={`${o.title}, ${o.price}${o.trialDays ? `, ${o.trialDays} days free` : ''}`}
                  onPress={() => {
                    haptic.select();
                    setPlan(o.id);
                  }}
                >
                  <View style={[styles.plan, { backgroundColor: c.surface, borderColor: sel ? c.primary : 'transparent' }]}>
                    <View style={[styles.radio, { borderColor: sel ? c.primary : c.hairlineStrong, backgroundColor: sel ? c.primary : 'transparent' }]}>
                      {sel ? <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.4} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
                        <Txt variant="headline">{o.title}</Txt>
                        {o.savings ? <Badge label={o.savings} tone="plum" /> : null}
                      </View>
                      <Txt variant="callout" tone="secondary">
                        {o.trialDays ? `${o.trialDays} days free, then ${o.price}` : o.price}
                      </Txt>
                    </View>
                    <Txt variant="subhead">{o.perMonth}</Txt>
                  </View>
                </PressableScale>
              );
            })}
          </View>

          {offer.trialDays > 0 ? (
            <View style={{ gap: space.l, marginTop: space.l }}>
              <Txt variant="title3">How your free week works</Txt>
              {[
                { d: `Today, ${t.today}`, s: 'Full Pro access starts. No charge.' },
                { d: t.reminder, s: 'We’ll remind you two days before it ends.' },
                { d: t.charge, s: `You’re charged ${offer.price} unless you cancel before then.` },
              ].map((x, i, arr) => (
                <View key={i} style={styles.timeline}>
                  <View style={styles.rail}>
                    <View style={[styles.tdot, { backgroundColor: i === 0 ? c.primary : c.accent }]} />
                    {i < arr.length - 1 ? <View style={[styles.tline, { backgroundColor: c.accent }]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: space.s }}>
                    <Txt variant="headline">{x.d}</Txt>
                    <Txt variant="footnote" tone="secondary">
                      {x.s}
                    </Txt>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.l), backgroundColor: c.bg }, softShadow(c, 'card')]}>
        <View style={[styles.column, { gap: space.s }]}>
          {isPro ? (
            <Button label="You’re already Pro" onPress={() => router.back()} />
          ) : (
            <Button loading={busy} label={offer.trialDays ? 'Start my free week' : `Subscribe for ${offer.price}`} onPress={buy} />
          )}
          <Txt variant="footnote" tone="secondary" align="center">
            Cancel anytime in Settings.
          </Txt>
          {msg ? (
            <Txt variant="footnote" tone="danger" align="center" accessibilityLiveRegion="assertive">
              {msg}
            </Txt>
          ) : null}
          <Txt variant="caption" align="center" style={{ color: c.inkTertiary }}>
            {offer.trialDays ? `Free for ${offer.trialDays} days, then ${offer.price}. ` : `${offer.price}. `}
            Renews automatically unless cancelled at least 24 hours before the period ends. Payment is charged to your {Platform.OS === 'android' ? 'Google Play' : 'Apple ID'} account. Manage or cancel anytime in {Platform.OS === 'android' ? 'Google Play' : 'App Store'} settings.
            {isDemo ? ' Demo mode: no real charge.' : ''}
          </Txt>
          <View style={styles.links}>
            <LinkText label="Restore purchases" onPress={async () => setMsg((await restore()).message)} />
            <LinkText label="Terms" onPress={() => Linking.openURL(config.termsUrl)} />
            <LinkText label="Privacy" onPress={() => Linking.openURL(config.privacyUrl)} />
          </View>
        </View>
      </View>

      <PressableScale accessibilityLabel="Close" onPress={() => router.back()} style={[styles.close, { top: insets.top + space.s, backgroundColor: c.glassOnPhoto }]}>
        <Icon name="close" size={20} color={c.inkOnPhoto} />
      </PressableScale>
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
  header: { overflow: 'hidden', borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet, borderCurve: 'continuous' },
  headerText: { position: 'absolute', left: 0, right: 0, bottom: space.xxl, gap: space.s },
  benefit: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.l, borderRadius: radius.thumb, borderWidth: 1.5 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  timeline: { flexDirection: 'row', gap: space.l },
  rail: { width: 10, alignItems: 'center', paddingTop: 6 },
  tdot: { width: 9, height: 9, borderRadius: 5 },
  tline: { width: 1, flex: 1, marginTop: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.l, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  close: { position: 'absolute', right: space.l, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
