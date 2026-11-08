// POST /delete-account — Apple 5.1.1(v) / Google Play account deletion. Actually deletes.
// Deleting the auth user cascades to every user table (on delete cascade). Uploads are removed
// from storage first. Shared cache rows (public videos, no personal data) are kept.
import { fail, json, preflight, requireUser, serviceClient } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const sb = serviceClient();

  const { data: uploads } = await sb.from('upload_objects').select('storage_path').eq('user_id', user.userId);
  if (uploads?.length) await sb.storage.from('uploads').remove(uploads.map((u) => u.storage_path));

  const { error } = await sb.auth.admin.deleteUser(user.userId);
  if (error) return fail('server_error', 500, 'We couldn’t delete your account right now. Please try again.');
  return json({ ok: true });
});
