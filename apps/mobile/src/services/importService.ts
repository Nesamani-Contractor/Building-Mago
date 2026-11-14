import {
  checkConversionQuota,
  linkErrorMessage,
  normalizeLink,
  validateRoutine,
  type Routine,
} from '@mago/shared';
import { useLibrary, type ImportJob } from '@/data/library';
import { useAccount, conversionsUsed } from '@/data/account';
import { SAMPLE_ROUTINES } from '@/data/samples';
import { uid } from '@/lib/id';
import { track } from './analytics';
import { callFunction, supabase } from './supabase';
import { watchUploadedVideo, WatchError } from './videoWatch';
import { isDemo } from './config';
import { isOnlineNow } from './network';

export type StartResult =
  | { kind: 'job'; jobId: string }
  | { kind: 'existing'; routineId: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'limit'; jobId: string };

/** Source adapters can be switched off remotely (app_config). Demo: all on. */
export const SOURCE_SWITCHES = { youtube: true, tiktok: true, instagram: true, upload: true };

/**
 * Start importing a pasted/shared link.
 * Order matches the server pipeline: validate → normalise → cache/duplicate check → quota → job.
 */
export function startLinkImport(input: string): StartResult {
  const res = normalizeLink(input);
  if (!res.ok) {
    track('import_failed', { error_code: res.error });
    return { kind: 'invalid', message: linkErrorMessage(res.error) };
  }
  const { link } = res;
  if (!SOURCE_SWITCHES[link.platform]) return { kind: 'invalid', message: 'Imports from this app are paused for now. Try uploading the video instead.' };

  const lib = useLibrary.getState();
  const existing = Object.values(lib.items).find((s) => s.routine.source.platform === link.platform && s.routine.source.videoId === link.videoId);
  if (existing) return { kind: 'existing', routineId: existing.routine.id };

  const id = uid('imp');
  const base: ImportJob = {
    id,
    kind: 'link',
    platform: link.platform,
    canonicalKey: link.canonicalKey,
    status: 'processing',
    stage: 0,
    createdAt: new Date().toISOString(),
  };
  track('import_started', { adapter: link.platform });

  if (!isOnlineNow()) {
    lib.upsertImport({ ...base, status: 'pending_offline' });
    return { kind: 'job', jobId: id };
  }

  const acct = useAccount.getState();
  const quota = checkConversionQuota(conversionsUsed(acct), acct.isPro, new Date());
  if (!quota.allowed) {
    lib.upsertImport({ ...base, status: 'limit_reached' });
    track('import_limit_hit', { limit: quota.limit });
    return { kind: 'limit', jobId: id };
  }

  lib.upsertImport(base);
  if (link.platform === 'tiktok' || link.platform === 'instagram') {
    // D-05: public metadata only. Short captions rarely have enough to build steps → guided upload.
    setTimeout(() => useLibrary.getState().patchImport(id, { status: 'needs_upload', stage: 1 }), 1200);
    return { kind: 'job', jobId: id };
  }
  if (isDemo) runDemoPipeline(id, { platform: 'youtube', videoId: link.videoId, url: link.canonicalUrl });
  else void runLivePipeline(id, link.canonicalUrl);
  return { kind: 'job', jobId: id };
}

/** Her uploaded videos, kept in memory for this session so "Try again" can re-run a failed upload. */
const uploadSources = new Map<string, { uri: string; name: string; size?: number; mimeType?: string }>();

/**
 * Upload of her own saved video or screen recording (≤ 15 min / 500 MB).
 * The steps always come from THIS video — never a sample. Talking, captions-only and completely
 * silent videos are all read (speech, on-screen text, packaging and the visible actions).
 * - Full app (live): the video goes to our private bucket; Gemini watches and hears it on the server.
 * - Claude web preview (demo): frames are read on the device and Claude writes the steps.
 */
