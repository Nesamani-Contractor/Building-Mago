// RevenueCat webhook → entitlements table (server source of truth for Pro).
// Handles: trial start, purchase, renewal, cancellation (access continues to period end), expiry,
// billing issue (grace period), refund, transfer (device/account switch).
import { env, fail, json, serviceClient } from '../_shared/http.ts';

interface RCEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  expiration_at_ms?: number | null;
  transferred_to?: string[];
  transferred_from?: string[];
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${env('REVENUECAT_WEBHOOK_SECRET')}`) return fail('forbidden', 403);
  const body = (await req.json().catch(() => null)) as { event?: RCEvent } | null;
  const e = body?.event;
  if (!e?.type || !e.app_user_id) return fail('bad_request');
  const sb = serviceClient();
  const expires = e.expiration_at_ms ? new Date(e.expiration_at_ms).toISOString() : null;
  const upsert = (userId: string, patch: Record<string, unknown>) =>
    sb.from('entitlements').upsert({ user_id: userId, updated_at: new Date().toISOString(), ...patch });

  switch (e.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
      await upsert(e.app_user_id, { is_pro: true, product_id: e.product_id, expires_at: expires, in_grace: false });
      break;
    case 'CANCELLATION': // keeps access until expiry
      await upsert(e.app_user_id, { expires_at: expires });
      break;
    case 'BILLING_ISSUE':
      await upsert(e.app_user_id, { in_grace: true });
      break;
    case 'EXPIRATION':
      await upsert(e.app_user_id, { is_pro: false, in_grace: false, expires_at: expires });
      break;
    case 'TRANSFER':
      for (const from of e.transferred_from ?? []) await upsert(from, { is_pro: false });
      for (const to of e.transferred_to ?? []) await upsert(to, { is_pro: true, expires_at: expires });
      break;
    default:
      // TEST, SUBSCRIBER_ALIAS, etc. — acknowledged, no change.
      break;
  }
  return json({ ok: true });
});
