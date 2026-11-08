// POST /simplify { routine } — Pro only. Entitlement checked on the server BEFORE any AI call.
// v1 uses the shared deterministic simplifier (no AI cost); a Claude-assisted version can replace it
// behind the same endpoint once the golden set shows it keeps the "key effect" better.
import { fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';
import { simplifyRoutine, validateRoutine, type Routine } from '../_shared/core/routine.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const sb = serviceClient();
  const { data: pro } = await sb.rpc('is_pro', { p_user: user.userId });
  if (!pro) return fail('pro_required', 402, 'Simplify is part of Mago Pro.');

  const body = await readJson<{ routine?: Routine }>(req, 200_000);
  if (!body?.routine || validateRoutine(body.routine).length > 0) return fail('bad_request');
  const simple = simplifyRoutine(body.routine, crypto.randomUUID());
  const month = new Date().toISOString().slice(0, 7);
  await sb.from('usage_counters').upsert({ user_id: user.userId, month }, { onConflict: 'user_id,month', ignoreDuplicates: true });
  const { data: row } = await sb.from('usage_counters').select('simplify_count').eq('user_id', user.userId).eq('month', month).single();
  await sb.from('usage_counters').update({ simplify_count: (row?.simplify_count ?? 0) + 1 }).eq('user_id', user.userId).eq('month', month);
  return json({ routine: simple });
});