export function startUploadImport(file: { uri: string; name: string; size?: number; mimeType?: string }): StartResult {
  if (file.size && file.size > 500 * 1024 * 1024) return { kind: 'invalid', message: 'That video is over 500 MB. Trim it or pick a shorter one.' };
  if (!SOURCE_SWITCHES.upload) return { kind: 'invalid', message: 'Uploads are paused for a moment. Please try again later.' };
  const acct = useAccount.getState();
  const quota = checkConversionQuota(conversionsUsed(acct), acct.isPro, new Date());
  const id = uid('imp');
  const base: ImportJob = {
    id,
    kind: 'upload',
    platform: 'upload',
    title: file.name.replace(/\.[a-z0-9]+$/i, ''),
    status: 'processing',
    stage: 0,
    createdAt: new Date().toISOString(),
  };
  if (!quota.allowed) {
    useLibrary.getState().upsertImport({ ...base, status: 'limit_reached' });
    track('import_limit_hit', { limit: quota.limit });
    return { kind: 'limit', jobId: id };
  }
  uploadSources.set(id, file);
  useLibrary.getState().upsertImport(base);
  track('import_started', { adapter: 'upload' });
  runUpload(id);
  return { kind: 'job', jobId: id };
}

function runUpload(jobId: string) {
  const file = uploadSources.get(jobId);
  if (!file) {
    useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: 'Please pick the video again — tap Add a look, then Upload a video.' });
    return;
  }
  useLibrary.getState().patchImport(jobId, { status: 'processing', stage: 0, errorMessage: undefined });
  if (!isOnlineNow()) {
    useLibrary.getState().patchImport(jobId, { status: 'pending_offline' });
    return;
  }
  if (isDemo) void runPreviewWatch(jobId, file);
  else void runLiveUpload(jobId, file);
}

/** Demo build: watch the video on the device through the Claude preview. */
async function runPreviewWatch(jobId: string, file: { uri: string; name: string }) {
  const routineId = uid('rt');
  try {
    const { routine, videoStyle } = await watchUploadedVideo(file, routineId, (stage) => useLibrary.getState().patchImport(jobId, { stage }));
    useLibrary.getState().save(routine, { localVideoUri: file.uri });
    useLibrary.getState().patchImport(jobId, { status: 'ready', stage: 4, routineId: routine.id, title: routine.title });
    useAccount.getState().recordConversion();
    track('import_succeeded', { adapter: 'upload', video_style: videoStyle ?? 'unknown' });
    track('routine_saved', { source: 'import' });
  } catch (e) {
    const err = e instanceof WatchError ? e : new WatchError('no_steps', 'Something interrupted it. Tap Try again.');
    if (err.code === 'cancelled') return;
    useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: err.message });
    track('import_failed', { error_code: err.code });
  }
}

/** Full app: put the video in our private bucket, then the server watches it (Gemini) and writes the steps. */
async function runLiveUpload(jobId: string, file: { uri: string; name: string; size?: number; mimeType?: string }) {
  try {
    const blob = await (await fetch(file.uri)).blob();
    const mimeType = file.mimeType ?? (blob.type || (/\.mov$/i.test(file.name) ? 'video/quicktime' : 'video/mp4'));
    const sha256 = await fileFingerprint(blob);
    const up = await callFunction<{ status: 'ok' | 'duplicate'; path: string; token?: string }>('upload-url', { sha256, sizeBytes: blob.size, mimeType });
    if (up.status === 'ok' && up.token) {
      const { error } = await supabase().storage.from('uploads').uploadToSignedUrl(up.path, up.token, blob, { contentType: mimeType });
      if (error) throw new Error('upload_failed');
    }
    useLibrary.getState().patchImport(jobId, { stage: 1 });
    const start = await callFunction<{ status: 'queued' | 'limit_reached'; jobId?: string }>('import-upload', { sha256 });
    if (start.status === 'limit_reached' || !start.jobId) {
      useLibrary.getState().patchImport(jobId, { status: 'limit_reached' });
      return;
    }
    await pollServerJob(jobId, start.jobId, file.uri);
  } catch (e) {
    useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: 'The upload was interrupted. Check your connection and tap Try again.' });
    track('import_failed', { error_code: e instanceof Error ? e.message.slice(0, 40) : 'unknown' });
  }
}

