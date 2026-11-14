// POST /scan-products { image: base64, mimeType } → { items: [{ name, brand, shade, kind, role, shadeHex, count, confidence }] }
// D-18: a product photo is read once by Gemini vision and is NOT stored anywhere (no Storage, no DB,
// no logs). Rate-limited per user. Face photos never come here.
import { env, fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';
import { PRODUCT_KINDS } from '../_shared/core/routine.ts';
import { PRODUCT_ROLES, productPhotoPrompt, productRole } from '../_shared/core/bag.ts';

const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
const MIME = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/webp']);
const PROMPT = productPhotoPrompt(1);

// Simple in-memory per-user limit (per function instance) on top of the platform's own limits.
const recent = new Map<string, number[]>();

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const user = await requireUser(req);
  if (user instanceof Response) return user;

  const now = Date.now();
  const hits = (recent.get(user.userId) ?? []).filter((t) => now - t < 3600_000);
  if (hits.length >= 60) return fail('rate_limited', 429, 'That’s a lot of photos at once. Try again in a little while.');
  recent.set(user.userId, [...hits, now]);

  const body = await readJson<{ image?: string; mimeType?: string }>(req, 8_000_000);
  if (!body?.image || typeof body.image !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(body.image.slice(0, 200))) return fail('bad_request');
  const mimeType = body.mimeType && MIME.has(body.mimeType) ? body.mimeType : 'image/jpeg';

  // Global daily AI spend cap applies to scans too.
  const sb = serviceClient();
  const { data: aiCfg } = await sb.from('app_config').select('value').eq('key', 'ai').single();
  if (aiCfg?.value?.scans_enabled === false) return fail('busy', 503, 'Scanning is paused right now. You can add products by hand.');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: body.image } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) return fail('scan_failed', 502, 'We couldn’t read that photo. You can add it by hand.');
  const data = await res.json();
  let items: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
    items = parsed.items ?? parsed.photos?.[0]?.items ?? [];
  } catch {
    items = [];
  }

  const clean = items.slice(0, 20).map((i) => {
    const name = String(i.name ?? '').slice(0, 80) || 'Unnamed product';
    const kind = PRODUCT_KINDS.includes(i.kind as never) ? i.kind : undefined;
    const role = PRODUCT_ROLES.includes(i.role as never) ? i.role : productRole({ name });
    const shadeHex = typeof i.shadeHex === 'string' && /^#[0-9a-fA-F]{6}$/.test(i.shadeHex) ? i.shadeHex : undefined;
    const confidence = Math.max(0, Math.min(1, Number(i.confidence) || 0.5));
    const count = Math.max(1, Math.min(20, Math.round(Number(i.count) || 1)));
    return { name, brand: i.brand ? String(i.brand).slice(0, 60) : undefined, shade: i.shade ? String(i.shade).slice(0, 60) : undefined, kind, role, shadeHex, count, confidence };
  });
  return json({ items: clean });
});
