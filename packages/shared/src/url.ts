/**
 * Link allow-list and normalisation.
 * Every pasted or shared link becomes a canonical key like "youtube:dQw4w9WgXcQ".
 * The server only ever calls official APIs with the parsed ID — it never fetches the raw
 * URL a user typed (protection against server-side request forgery).
 */

export type SourcePlatform = 'youtube' | 'tiktok' | 'instagram';

export interface NormalizedLink {
  platform: SourcePlatform;
  videoId: string;
  /** e.g. "youtube:dQw4w9WgXcQ" — the shared-cache key. */
  canonicalKey: string;
  /** A clean URL we rebuild ourselves (never the user's raw string). */
  canonicalUrl: string;
}

export type LinkError =
  | 'empty'
  | 'not_a_url'
  | 'not_https'
  | 'host_not_allowed'
  | 'credentials_in_url'
  | 'unsupported_path'
  | 'short_link_needs_resolution';

export type NormalizeResult = { ok: true; link: NormalizedLink } | { ok: false; error: LinkError };

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);
const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']);
const TIKTOK_SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);

export const ALLOWED_HOSTS: readonly string[] = [
  ...YOUTUBE_HOSTS,
  ...TIKTOK_HOSTS,
  ...TIKTOK_SHORT_HOSTS,
  ...INSTAGRAM_HOSTS,
];

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const TIKTOK_ID = /^\d{8,25}$/;
const IG_ID = /^[A-Za-z0-9_-]{5,40}$/;

/** Pull the first URL out of shared text like "Watch this! https://youtu.be/abc…" */
export function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[),.;!?]+$/, '') : null;
}

export function normalizeLink(input: string): NormalizeResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: 'empty' };
  const candidate = extractFirstUrl(raw) ?? raw;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
  } catch {
    return { ok: false, error: 'not_a_url' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'not_https' };
  if (url.username || url.password) return { ok: false, error: 'credentials_in_url' };
  if (url.port && url.port !== '443' && url.port !== '80') return { ok: false, error: 'host_not_allowed' };
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (YOUTUBE_HOSTS.has(host)) {
    let id: string | null = null;
    if (host === 'youtu.be') id = parts[0] ?? null;
    else if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live' || parts[0] === 'v') id = parts[1] ?? null;
    if (!id || !YT_ID.test(id)) return { ok: false, error: 'unsupported_path' };
    return ok('youtube', id, `https://www.youtube.com/watch?v=${id}`);
  }
  if (TIKTOK_SHORT_HOSTS.has(host)) return { ok: false, error: 'short_link_needs_resolution' };
  if (TIKTOK_HOSTS.has(host)) {
    const vi = parts.indexOf('video');
    const id = vi >= 0 ? parts[vi + 1] : undefined;
    if (!id || !TIKTOK_ID.test(id) || !parts[0]?.startsWith('@')) return { ok: false, error: 'unsupported_path' };
    return ok('tiktok', id, `https://www.tiktok.com/${parts[0]}/video/${id}`);
  }
  if (INSTAGRAM_HOSTS.has(host)) {
    const kind = parts[0];
    const id = parts[1];
    if (!(kind === 'reel' || kind === 'p' || kind === 'reels') || !id || !IG_ID.test(id))
      return { ok: false, error: 'unsupported_path' };
    return ok('instagram', id, `https://www.instagram.com/reel/${id}/`);
  }
  return { ok: false, error: 'host_not_allowed' };
}

function ok(platform: SourcePlatform, videoId: string, canonicalUrl: string): NormalizeResult {
  return { ok: true, link: { platform, videoId, canonicalKey: `${platform}:${videoId}`, canonicalUrl } };
}

/** Human, specific messages for each error (UI copy). */
export function linkErrorMessage(e: LinkError): string {
  switch (e) {
    case 'empty':
      return 'Paste a YouTube, TikTok or Instagram link.';
    case 'not_a_url':
      return 'That doesn’t look like a link. Copy it again from the app and paste here.';
    case 'not_https':
    case 'credentials_in_url':
    case 'host_not_allowed':
      return 'Mago works with YouTube, TikTok and Instagram links.';
    case 'unsupported_path':
      return 'We couldn’t find a video in that link. Open the video itself, tap Share, then Copy link.';
    case 'short_link_needs_resolution':
      return 'Short TikTok links need opening first. Open it in TikTok, then tap Share → Copy link.';
  }
}
