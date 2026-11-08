// Background worker: pulls import jobs from the queue and runs the AI pipeline.
// Triggered every 10 s by pg_cron (see backend/README.md). Not callable by app users.
import { env, fail, json, serviceClient } from '../_shared/http.ts';
import { ADAPTERS } from '../_shared/adapters.ts';
import { estimateCostUsd, structureRoutine } from '../_shared/ai.ts';
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
