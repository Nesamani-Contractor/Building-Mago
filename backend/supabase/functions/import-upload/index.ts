// POST /import-upload { sha256 } — after the app has put her video in the private bucket via
// /upload-url, queue it for the worker (Gemini watches the file). Same checks as /import-start:
// remote switch, rate limit, spend cap, server-side quota.
import { fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';
import { FREE_CONVERSIONS_PER_MONTH, PRO_FAIR_USE_PER_MONTH } from '../_shared/core/habit.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const body = await readJson<{ sha256?: string }>(req);
  if (!body?.sha256 || !/^[a-f0-9]{64}$/.test(body.sha256)) return fail('bad_request');

  const sb = serviceClient();
  // The file must be one this user uploaded (never a path the client chooses).
  const { data: obj } = await sb.from('upload_objects').select('id').eq('user_id', user.userId).eq('sha256', body.sha256).maybeSingle();
  if (!obj) return fail('not_found', 404, 'We couldn’t find your video. Please upload it again.');

  const { data: cfg } = await sb.from('app_config').select('value').eq('key', 'adapters').single();
  if (cfg && cfg.value?.upload === false) return fail('adapter_off', 503, 'Uploads are paused for a moment. Please try again later.');

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from('import_jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.userId).gte('created_at', since);
  if ((count ?? 0) >= 10) return fail('rate_limited', 429, 'That’s a lot of imports at once. Try again in a little while.');

  const dayStart = new Date(new Date().toISOString().slice(0, 10)).toISOString();
  const { data: spend } = await sb.from('import_jobs').select('est_cost_usd').gte('created_at', dayStart);
  const { data: aiCfg } = await sb.from('app_config').select('value').eq('key', 'ai').single();
  const total = (spend ?? []).reduce((s, r) => s + Number(r.est_cost_usd ?? 0), 0);
  if (total >= Number(aiCfg?.value?.daily_spend_cap_usd ?? 25)) return fail('busy', 503, 'Mago is very busy right now. Try again later.');

  const { data: pro } = await sb.rpc('is_pro', { p_user: user.userId });
  const { data: claimed, error: claimErr } = await sb.rpc('claim_conversion', { p_user: user.userId, p_limit: pro ? PRO_FAIR_USE_PER_MONTH : FREE_CONVERSIONS_PER_MONTH });
  if (claimErr) return fail('server_error', 500);
  if (!claimed) return json({ status: 'limit_reached' });

  const { data: job, error } = await sb
    .from('import_jobs')
    .insert({ user_id: user.userId, canonical_key: `upload:${body.sha256}`, adapter: 'upload', status: 'queued' })
    .select('id')
    .single();
  if (error || !job) {
    await sb.rpc('refund_conversion', { p_user: user.userId });
    return fail('server_error', 500);
  }
  await sb.schema('pgmq_public').rpc('send', { queue_name: 'import_jobs', message: { jobId: job.id } });
  return json({ status: 'queued', jobId: job.id });
});
