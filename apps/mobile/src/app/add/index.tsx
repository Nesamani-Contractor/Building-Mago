import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
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

/** M-12 Add sheet: paste link · upload a video · write it myself. */
export default function Add() {
  const router = useRouter();
  const { c } = useTheme();
  const acct = useAccount();
  const [link, setLink] = useState('');
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
    const text = await Clipboard.getStringAsync().catch(() => '');
    if (!text) return setError('Your clipboard is empty. Copy the video link first.');
    setLink(text);
    go(text);
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
      <Card style={{ marginTop: space.l, gap: space.l }}>
        <View style={styles.row}>
          <Icon name="link" size={22} />
          <Txt variant="headline">Paste a tutorial link</Txt>
        </View>
        <TextInput
          value={link}
          onChangeText={(t) => {
            setLink(t);
            setError(null);
          }}
          placeholder="YouTube, TikTok or Instagram link"
          placeholderTextColor={c.inkSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => go(link)}
          accessibilityLabel="Tutorial link"
          style={[styles.input, { color: c.ink, borderColor: error ? c.danger : c.hairlineStrong, backgroundColor: c.surface }]}
        />
        {error ? (
          <Txt variant="callout" tone="danger" accessibilityLiveRegion="assertive">
            {error}
          </Txt>
        ) : null}
        {link.trim() ? (
          <Button variant="hero" label="Turn into steps" onPress={() => go(link)} />
        ) : (
          <Button variant="hero" label="Paste from clipboard" icon="link" onPress={paste} />
        )}
      </Card>

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
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  input: { borderWidth: 1, borderRadius: radius.chip, minHeight: 52, paddingHorizontal: space.l, fontFamily: fonts.sans, fontSize: 17 },
  grid: { flexDirection: 'row', gap: space.m, marginTop: space.l },
});
