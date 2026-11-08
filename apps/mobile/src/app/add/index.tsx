import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { checkConversionQuota } from '@mago/shared';
import { RoundButton, Screen, TopBar } from '@/components/Screen';
import { Eyebrow } from '@/components/Bits';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/design/theme';
import { fonts, radius, space } from '@/design/tokens';
import { useAccount, conversionsUsed } from '@/data/account';
import { startLinkImport, startUploadImport } from '@/services/importService';

const SAMPLE_LINK = 'https://youtu.be/MagoDemo001';

/** M-12 Add sheet: paste link · upload a video · write it myself. */
export default function Add() {
  const router = useRouter();
  const { c } = useTheme();
  const acct = useAccount();
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);
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

  return (
    <Screen
      mood="calm"
      header={
        <TopBar
          backIcon="close"
          backLabel="Close"
          right={<RoundButton icon="info" label="How saving a tutorial works" onPress={() => setShowHow(!showHow)} />}
        />
      }
    >
      <View style={{ gap: 6, marginTop: space.s }}>
        <Eyebrow>Add a tutorial</Eyebrow>
        <Txt variant="title1" accessibilityRole="header">
          Turn any tutorial into steps
        </Txt>
      </View>

      {showHow ? (
        <View style={[styles.how, { backgroundColor: c.surface }]}>
          {[
            'In YouTube, TikTok or Instagram, tap Share → Copy link.',
            'Paste it here.',
            'Tap Turn into steps — ready in about a minute.',
          ].map((t, i) => (
            <View key={i} style={styles.howRow}>
              <Txt variant="headline" style={{ width: 20 }}>
                {i + 1}
              </Txt>
              <Txt variant="callout" style={{ flex: 1 }}>
                {t}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.field, { backgroundColor: c.surfaceAlt, borderColor: error ? c.danger : 'transparent' }]}>
        <Icon name="link" size={20} color={c.inkSecondary} />
        <TextInput
          value={link}
          onChangeText={(t) => {
            setLink(t);
            setError(null);
          }}
          placeholder="Paste a tutorial link"
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
      ) : null}
      <Button label="Turn into steps" disabled={!link.trim()} onPress={() => go(link)} style={{ marginTop: space.l }} />
      <PressableScale
        accessibilityLabel="Try a sample link"
        onPress={() => {
          setError(null);
          setLink(SAMPLE_LINK);
        }}
        style={styles.sample}
      >
        <Txt variant="subhead" style={{ color: c.primary }}>
          No link handy? Try a sample
        </Txt>
      </PressableScale>

      <View style={[styles.options, { borderTopColor: c.hairlineStrong }]}>
        <Option icon="upload" title="Upload a video" body="A saved video or screen recording, up to 15 min" onPress={upload} />
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.hairlineStrong }} />
        <Option icon="pencil" title="Write it myself" body="Your own steps, no link needed" onPress={() => router.push('/add/manual')} />
      </View>

      <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.x3 }}>
        {acct.isPro
          ? `${quota.remaining} of ${quota.limit} this month`
          : `${quota.remaining} of ${quota.limit} free this month · Refreshes ${new Date(quota.refreshesOn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
      </Txt>
      <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.xs }}>
        Looks someone already converted are free and instant.
      </Txt>
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
  how: { marginTop: space.l, padding: space.l, borderRadius: radius.thumb, gap: space.m },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.m },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.s, borderWidth: 1.5, borderRadius: radius.pill, paddingLeft: space.l, paddingRight: 6, minHeight: 60, marginTop: space.xxl },
  options: { marginTop: space.x3, borderTopWidth: StyleSheet.hairlineWidth },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.l, paddingVertical: space.l, minHeight: 72 },
  inlineBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pasteBtn: { minHeight: 44, paddingHorizontal: space.l, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sample: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: space.s },
});
