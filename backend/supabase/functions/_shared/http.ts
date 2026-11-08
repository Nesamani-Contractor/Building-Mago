// Shared HTTP helpers for Edge Functions: CORS, JSON responses, auth, service client.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Human-safe error: never leaks stack traces or provider messages to the client. */
export function fail(code: string, status = 400, message?: string): Response {
  return json({ error: code, message: message ?? 'Something went wrong. Please try again.' }, status);
}

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
}

/** Service-role client: bypasses RLS. Only ever used inside functions after checking the caller. */
export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

/** Verify the caller's JWT and return their user id (anonymous users count). */
export async function requireUser(req: Request): Promise<{ userId: string; isAnonymous: boolean } | Response> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return fail('unauthorized', 401, 'Please restart the app and try again.');
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return fail('unauthorized', 401, 'Please restart the app and try again.');
  return { userId: data.user.id, isAnonymous: data.user.is_anonymous ?? false };
}

/** Read a JSON body with a size cap. */
export async function readJson<T>(req: Request, maxBytes = 16_384): Promise<T | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: cors }) : null;
}
