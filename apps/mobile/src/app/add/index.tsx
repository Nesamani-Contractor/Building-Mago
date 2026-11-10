import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { checkConversionQuota } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { LookPhoto } from '@/components/Bits';
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
  const has = link.trim().length > 0;
  const quotaLine = acct.isPro ? 'Ready in about a minute' : `${quota.remaining} of ${quota.limit} free looks left · refreshes ${refresh}`;

  return (
    <Screen
      mood="calm"
      header={<TopBar backIcon="close" backLabel="Close" />}
      footer={
        <AboveKeyboard>
          <Button label={has ? 'Unveil this look' : 'Paste a link to start'} disabled={!has} onPress={() => go(link)} />
          <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.s }}>
            {quotaLine}
          </Txt>
        </AboveKeyboard>
      }
    >
      <View style={{ gap: space.xs }}>
        <Txt variant="title1" accessibilityRole="header">
          Unveil a look
        </Txt>
        <Txt variant="callout" tone="secondary">
          Paste a YouTube, TikTok or Instagram link. We’ll turn it into calm steps.
        </Txt>
      </View>

      <View style={[styles.field, { backgroundColor: c.surface, borderColor: error ? c.danger : focused || has ? c.primary : c.hairlineStrong }]}>
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
          placeholder="Paste a link"
          placeholderTextColor={c.inkSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => has && go(link)}
          accessibilityLabel="Tutorial link"
          style={[styles.input, { color: c.ink }]}
        />
        {has ? (
          <PressableScale accessibilityLabel="Clear link" onPress={() => setLink('')} style={[styles.inlineBtn, { backgroundColor: c.surfaceAlt }]}>
            <Icon name="close" size={16} />
          </PressableScale>
        ) : null}
      </View>
      {error ? (
        <Txt variant="callout" tone="danger" accessibilityLiveRegion="assertive" style={{ marginTop: space.s }}>
          {error}
        </Txt>
      ) : null}

      {!has ? (
        <PressableScale accessibilityLabel="Use the link you copied" onPress={paste} scaleTo={0.985} style={[styles.clip, { backgroundColor: c.surfaceAlt }]}>
          <View style={[styles.clipIcon, { backgroundColor: c.surface }]}>
            <Icon name="clipboard" size={18} color={c.primary} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Txt variant="headline" style={{ fontSize: 15, lineHeight: 20 }}>
              Use the link you copied
            </Txt>
            <Txt variant="footnote" tone="secondary">
              In the app: Share → Copy link
            </Txt>
          </View>
        </PressableScale>
      ) : null}

      {sample ? (
        <PressableScale
          accessibilityLabel={`No link handy? Try a sample look: ${sample.title}, ${sample.totalTimeMin} minutes`}
          onPress={() => {
            track('unveil_sample_started');
            router.push(`/unveil/${sample.id}`);
          }}
          scaleTo={0.985}
          style={[styles.sample, { backgroundColor: c.surface }]}
        >
          <LookPhoto image={routineImage(sample)} style={styles.sampleThumb} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="footnote" tone="secondary">
              No link handy? Try a sample
            </Txt>
            <Txt variant="headline">{sample.title}</Txt>
            <Txt variant="footnote" style={{ color: c.primary, fontWeight: '600' }}>
              {sample.totalTimeMin} min · free
            </Txt>
          </View>
          <Icon name="chevronRight" size={20} color={c.inkSecondary} />
        </PressableScale>
      ) : null}

      <View style={{ marginTop: space.xl }}>
        <Option icon="upload" title="Upload a video" body="From your photos, up to 15 min" onPress={upload} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.hairlineStrong, marginLeft: 38 }} />
        <Option icon="pencil" title="Write my own steps" body="No video needed" onPress={() => router.push('/add/manual')} />
      </View>
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
  field: { flexDirection: 'row', alignItems: 'center', gap: space.s, borderWidth: 2, borderRadius: radius.pill, paddingLeft: space.l, paddingRight: 6, minHeight: 56, marginTop: space.xl },
  inlineBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  clip: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 60, padding: space.m, borderRadius: radius.card, marginTop: space.m },
  clipIcon: { width: 36, height: 36, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },
  sample: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card, marginTop: space.m },
  sampleThumb: { width: 56, height: 72, borderRadius: radius.thumb },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.l, minHeight: 64 },
});
