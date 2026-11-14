// AI services. Keys live only in Supabase secrets (GEMINI_API_KEY, ANTHROPIC_API_KEY) — never in the app.
// D-04: Gemini "watches" the video (public YouTube URL or uploaded file) and returns a timestamped
// transcript + visual notes; Claude turns that into the Mago routine schema; we validate the result.
import { env } from './http.ts';
import { CATEGORIES, OCCASIONS, MAX_STEP_WORDS, PRODUCT_KINDS, validateRoutine, type Routine } from './core/routine.ts';
import { OWNER_PROMPT, WATCH_RULES } from './core/watch.ts';
export { OWNER_PROMPT };

const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash';
const CLAUDE_MODEL = Deno.env.get('CLAUDE_MODEL') ?? 'claude-sonnet-5-5';

export interface VideoNotes {
  language: string; // ISO 639-1
  title?: string;
  creator?: string;
  durationSec?: number;
  /** Timestamped lines: "[01:23] applies concealer under eyes with a damp sponge (brand X)". */
  notes: string;
}

// Gemini hears AND sees the whole video, so it covers all three kinds of video (talking, captions
// only, silent) — the rules live in core/watch.ts, shared with the app's preview watcher.
const WATCH_PROMPT = `${OWNER_PROMPT}

${WATCH_RULES}
Return JSON only: {"language": "<ISO 639-1 of the spoken or on-screen language, 'xx' if there is neither>", "videoStyle": "narrated" | "captions_only" | "silent_visual", "title": "...", "creator": "...", "durationSec": <int>, "notes": "..."}.
In "notes", write one line per action in order, each starting with [MM:SS-MM:SS] (start and end), describing what is applied, where, with which tool, how much (quantity), any waiting time, and every product with brand, product name and shade exactly as said, written or shown, plus its colour. If the video shows no beauty routine, return notes "NOT_BEAUTY".`;

/** Gemini video understanding. `fileUri` is either a public YouTube URL or a Gemini File API URI. */
export async function watchVideo(fileUri: string, mimeType?: string): Promise<VideoNotes> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env('GEMINI_API_KEY') },
    body: JSON.stringify({
      contents: [{ parts: [{ file_data: { file_uri: fileUri, ...(mimeType ? { mime_type: mimeType } : {}) } }, { text: WATCH_PROMPT }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`gemini_${res.status}`);
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = JSON.parse(text) as VideoNotes;
  if (!parsed.notes || typeof parsed.notes !== 'string') throw new Error('gemini_empty');
  return parsed;
}

/**
 * Gemini File API: upload her video (from our private bucket) so Gemini can watch it, wait until
 * it is processed, and return its URI. Always pair with deleteGeminiFile() once the notes are back.
 */
export async function uploadToGemini(video: Blob, mimeType: string, displayName: string): Promise<{ uri: string; name: string }> {
  const key = env('GEMINI_API_KEY');
  const start = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(video.size),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName.slice(0, 60) } }),
    signal: AbortSignal.timeout(30_000),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!start.ok || !uploadUrl) throw new Error(`gemini_upload_start_${start.status}`);
  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize', 'Content-Length': String(video.size) },
    body: video,
    signal: AbortSignal.timeout(300_000),
  });
  if (!up.ok) throw new Error(`gemini_upload_${up.status}`);
  let file = (await up.json())?.file as { uri: string; name: string; state?: string };
  // Videos are processed before they can be used: poll until ACTIVE (max ~2 min).
  for (let i = 0; i < 40 && file?.state === 'PROCESSING'; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, { headers: { 'x-goog-api-key': key } });
    if (res.ok) file = await res.json();
  }
  if (!file?.uri || file.state !== 'ACTIVE') throw new Error('gemini_file_not_ready');
  return { uri: file.uri, name: file.name };
}

