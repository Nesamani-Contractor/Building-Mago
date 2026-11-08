// POST /import-start { url } — validate → normalise → shared cache → quota → queue.
import { fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';
import { normalizeLink, linkErrorMessage } from '../_shared/core/url.ts';
import { FREE_CONVERSIONS_PER_MONTH, PRO_FAIR_USE_PER_MONTH } from '../_shared/core/habit.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return fail('method_not_allowed', 405);

  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const body = await readJson<{ url?: string }>(req);
  if (!body?.url || typeof body.url !== 'string' || body.url.length > 2048) return fail('bad_request');

  const norm = normalizeLink(body.url);
  if (!norm.ok) return fail(norm.error, 422, linkErrorMessage(norm.error));
  const { link } = norm;
  const sb = serviceClient();

  // Remote switches (app_config.adapters).
  const { data: cfg } = await sb.from('app_config').select('value').eq('key', 'adapters').single();
  if (cfg && cfg.value?.[link.platform] === false) return fail('adapter_off', 503, 'Imports from this app are paused. Try uploading the video instead.');

  // 1) Shared cache: instant and free.
  const { data: cached } = await sb.from('routine_cache').select('id, routine').eq('canonical_key', link.canonicalKey).eq('hidden', false).maybeSingle();
  if (cached) return json({ status: 'ready', routine: cached.routine, cacheHit: true });

  // 2) Rate limit: max N imports per hour per user.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from('import_jobs').select('id', { count: 'exact', head: true }).eq('user_id', user.userId).gte('created_at', since);
  if ((count ?? 0) >= 10) return fail('rate_limited', 429, 'That’s a lot of imports at once. Try again in a little while.');

  // 3) Global daily AI spend cap.
  const dayStart = new Date(new Date().toISOString().slice(0, 10)).toISOString();
  const { data: spend } = await sb.from('import_jobs').select('est_cost_usd').gte('created_at', dayStart);
  const { data: aiCfg } = await sb.from('app_config').select('value').eq('key', 'ai').single();
  const total = (spend ?? []).reduce((s, r) => s + Number(r.est_cost_usd ?? 0), 0);
  if (total >= Number(aiCfg?.value?.daily_spend_cap_usd ?? 25)) return fail('busy', 503, 'Mago is very busy right now. Your link is saved — try again later.');

  // 4) Quota (server-side entitlement check — never trust the app).
  const { data: pro } = await sb.rpc('is_pro', { p_user: user.userId });
  const limit = pro ? PRO_FAIR_USE_PER_MONTH : FREE_CONVERSIONS_PER_MONTH;
  const { data: claimed, error: claimErr } = await sb.rpc('claim_conversion', { p_user: user.userId, p_limit: limit });
  if (claimErr) return fail('server_error', 500);
  if (!claimed) return json({ status: 'limit_reached', limit });

  // 5) Queue the job.
  const { data: job, error } = await sb
    .from('import_jobs')
    .insert({ user_id: user.userId, canonical_key: link.canonicalKey, adapter: link.platform, status: 'queued' })
    .select('id')
    .single();
  if (error || !job) {
    await sb.rpc('refund_conversion', { p_user: user.userId });
    return fail('server_error', 500);
  }
  await sb.schema('pgmq_public').rpc('send', { queue_name: 'import_jobs', message: { jobId: job.id } });
  return json({ status: 'queued', jobId: job.id });
});
