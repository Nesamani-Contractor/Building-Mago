import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Screen, TopBar } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { Button } from '@/components/Button';
import { Card } from '@/components/Surface';
import { Icon } from '@/components/Icon';
import { Eyebrow, LookPhoto } from '@/components/Bits';
import { Skeleton, StateView } from '@/components/States';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { haptic } from '@/design/haptics';
import { IMPORT_STAGES, useLibrary } from '@/data/library';
import { usePrefs } from '@/data/prefs';
import { retryImport, startUploadImport } from '@/services/importService';

/** S-08 Processing: honest stages, Save immediately, guided upload for TikTok/Instagram. */
export default function ImportProgress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const job = useLibrary((s) => (id ? s.imports[id] : undefined));
  const notificationsAsked = usePrefs((s) => s.notificationsAsked);
  const done = useRef(false);

  useEffect(() => {
    if (job?.status === 'ready' && job.routineId && !done.current) {
      done.current = true;
      haptic.success();
      const target = `/unveil/${job.routineId}`;
      // Ask for notifications only after the first successful import, with a pre-permission screen.
      if (!notificationsAsked) router.replace(`/notifications?next=${encodeURIComponent(target)}`);
      else router.replace(target as never);
    }
  }, [job?.status, job?.routineId, notificationsAsked, router]);

  if (!job) {
    return (
      <Screen header={<TopBar />}>
        <StateView icon="info" title="We can’t find that import" body="It may have finished already. Check your Library." actionLabel="Open Library" onAction={() => router.replace('/(tabs)/library')} />
      </Screen>
    );
  }

  async function upload() {
    const res = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const r = startUploadImport({ uri: a.uri, name: a.name, size: a.size ?? undefined, mimeType: a.mimeType ?? undefined });
    if (r.kind === 'job') router.replace(`/import/${r.jobId}`);
    if (r.kind === 'limit') router.replace('/paywall?from=limit');
  }

  const ytId = job.platform === 'youtube' && job.canonicalKey?.startsWith('youtube:') ? job.canonicalKey.slice(8) : undefined;
  const thumb = ytId && /^[\w-]{11}$/.test(ytId) ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined;
  const sourceLabel =
    job.platform === 'youtube' ? 'YouTube' : job.platform === 'tiktok' ? 'TikTok' : job.platform === 'instagram' ? 'Instagram' : 'Your video';

  if (job.status === 'needs_upload') {
    return (
      <Screen header={<TopBar title={sourceLabel} />} footer={<Button label="Upload the video" icon="upload" onPress={upload} />}>
        <View style={{ gap: space.m, marginTop: space.xxl }}>
          <Txt variant="title1">Almost there</Txt>
          <Txt variant="body" tone="secondary">
            {sourceLabel} only shares the caption with apps like Mago, and it isn’t enough to write steps. Save the video to your phone and upload it — it takes a few seconds.
          </Txt>
        </View>
        <Card style={{ marginTop: space.xxl, gap: space.l }}>
          {[
            { n: 1, t: `In ${sourceLabel}, tap Share → Save video` },
            { n: 2, t: 'Come back to Mago' },
            { n: 3, t: 'Tap Upload the video below' },
          ].map((s) => (
            <View key={s.n} style={styles.guide}>
              <Txt variant="title3" tone="secondary" style={{ width: 24 }}>
                {s.n}
              </Txt>
              <Txt variant="body" style={{ flex: 1 }}>
                {s.t}
              </Txt>
            </View>
          ))}
        </Card>
        <Txt variant="footnote" tone="secondary" style={{ marginTop: space.l }}>
          Your video is used only to write the steps and is deleted from our server within 24 hours.
        </Txt>
        <Button variant="ghost" label="Write it myself instead" onPress={() => router.replace('/add/manual')} style={{ marginTop: space.l }} />
      </Screen>
    );
  }

  if (job.status === 'failed' || job.status === 'non_english' || job.status === 'pending_offline' || job.status === 'limit_reached') {
    const content = {
      failed: { icon: 'info' as const, title: 'We couldn’t finish this one', body: job.errorMessage ?? 'Something interrupted it. Your free conversions weren’t used.', action: 'Try again', on: () => retryImport(job.id) },
      non_english: { icon: 'info' as const, title: 'English videos only for now', body: 'Translation is coming in a later update. Nothing was charged. You can write the steps yourself meanwhile.', action: 'Write it myself', on: () => router.replace('/add/manual') },
      pending_offline: { icon: 'wifiOff' as const, title: 'Saved for later', body: 'You’re offline. We’ll turn this into steps as soon as you’re back online.', action: 'Try now', on: () => retryImport(job.id) },
      limit_reached: { icon: 'sparkle' as const, title: 'You’ve used this month’s free looks', body: 'Your saved looks are always yours. Go Pro for unlimited conversions, or wait for next month.', action: 'See Mago Pro', on: () => router.push('/paywall?from=limit') },
    }[job.status];
    return (
      <Screen header={<TopBar />} scroll={false} contentStyle={{ flex: 1, justifyContent: 'center' }}>
        <StateView icon={content.icon} title={content.title} body={content.body} actionLabel={content.action} onAction={content.on} />
      </Screen>
    );
  }

  return (
    <Screen
      mood="reveal"
      header={<TopBar onBack={() => router.replace('/(tabs)')} backLabel="Back to Today" />}
      footer={
        <View style={{ gap: space.s }}>
          <Button label="Save and keep browsing" onPress={() => router.replace('/(tabs)')} />
          <Txt variant="footnote" tone="secondary" align="center">
            Usually under a minute. Leave anytime — we’ll let you know when it’s ready.
          </Txt>
        </View>
      }
    >
      {thumb ? (
        <View style={[styles.thumb, { backgroundColor: c.mediaTint }]}>
          <LookPhoto image={{ source: { uri: thumb } }} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <View style={{ gap: space.s, marginTop: space.xxl }}>
        <Eyebrow>{sourceLabel}</Eyebrow>
        <Txt variant="title1" accessibilityRole="header">
          {job.title ?? 'Turning it into steps'}
        </Txt>
      </View>
      <Card style={{ marginTop: space.xxl, gap: space.l }} accessibilityLiveRegion="polite">
        {IMPORT_STAGES.slice(0, 4).map((label, i) => {
          const state = i < job.stage ? 'done' : i === job.stage ? 'now' : 'next';
          return (
            <View key={label} style={styles.stage} accessibilityLabel={`${label}, ${state === 'done' ? 'done' : state === 'now' ? 'in progress' : 'waiting'}`}>
              <View style={[styles.dot, state === 'done' ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: state === 'now' ? c.primary : c.hairlineStrong }]}>
                {state === 'done' ? <Icon name="check" size={14} color={c.inkOnPrimary} strokeWidth={2.4} /> : state === 'now' ? <View style={[styles.inner, { backgroundColor: c.primary }]} /> : null}
              </View>
              <Txt variant={state === 'now' ? 'headline' : 'callout'} tone={state === 'next' ? 'secondary' : 'ink'}>
                {state === 'now' ? `${label}…` : label}
              </Txt>
            </View>
          );
        })}
      </Card>
      <View style={{ gap: space.m, marginTop: space.xxl }} accessibilityElementsHidden>
        <Skeleton width="70%" height={18} />
        <Skeleton width="90%" height={18} />
        <Skeleton width="55%" height={18} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guide: { flexDirection: 'row', alignItems: 'center', gap: space.l },
  thumb: { marginTop: space.l, aspectRatio: 16 / 9, borderRadius: radius.card, overflow: 'hidden' },
  stage: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 28 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inner: { width: 8, height: 8, borderRadius: 4 },
});
