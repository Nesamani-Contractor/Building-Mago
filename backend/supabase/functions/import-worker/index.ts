// Background worker: pulls import jobs from the queue and runs the AI pipeline.
// Triggered every 10 s by pg_cron (see backend/README.md). Not callable by app users.
import { env, fail, json, serviceClient } from '../_shared/http.ts';
import { ADAPTERS } from '../_shared/adapters.ts';
import { deleteGeminiFile, estimateCostUsd, structureRoutine, uploadToGemini, watchVideo } from '../_shared/ai.ts';
import { normalizeLink } from '../_shared/core/url.ts';

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${env('WORKER_SECRET')}`) return fail('forbidden', 403);
  const sb = serviceClient();
  const { data: msgs } = await sb.schema('pgmq_public').rpc('read', { queue_name: 'import_jobs', sleep_seconds: 0, n: 3 });
  const results: string[] = [];

  for (const msg of (msgs ?? []) as { msg_id: number; message: { jobId: string } }[]) {
    const jobId = msg.message.jobId;
    const { data: job } = await sb.from('import_jobs').select('*').eq('id', jobId).single();
    if (!job || job.status !== 'queued') {
      await sb.schema('pgmq_public').rpc('delete', { queue_name: 'import_jobs', message_id: msg.msg_id });
      continue;
    }
    const stage = (n: number, extra: Record<string, unknown> = {}) =>
      sb.from('import_jobs').update({ stage: n, updated_at: new Date().toISOString(), ...extra }).eq('id', jobId);

    try {
      await stage(1, { status: 'processing' });
      if (job.adapter === 'upload') {
        await processUpload(sb, job, stage);
        results.push(`${jobId}:ok`);
        await sb.schema('pgmq_public').rpc('delete', { queue_name: 'import_jobs', message_id: msg.msg_id });
        continue;
      }
      const norm = normalizeLink(job.canonical_key.replace(/^youtube:/, 'https://youtu.be/'));
      if (job.adapter !== 'youtube' || !norm.ok) throw new Error('unsupported');
      const adapter = ADAPTERS[norm.link.platform];
      const res = await adapter.fetchNotes(norm.link);
      if (res.kind === 'needs_upload' || !res.notes) {
        await stage(1, { status: 'needs_upload' });
        await sb.rpc('refund_conversion', { p_user: job.user_id });
      } else if (res.notes.language !== 'en') {
        // D-07: translation is out of v1 — no charge.
        await stage(2, { status: 'non_english' });
        await sb.rpc('refund_conversion', { p_user: job.user_id });
      } else {
        await stage(2);
        const routineId = crypto.randomUUID();
        const { routine, inputTokens, outputTokens } = await structureRoutine(res.notes, {
          id: routineId,
          source: { platform: 'youtube', videoId: norm.link.videoId, url: norm.link.canonicalUrl, language: 'en' },
          creator: res.creator ? { name: res.creator } : undefined,
          durationSec: res.notes.durationSec,
        });
        await stage(3);
        const { data: cache } = await sb
          .from('routine_cache')
          .upsert(
            {
              canonical_key: job.canonical_key,
              platform: 'youtube',
              video_id: norm.link.videoId,
              creator_name: res.creator ?? null,
              language: 'en',
              routine,
              model_version: `${Deno.env.get('GEMINI_MODEL') ?? 'gemini'}+${Deno.env.get('CLAUDE_MODEL') ?? 'claude'}`,
            },
            { onConflict: 'canonical_key' },
          )
          .select('id')
          .single();
        await stage(4, {
          status: 'ready',
          routine_cache_id: cache?.id,
          est_cost_usd: estimateCostUsd(res.notes.durationSec ?? 600, inputTokens, outputTokens),
        });
      }
      results.push(`${jobId}:ok`);
    } catch (e) {
      await sb.from('import_jobs').update({ status: 'failed', error_code: String((e as Error).message).slice(0, 60) }).eq('id', jobId);
      await sb.rpc('refund_conversion', { p_user: job.user_id });
      results.push(`${jobId}:failed`);
    }
    await sb.schema('pgmq_public').rpc('delete', { queue_name: 'import_jobs', message_id: msg.msg_id });
  }
  return json({ processed: results });
});

type Stage = (n: number, extra?: Record<string, unknown>) => PromiseLike<unknown>;

/**
 * Her own uploaded video (saved TikTok/Reel, screen recording, camera-roll clip).
 * Gemini watches the actual file — speech, on-screen captions, packaging and the visible actions —
 * so silent and caption-only videos get real steps too. The routine is hers alone (stored on the
 * job, never in the shared cache), and the video is deleted from our bucket and from Gemini
 * straight after, whatever happens.
 */
async function processUpload(sb: ReturnType<typeof serviceClient>, job: { id: string; user_id: string; canonical_key: string }, stage: Stage) {
  const sha = job.canonical_key.replace(/^upload:/, '');
  const { data: obj } = await sb.from('upload_objects').select('id, storage_path, mime_type').eq('user_id', job.user_id).eq('sha256', sha).single();
  if (!obj) throw new Error('upload_missing');
  let geminiName: string | undefined;
  try {
    const { data: video, error } = await sb.storage.from('uploads').download(obj.storage_path);
    if (error || !video) throw new Error('upload_unreadable');
    const mime = obj.mime_type ?? 'video/mp4';
    const file = await uploadToGemini(video, mime, `mago-${job.id}`);
    geminiName = file.name;
    const notes = await watchVideo(file.uri, mime);
    if (notes.notes.trim() === 'NOT_BEAUTY') {
      await stage(2, { status: 'failed', error_code: 'not_beauty' });
      await sb.rpc('refund_conversion', { p_user: job.user_id });
      return;
    }
    if (notes.language !== 'en' && notes.language !== 'xx') {
      await stage(2, { status: 'non_english' });
      await sb.rpc('refund_conversion', { p_user: job.user_id });
      return;
    }
    await stage(2);
    const { routine, inputTokens, outputTokens } = await structureRoutine(notes, {
      id: crypto.randomUUID(),
      source: { platform: 'upload', language: 'en' },
      creator: { name: 'Your video' },
      durationSec: notes.durationSec,
    });
    await stage(3);
    await stage(4, { status: 'ready', routine, est_cost_usd: estimateCostUsd(notes.durationSec ?? 300, inputTokens, outputTokens) });
  } finally {
    if (geminiName) await deleteGeminiFile(geminiName);
    await sb.storage.from('uploads').remove([obj.storage_path]);
    await sb.from('upload_objects').delete().eq('id', obj.id);
  }
}
