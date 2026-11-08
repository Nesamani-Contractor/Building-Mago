// POST /import-status { jobId } — the caller's own job only.
import { fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const body = await readJson<{ jobId?: string }>(req);
  if (!body?.jobId || !/^[0-9a-f-]{36}$/.test(body.jobId)) return fail('bad_request');

  const sb = serviceClient();
  const { data: job } = await sb.from('import_jobs').select('status, stage, routine_cache_id, routine, error_code').eq('id', body.jobId).eq('user_id', user.userId).maybeSingle();
  if (!job) return fail('not_found', 404, 'We can’t find that import.');
  let routine = job.routine;
  if (!routine && job.routine_cache_id) {
    const { data } = await sb.from('routine_cache').select('routine').eq('id', job.routine_cache_id).single();
    routine = data?.routine;
  }
  return json({ status: job.status, stage: job.stage, routine: job.status === 'ready' ? routine : undefined, error: job.error_code ?? undefined });
});
