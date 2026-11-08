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
import { callFunction } from './supabase';
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

/** Upload of her own saved video or screen recording (≤ 15 min / 500 MB). */
export function startUploadImport(file: { uri: string; name: string; size?: number }): StartResult {
  if (file.size && file.size > 500 * 1024 * 1024) return { kind: 'invalid', message: 'That video is over 500 MB. Trim it or pick a shorter one.' };
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
  useLibrary.getState().upsertImport(base);
  track('import_started', { adapter: 'upload' });
  runDemoPipeline(id, { platform: 'upload', localVideoUri: file.uri });
  return { kind: 'job', jobId: id };
}

/** Retry a job that was waiting for a connection. */
export function retryImport(jobId: string): void {
  const job = useLibrary.getState().imports[jobId];
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
  src: { platform: 'youtube' | 'upload'; videoId?: string; url?: string; localVideoUri?: string },
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
      creator: { name: src.platform === 'upload' ? 'Your video' : 'YouTube creator' },
      source: { platform: src.platform, videoId: src.videoId, url: src.url, language: 'en' },
    };
    if (validateRoutine(routine).length > 0) {
      useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: 'We couldn’t build clear steps from this one.' });
      track('import_failed', { error_code: 'validation' });
      return;
    }
    useLibrary.getState().save(routine, { localVideoUri: src.localVideoUri, isDemoContent: true });
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
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = await callFunction<{ status: string; stage: number; routine?: Routine; error?: string }>('import-status', { jobId: start.jobId });
      useLibrary.getState().patchImport(jobId, { stage: s.stage });
      if (s.status === 'ready' && s.routine) return finishLive(jobId, s.routine);
      if (s.status === 'non_english') return useLibrary.getState().patchImport(jobId, { status: 'non_english' });
      if (s.status === 'failed') throw new Error(s.error ?? 'failed');
    }
    throw new Error('timeout');
  } catch (e) {
    useLibrary.getState().patchImport(jobId, { status: 'failed', errorMessage: 'Something interrupted the import. Try again in a moment.' });
    track('import_failed', { error_code: e instanceof Error ? e.message.slice(0, 40) : 'unknown' });
  }
}

function finishLive(jobId: string, routine: Routine) {
  useLibrary.getState().save(routine);
  useLibrary.getState().patchImport(jobId, { status: 'ready', stage: 4, routineId: routine.id, title: routine.title });
  track('import_succeeded', { adapter: routine.source.platform });
}
