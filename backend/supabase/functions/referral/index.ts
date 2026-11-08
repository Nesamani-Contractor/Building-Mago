// POST /referral { action: 'claim', code } — called by the new user after install.
// POST /referral { action: 'activate' } — called when that user completes her first look.
// Reward: 1 month Pro for BOTH via RevenueCat promotional entitlement; referrer capped at 12/year.
import { env, fail, json, preflight, readJson, requireUser, serviceClient } from '../_shared/http.ts';

async function grantMonth(userId: string) {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}/entitlements/pro/promotional`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('REVENUECAT_SECRET_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration: 'monthly' }),
  });
  if (!res.ok) throw new Error(`rc_${res.status}`);
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  const user = await requireUser(req);
  if (user instanceof Response) return user;
  const body = await readJson<{ action?: 'claim' | 'activate'; code?: string }>(req);
  const sb = serviceClient();

  if (body?.action === 'claim') {
    if (!body.code || !/^[A-Z0-9]{6}$/.test(body.code)) return fail('bad_code', 422, 'That invite code doesn’t look right.');
    const { data: owner } = await sb.from('referral_codes').select('user_id').eq('code', body.code).maybeSingle();
    if (!owner || owner.user_id === user.userId) return fail('bad_code', 422, 'That invite code doesn’t look right.');
    const { error } = await sb.from('referrals').insert({ referrer_id: owner.user_id, referee_id: user.userId });
    if (error) return fail('already_claimed', 409, 'You’ve already used an invite.');
    return json({ ok: true });
  }

  if (body?.action === 'activate') {
    const { data: ref } = await sb.from('referrals').select('*').eq('referee_id', user.userId).eq('status', 'installed').maybeSingle();
    if (!ref) return json({ ok: true, rewarded: false });
    const yearAgo = new Date(Date.now() - 365 * 86400_000).toISOString();
    const { count } = await sb.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_id', ref.referrer_id).eq('status', 'rewarded').gte('rewarded_at', yearAgo);
    await sb.from('referrals').update({ status: 'activated' }).eq('id', ref.id);
    await grantMonth(user.userId);
    if ((count ?? 0) < 12) await grantMonth(ref.referrer_id);
    await sb.from('referrals').update({ status: 'rewarded', rewarded_at: new Date().toISOString() }).eq('id', ref.id);
    return json({ ok: true, rewarded: true });
  }
  return fail('bad_request');
});
