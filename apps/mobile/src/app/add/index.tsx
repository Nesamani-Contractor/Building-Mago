import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { checkConversionQuota } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Eyebrow, LookPhoto } from '@/components/Bits';
import { AboveKeyboard } from '@/lib/keyboard';
import { routineImage } from '@/design/media';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { track } from '@/services/analytics';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';
import { useAccount, conversionsUsed } from '@/data/account';
import { startLinkImport, startUploadImport } from '@/services/importService';

/** M-12 Unveil a look (WOW v2 Beat 5): paste a link · try the bundled sample · upload · write it myself. */
export default function Add() {
  const router = useRouter();
  const { c } = useTheme();
  const acct = useAccount();
  const params = useLocalSearchParams<{ link?: string }>();
  const [link, setLink] = useState(params.link ?? '');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const quota = checkConversionQuota(conversionsUsed(acct), acct.isPro, new Date());

  function go(input: string) {
    setError(null);
    const r = startLinkImport(input);
    if (r.kind === 'invalid') return setError(r.message);
    if (r.kind === 'existing') return router.replace(`/routine/${r.routineId}?already=1`);
    if (r.kind === 'limit') return router.replace(`/paywall?from=limit`);
    router.replace(`/import/${r.jobId}`);
  }

  async function paste() {
    setError(null);
    let text = '';
    try {
      text = await Clipboard.getStringAsync();
    } catch {
      text = '';
    }
    if (!text) {
      // Browsers (and the web preview) often block apps from reading the clipboard.
      setError('Couldn’t read your clipboard here. Tap the box above, then press and hold and choose Paste.');
      return;
    }
    setLink(text.trim());
  }

  async function upload() {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const r = startUploadImport({ uri: a.uri, name: a.name, size: a.size ?? undefined });
    if (r.kind === 'invalid') return setError(r.message);
    if (r.kind === 'limit') return router.replace('/paywall?from=limit');
    if (r.kind === 'job') router.replace(`/import/${r.jobId}`);
  }

  const sample = SAMPLE_ROUTINES[0];
  const refresh = new Date(quota.refreshesOn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <Screen
      mood="calm"
      header={
        <TopBar
          backIcon="close"
          backLabel="Close"
          right={
            <Txt variant="footnote" tone="secondary" style={{ paddingRight: space.s }}>
              {acct.isPro ? `${quota.remaining} unveils left this month` : `${quota.remaining} of ${quota.limit} free unveils left`}
            </Txt>
          }
        />
      }
      footer={
        <AboveKeyboard>
          <Button label="Unveil" disabled={!link.trim()} onPress={() => go(link)} />
          <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.s }}>
            Ready in about a minute · free to see, no sign-up
          </Txt>
        </AboveKeyboard>
      }
    >
      <View style={{ gap: 6, marginTop: space.s }}>
        <Eyebrow>Unveil a look</Eyebrow>
        <Txt variant="display" accessibilityRole="header">
          Paste any GRWM.
        </Txt>
        <Txt variant="body" tone="secondary">
          We slow it down into calm steps — every product, every shade.
        </Txt>
      </View>

      <View
        style={[
          styles.field,
          { backgroundColor: c.surface, borderColor: error ? c.danger : focused ? c.primary : c.hairline },
          focused && { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
        ]}
      >
        <Icon name="link" size={20} color={c.inkSecondary} />
        <TextInput
          value={link}
          onChangeText={(t) => {
            setLink(t);
            setError(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={Platform.OS !== 'web' && !params.link}
          placeholder="YouTube, TikTok or Instagram link"
          placeholderTextColor={c.inkSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => link.trim() && go(link)}
          accessibilityLabel="Tutorial link"
          style={[styles.input, { color: c.ink }]}
        />
        {link ? (
          <PressableScale accessibilityLabel="Clear link" onPress={() => setLink('')} style={styles.inlineBtn}>
            <Icon name="close" size={18} />
          </PressableScale>
        ) : (
          <PressableScale accessibilityLabel="Paste from clipboard" onPress={paste} style={[styles.pasteBtn, { backgroundColor: c.primary }]}>
            <Txt variant="subhead" style={{ color: c.inkOnPrimary, fontWeight: '600' }}>
              Paste
            </Txt>
          </PressableScale>
        )}
      </View>
      {error ? (
        <Txt variant="callout" tone="danger" accessibilityLiveRegion="assertive" style={{ marginTop: space.s }}>
          {error}
        </Txt>
      ) : (
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.s, paddingHorizontal: space.s }}>
          In the app: Share → Copy link. Looks someone already unveiled are free and instant.
        </Txt>
      )}

      <View style={styles.divider}>
        <View style={[styles.rule, { backgroundColor: c.hairlineStrong }]} />
        <Txt variant="footnote" tone="secondary">
          No link handy?
        </Txt>
        <View style={[styles.rule, { backgroundColor: c.hairlineStrong }]} />
      </View>

      {sample ? (
        <PressableScale
          accessibilityLabel={`Try it on a sample look: ${sample.title}, ${sample.totalTimeMin} minutes`}
          onPress={() => {
            track('unveil_sample_started');
            router.push(`/unveil/${sample.id}`);
          }}
          scaleTo={0.985}
          style={[styles.sampleCard, { backgroundColor: c.surface, shadowColor: c.shadow }]}
        >
          <View style={styles.sampleThumb}>
            <LookPhoto image={routineImage(sample)} style={StyleSheet.absoluteFill} />
            <View style={styles.sampleDur}>
              <Icon name="play" size={10} color="#FBF7F4" filled />
              <Txt variant="caption" style={{ color: '#FBF7F4', fontSize: 11, fontWeight: '600' }}>
                {sample.totalTimeMin}:00
              </Txt>
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>Sample look</Eyebrow>
            <Txt variant="title3" style={{ fontFamily: fonts.serif, fontWeight: '400', fontSize: 26, lineHeight: 28 }}>
              {sample.title}
            </Txt>
            <View style={styles.sampleCta}>
              <Txt variant="subhead" style={{ color: c.primary, fontWeight: '600' }}>
                Try it on a sample look
              </Txt>
              <Icon name="arrowRight" size={16} color={c.primary} strokeWidth={1.8} />
            </View>
          </View>
        </PressableScale>
      ) : null}

      <View style={[styles.options, { borderTopColor: c.hairlineStrong }]}>
        <Option icon="upload" title="Upload a video" body="A saved video or screen recording, up to 15 min" onPress={upload} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.hairlineStrong }} />
        <Option icon="pencil" title="Write it myself" body="Your own steps, no link needed" onPress={() => router.push('/add/manual')} />
      </View>
      {!acct.isPro ? (
        <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.l }}>
          Free unveils refresh {refresh}.
        </Txt>
      ) : null}
    </Screen>
  );
}

function Option({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${title}. ${body}`} scaleTo={0.985} style={styles.option}>
      <Icon name={icon} size={22} color={c.inkSecondary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" tone="secondary">
          {body}
        </Txt>
      </View>
      <Icon name="chevronRight" size={20} color={c.inkSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: fonts.sans, fontSize: 17 },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.s, borderWidth: 1.5, borderRadius: radius.pill, paddingLeft: space.l, paddingRight: 6, minHeight: 60, marginTop: space.xxl },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.xxl },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  sampleCard: { flexDirection: 'row', alignItems: 'center', gap: space.l, padding: space.m, borderRadius: radius.card, marginTop: space.l, shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  sampleThumb: { width: 100, height: 132, borderRadius: radius.thumb, overflow: 'hidden', transform: [{ rotate: '-3deg' }] },
  sampleDur: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: 'rgba(42,30,38,0.6)' },
  sampleCta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xs },
  options: { marginTop: space.xxl, borderTopWidth: StyleSheet.hairlineWidth },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.l, paddingVertical: space.l, minHeight: 72 },
  inlineBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pasteBtn: { minHeight: 48, paddingHorizontal: space.l, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
