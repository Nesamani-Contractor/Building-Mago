// POST /upload-url { sha256, sizeBytes, mimeType } → signed, expiring upload URL in the private bucket.
// The worker transcribes via Gemini File API and deletes the file right after (and ≤ 24 h by purge).
import { fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';

const MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const body = await readJson<{ sha256?: string; sizeBytes?: number; mimeType?: string }>(req);
  if (!body?.sha256 || !/^[a-f0-9]{64}$/.test(body.sha256)) return fail('bad_request');
  if (!body.mimeType || !MIME.has(body.mimeType)) return fail('unsupported_type', 415, 'Please upload an MP4 or MOV video.');
  if (!body.sizeBytes || body.sizeBytes > 500 * 1024 * 1024) return fail('too_large', 413, 'That video is over 500 MB.');

  const sb = serviceClient();
  // Per-user upload cache: same file → reuse the earlier result.
  const { data: existing } = await sb.from('upload_objects').select('id').eq('user_id', user.userId).eq('sha256', body.sha256).maybeSingle();
  if (existing) return json({ status: 'duplicate' });

  const path = `${user.userId}/${body.sha256}`;
  const { data, error } = await sb.storage.from('uploads').createSignedUploadUrl(path);
  if (error || !data) return fail('server_error', 500);
  await sb.from('upload_objects').insert({ user_id: user.userId, sha256: body.sha256, storage_path: path });
  return json({ status: 'ok', path, token: data.token, signedUrl: data.signedUrl });
});
