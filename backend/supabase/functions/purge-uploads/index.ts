// Scheduled (hourly, pg_cron): delete uploaded videos older than 24 h. Not callable by users.
import { env, fail, json, serviceClient } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${env('WORKER_SECRET')}`) return fail('forbidden', 403);
  const sb = serviceClient();
  const { data: old } = await sb.from('upload_objects').select('id, storage_path').lt('expires_at', new Date().toISOString()).limit(500);
  if (old?.length) {
    await sb.storage.from('uploads').remove(old.map((o) => o.storage_path));
    await sb.from('upload_objects').delete().in('id', old.map((o) => o.id));
  }
  return json({ purged: old?.length ?? 0 });
});
