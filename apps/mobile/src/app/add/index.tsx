import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { checkConversionQuota } from '@mago/shared';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
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
  const params = useLocalSearchParams<{ url?: string }>();
  const [link, setLink] = useState(params.url ?? '');
  const [error, setError] = useState<string | null>(null);
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
    <Screen mood="calm" header={<TopBar title="Add a look" backIcon="close" backLabel="Close" />}>
      <Txt variant="title2" accessibilityRole="header" style={{ marginTop: space.l }}>
        Turn a tutorial into steps
      </Txt>
      <Card style={{ marginTop: space.l, gap: space.m }}>
        <Txt variant="headline">How it works</Txt>
        {[
          'In YouTube, TikTok or Instagram, open the tutorial and tap Share → Copy link.',
          'Come back here and paste it into the box below.',
          'Tap Turn into steps.',
        ].map((t, i) => (
          <View key={i} style={styles.howRow}>
            <View style={[styles.num, { borderColor: c.accent }]}>
              <Txt variant="subhead">{i + 1}</Txt>
            </View>
            <Txt variant="callout" style={{ flex: 1 }}>
              {t}
            </Txt>
          </View>
        ))}
      </Card>

      <Txt variant="subhead" style={{ marginTop: space.xl }} nativeID="linkLabel">
        Paste your link here
      </Txt>
      <View style={[styles.field, { borderColor: error ? c.danger : c.inkSecondary, backgroundColor: c.surface }]}>
        <Icon name="link" size={20} color={c.inkSecondary} />
        <TextInput
          value={link}
          onChangeText={(t) => {
            setLink(t);
            setError(null);
          }}
          placeholder="e.g. https://youtu.be/…"
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
          <PressableScale accessibilityLabel="Paste from clipboard" onPress={paste} style={[styles.pasteBtn, { backgroundColor: c.tint }]}>
            <Txt variant="subhead" style={{ color: c.accentText }}>Paste</Txt>
          </PressableScale>
        )}
      </View>
      {error ? (
        <Txt variant="callout" tone="danger" accessibilityLiveRegion="assertive" style={{ marginTop: space.s }}>
          {error}
        </Txt>
      ) : null}
      <Button variant="hero" label="Turn into steps" disabled={!link.trim()} onPress={() => go(link)} style={{ marginTop: space.l }} />
      <PressableScale accessibilityLabel="Try a sample link" onPress={() => {
        setError(null);
        setLink(SAMPLE_LINK);
      }} style={styles.sample}>
        <Txt variant="subhead" style={{ textDecorationLine: 'underline', textDecorationColor: c.accent }}>
          No link handy? Try a sample link
        </Txt>
      </PressableScale>

      <Txt variant="subhead" tone="secondary" style={{ marginTop: space.xl }}>
        Or
      </Txt>
      <View style={styles.grid}>
        <Option icon="upload" title="Upload a video" body="A saved video or screen recording, up to 15 min" onPress={upload} />
        <Option icon="pencil" title="Write it myself" body="Your own steps, no link needed" onPress={() => router.push('/add/manual')} />
      </View>

      <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.xl }}>
        {acct.isPro
          ? `${quota.remaining} of ${quota.limit} conversions left this month`
          : `${quota.remaining} of ${quota.limit} free conversions left · Refreshes ${new Date(quota.refreshesOn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
      </Txt>
      <Txt variant="footnote" tone="secondary" align="center" style={{ marginTop: space.xs }}>
        Looks someone already converted are free and instant.
      </Txt>
    </Screen>
  );
}

function Option({ icon, title, body, onPress }: { icon: IconName; title: string; body: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={`${title}. ${body}`} style={{ flex: 1 }}>
      <Card style={{ gap: space.s, minHeight: 132 }}>
        <Icon name={icon} size={24} />
        <Txt variant="headline">{title}</Txt>
        <Txt variant="footnote" tone="secondary">
          {body}
        </Txt>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, minWidth: 0, minHeight: 52, fontFamily: fonts.sans, fontSize: 16 },
  grid: { flexDirection: 'row', gap: space.m, marginTop: space.s },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  num: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.s, borderWidth: 1.5, borderRadius: radius.chip, paddingLeft: space.l, paddingRight: 8, minHeight: 60, marginTop: space.s },
  inlineBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pasteBtn: { minHeight: 44, flexShrink: 0, paddingHorizontal: space.l, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sample: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: space.s },
});
