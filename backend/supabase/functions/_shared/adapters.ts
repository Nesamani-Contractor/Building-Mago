// Source adapters (BUILD brief: each platform swappable / switchable). Every adapter receives an
// already-normalised link — never the raw URL the user typed — so no arbitrary fetches (SSRF).
import type { NormalizedLink } from './core/url.ts';
import { watchVideo, type VideoNotes } from './ai.ts';

export interface AdapterResult {
  kind: 'notes' | 'needs_upload';
  notes?: VideoNotes;
  title?: string;
  creator?: string;
}

export interface SourceAdapter {
  id: 'youtube' | 'tiktok' | 'instagram';
  fetchNotes(link: NormalizedLink): Promise<AdapterResult>;
}

/** YouTube: Gemini accepts public YouTube URLs directly (Google's own, ToS-compliant route — D-04). */
export const youtubeAdapter: SourceAdapter = {
  id: 'youtube',
  async fetchNotes(link) {
    const notes = await watchVideo(`https://www.youtube.com/watch?v=${link.videoId}`);
    return { kind: 'notes', notes, title: notes.title, creator: notes.creator };
  },
};

/** oEmbed is the platforms' public metadata endpoint. Hosts are fixed here, not taken from user input. */
async function oembed(url: string): Promise<{ title?: string; author_name?: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** TikTok / Instagram (D-05): public metadata only. Short captions → guided "save & upload". */
function metadataAdapter(id: 'tiktok' | 'instagram'): SourceAdapter {
  return {
    id,
    async fetchNotes(link) {
      const meta =
        id === 'tiktok'
          ? await oembed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(link.canonicalUrl)}`)
          : null; // Instagram oEmbed needs a Meta app token; enable once approved (OQ-1).
      const words = (meta?.title ?? '').split(/\s+/).filter(Boolean).length;
      if (words < 40) return { kind: 'needs_upload', title: meta?.title, creator: meta?.author_name };
      return {
        kind: 'notes',
        title: meta?.title,
        creator: meta?.author_name,
        notes: { language: 'en', notes: meta?.title ?? '', title: meta?.title, creator: meta?.author_name },
      };
    },
  };
}

export const ADAPTERS: Record<SourceAdapter['id'], SourceAdapter> = {
  youtube: youtubeAdapter,
  tiktok: metadataAdapter('tiktok'),
  instagram: metadataAdapter('instagram'),
};
