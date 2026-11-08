// POST /backup { action: 'put', payload } | { action: 'get' }
// D-02 envelope encryption: a random per-backup data key (AES-256-GCM) encrypts the payload; the data
// key is wrapped with BACKUP_MASTER_KEY (Supabase secret). Only linked (non-anonymous) accounts.
// Honest note: this is not end-to-end encryption — the server can decrypt (see ARCHITECTURE §4).
import { env, fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function masterKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', unb64(env('BACKUP_MASTER_KEY')), 'AES-KW', false, ['wrapKey', 'unwrapKey']);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  if (user.isAnonymous) return fail('link_required', 403, 'Link Apple or Google first so your backup has a home.');
  const body = await readJson<{ action?: 'put' | 'get'; payload?: unknown }>(req, 5_000_000);
  if (!body?.action) return fail('bad_request');
  const sb = serviceClient();

  if (body.action === 'put') {
    const dataKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plain = new TextEncoder().encode(JSON.stringify(body.payload ?? {}));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, plain);
    const wrapped = await crypto.subtle.wrapKey('raw', dataKey, await masterKey(), 'AES-KW');
    const { error } = await sb.from('backups').upsert({
      user_id: user.userId,
      ciphertext: b64(cipher),
      iv: b64(iv),
      wrapped_key: b64(wrapped),
      updated_at: new Date().toISOString(),
    });
    if (error) return fail('server_error', 500);
    return json({ ok: true });
  }

  const { data: row } = await sb.from('backups').select('*').eq('user_id', user.userId).maybeSingle();
  if (!row) return json({ ok: true, payload: null });
  const dataKey = await crypto.subtle.unwrapKey('raw', unb64(row.wrapped_key), await masterKey(), 'AES-KW', { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(row.iv) }, dataKey, unb64(row.ciphertext));
  return json({ ok: true, payload: JSON.parse(new TextDecoder().decode(plain)), updatedAt: row.updated_at });
});