export async function deleteGeminiFile(name: string): Promise<void> {
  try {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${name}`, { method: 'DELETE', headers: { 'x-goog-api-key': env('GEMINI_API_KEY') } });
  } catch {
    // Gemini also deletes files automatically after 48 h.
  }
}

const ROUTINE_TOOL = {
  name: 'save_routine',
  description: 'Save the structured makeup routine.',
  input_schema: {
    type: 'object',
    required: ['title', 'category', 'occasion', 'difficulty', 'totalTimeMin', 'sections', 'products'],
    properties: {
      title: { type: 'string' },
      category: { type: 'string', enum: [...CATEGORIES] },
      occasion: { type: 'array', items: { type: 'string', enum: [...OCCASIONS] } },
      difficulty: { type: 'string', enum: ['easy', 'medium', 'advanced'] },
      totalTimeMin: { type: 'integer' },
      tags: { type: 'array', items: { type: 'string' } },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'steps'],
          properties: {
            name: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                required: ['text', 'productRefs'],
                properties: {
                  text: { type: 'string' },
                  hint: { type: 'string' },
                  textExpert: { type: 'string', description: 'One-liner for experts with product and quantity.' },
                  textNovice: { type: 'string', description: 'Detailed how-to for beginners with product name and quantity.' },
                  amount: { type: 'string', description: 'Estimated quantity, e.g. "pea-size", "2 pumps".' },
                  timestampSec: { type: 'integer' },
                  endTimestampSec: { type: 'integer' },
                  waitSec: { type: 'integer' },
                  productRefs: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      products: {
        type: 'array',
        items: {
          type: 'object',
          required: ['ref', 'name', 'confidence'],
          properties: {
            ref: { type: 'string' },
            name: { type: 'string' },
            brand: { type: 'string' },
            shade: { type: 'string' },
            category: { type: 'string' },
            confidence: { type: 'number' },
            kind: { type: 'string', enum: [...PRODUCT_KINDS] },
            shadeHex: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          },
        },
      },
    },
  },
};

const SYSTEM = `You are an expert makeup artist turning tutorial notes into a calm follow-along routine for the Mago app, following this brief:
${OWNER_PROMPT}
Mago rules: fewer than 10 steps in total (combine small actions). "text" is the Intermediate version (≤ ${MAX_STEP_WORDS} words, imperative, second person); "textExpert" the brief one-liner; "textNovice" the detailed version. Every version names the product and quantity; also put the quantity in "amount".
Group steps into sections like Prep, Base, Eyes, Brows, Cheeks, Lips, Finish. Put tips in "hint".
Use the [MM:SS-MM:SS] timestamps for timestampSec and endTimestampSec. When a step needs a wait before the next one, set waitSec.
Title: appropriate and specific. Tags: short category tags like "Date Night", "5 Min Lip Gloss", "10 Min Workday".
Products: the complete list of products in the video with brand, product name and shade as said, written or shown; confidence 0–1 (below 0.6 means unsure). Never invent brands or shades. Set "kind" (lipstick, gloss, pencil, mascara, palette, brush, sponge, bottle, tube, pot, spray, tool) and, when a colour is visible or named, "shadeHex" as an approximate #RRGGBB. Do not include image URLs — Mago supplies product pictures from its licensed catalog.`;

/** Claude: notes → validated Routine. One retry with the validation errors if the first answer fails. */
export async function structureRoutine(notes: VideoNotes, base: Pick<Routine, 'id' | 'source' | 'creator' | 'durationSec'>): Promise<{ routine: Routine; inputTokens: number; outputTokens: number }> {
  let feedback = '';
  let inTok = 0;
  let outTok = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        system: SYSTEM,
        tools: [ROUTINE_TOOL],
        tool_choice: { type: 'tool', name: 'save_routine' },
        messages: [{ role: 'user', content: `Tutorial notes:\n${notes.notes.slice(0, 40_000)}${feedback}` }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`claude_${res.status}`);
    const data = await res.json();
    inTok += data?.usage?.input_tokens ?? 0;
    outTok += data?.usage?.output_tokens ?? 0;
    const input = data?.content?.find((b: { type: string }) => b.type === 'tool_use')?.input;
    if (!input) throw new Error('claude_no_tool');
    let n = 0;
    const routine: Routine = {
      ...base,
      title: String(input.title ?? notes.title ?? 'Untitled look').slice(0, 120),
      category: input.category,
      occasion: input.occasion ?? ['Everyday'],
      difficulty: input.difficulty,
      totalTimeMin: Number(input.totalTimeMin) || 10,
      tags: (input.tags ?? []).slice(0, 8),
      sections: (input.sections ?? []).map((s: { name: string; steps: Record<string, unknown>[] }) => ({
        name: String(s.name),
        steps: s.steps.map((st) => ({
          id: `${base.id}-s${++n}`,
          text: String(st.text),
          hint: st.hint ? String(st.hint) : undefined,
          amount: st.amount ? String(st.amount).slice(0, 60) : undefined,
          levels: st.textExpert || st.textNovice ? { expert: st.textExpert ? String(st.textExpert) : undefined, novice: st.textNovice ? String(st.textNovice) : undefined } : undefined,
          timestampSec: typeof st.timestampSec === 'number' ? st.timestampSec : undefined,
          endTimestampSec: typeof st.endTimestampSec === 'number' ? st.endTimestampSec : undefined,
          waitSec: typeof st.waitSec === 'number' ? st.waitSec : undefined,
          productRefs: Array.isArray(st.productRefs) ? st.productRefs.map(String) : [],
        })),
      })),
      products: input.products ?? [],
    };
    const issues = validateRoutine(routine);
    if (issues.length === 0) return { routine, inputTokens: inTok, outputTokens: outTok };
    feedback = `\n\nYour previous answer failed validation:\n${issues.map((i) => `- ${i.path}: ${i.message}`).join('\n')}\nFix these.`;
  }
  throw new Error('validation_failed');
}

/** Rough cost estimate for the spend cap and the golden-set report (update with real prices). */
export function estimateCostUsd(videoSec: number, inTok: number, outTok: number): number {
  const gemini = (videoSec / 60) * 0.004; // placeholder per-minute rate — measured in Phase 3
  const claude = (inTok / 1e6) * 3 + (outTok / 1e6) * 15; // placeholder per-token rates
  return Math.round((gemini + claude) * 10_000) / 10_000;
}