/** SHA-256 of the file where the platform offers it (web); otherwise a random id (no dedupe). */
async function fileFingerprint(blob: Blob): Promise<string> {
  const subtle = (globalThis as { crypto?: Crypto }).crypto?.subtle;
  if (subtle && blob.size <= 200 * 1024 * 1024) {
    const digest = await subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const hex = () => Math.random().toString(16).slice(2).padEnd(13, '0').slice(0, 13);
  return (hex() + hex() + hex() + hex() + hex()).slice(0, 64);
}

/** Retry a job that was waiting for a connection. */
export function retryImport(jobId: string): void {
  const job = useLibrary.getState().imports[jobId];
  if (job?.kind === 'upload') return runUpload(jobId);
  if (!job || !job.canonicalKey) return;
  const [platform, videoId] = job.canonicalKey.split(':') as ['youtube', string];
  useLibrary.getState().patchImport(jobId, { status: 'processing', stage: 0, errorMessage: undefined });
  if (isDemo) runDemoPipeline(jobId, { platform, videoId, url: `https://www.youtube.com/watch?v=${videoId}` });
  else void runLivePipeline(jobId, `https://www.youtube.com/watch?v=${videoId}`);
}

// ---------------------------------------------------------------------------------------------
// Demo pipeline: honest stage-by-stage progress, then a sample routine clearly marked as demo.

function runDemoPipeline(
  jobId: string,
  src: { platform: 'youtube'; videoId?: string; url?: string },
) {
  const stageMs = [700, 1500, 1600, 900];
  let t = 0;
  stageMs.forEach((ms, i) => {
    t += ms;
    setTimeout(() => {
      useLibrary.getState().patchImport(jobId, { stage: i + 1 });
      track('import_stage', { stage: i + 1 });
    }, t);
  });
  setTimeout(() => {
    const seed = (src.videoId ?? jobId).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
    const template = SAMPLE_ROUTINES[seed % SAMPLE_ROUTINES.length] as Routine;
    const routine: Routine = {
      ...template,
      id: uid('rt'),
      creator: { name: 'YouTube creator' },
      source: { platform: src.platform, videoId: src.videoId, url: src.url, language: 'en' },
    };
    if (validateRoutine(routine).length > 0) {
      useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: 'We couldn’t build clear steps from this one.' });
      track('import_failed', { error_code: 'validation' });
      return;
    }
    useLibrary.getState().save(routine, { isDemoContent: true });
    useLibrary.getState().patchImport(jobId, { status: 'ready', stage: 4, routineId: routine.id, title: routine.title });
    useAccount.getState().recordConversion();
    track('import_succeeded', { adapter: src.platform });
    track('routine_saved', { source: 'import' });
  }, t + 300);
}

// ---------------------------------------------------------------------------------------------
// Live pipeline: server does all AI work; the app polls status. (Realtime subscription in Phase 3.)

async function runLivePipeline(jobId: string, canonicalUrl: string) {
  try {
    const start = await callFunction<{ status: 'ready' | 'queued' | 'limit_reached'; jobId?: string; routine?: Routine }>('import-start', {
      url: canonicalUrl,
    });
    if (start.status === 'limit_reached') {
      useLibrary.getState().patchImport(jobId, { status: 'limit_reached' });
      return;
    }
    if (start.status === 'ready' && start.routine) {
      track('import_cache_hit', {});
      finishLive(jobId, start.routine);
      return;
    }
    await pollServerJob(jobId, start.jobId!);
  } catch (e) {
    useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: 'Something interrupted the import. Try again in a moment.' });
    track('import_failed', { error_code: e instanceof Error ? e.message.slice(0, 40) : 'unknown' });
  }
}

/** Poll the server job until it is ready (Realtime subscription comes later). */
async function pollServerJob(jobId: string, serverJobId: string, localVideoUri?: string) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const s = await callFunction<{ status: string; stage: number; routine?: Routine; error?: string }>('import-status', { jobId: serverJobId });
    useLibrary.getState().patchImport(jobId, { stage: s.stage });
    if (s.status === 'ready' && s.routine) return finishLive(jobId, s.routine, localVideoUri);
    if (s.status === 'non_english') return useLibrary.getState().patchImport(jobId, { status: 'non_english' });
    if (s.status === 'failed' && s.error === 'not_beauty')
      return useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: 'This doesn’t look like a beauty routine. Try another video.' });
    if (s.status === 'failed') throw new Error(s.error ?? 'failed');
  }
  throw new Error('timeout');
}

function finishLive(jobId: string, routine: Routine, localVideoUri?: string) {
  useLibrary.getState().save(routine, localVideoUri ? { localVideoUri } : undefined);
  useLibrary.getState().patchImport(jobId, { status: 'ready', stage: 4, routineId: routine.id, title: routine.title });
  track('import_succeeded', { adapter: routine.source.platform });
}
