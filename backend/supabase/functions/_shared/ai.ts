// AI services. Keys live only in Supabase secrets (GEMINI_API_KEY, ANTHROPIC_API_KEY) — never in the app.
// D-04: Gemini "watches" the video (public YouTube URL or uploaded file) and returns a timestamped
// transcript + visual notes; Claude turns that into the Mago routine schema; we validate the result.
import { env } from './http.ts';
import { CATEGORIES, OCCASIONS, MAX_STEP_WORDS, PRODUCT_KINDS, validateRoutine, type Routine } from './core/routine.ts';

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

/**
 * PRD FR-SHR-04 — the owner's extraction prompt, verbatim, followed by Mago's output contract.
 * Gemini watches the whole video and reads EVERY signal: speech, on-screen captions/text, product
 * packaging shown to camera, and the visible actions — because many beauty videos are silent,
 * music-only, or just show products with no talking.
 */
export const OWNER_PROMPT = `You are an expert makeup artist. Review the attached video/YouTube video in the link and prepare a step by step make up tutorial. Your output should include the following details from the video: 1. An appropriate title for the makeup routine 2. Category tags for the makeup routine. It will be things like "Date Night", "5 Mins lip gloss", "10 min workday" etc. 3. An estimated time to complete the makeup. 4. Complete list of products used in the makeup with brand name, shade, product name etc. Prepare this as a list and get images from Internet to show the products. 5. A step by step make up instruction with required product and estimated quantity. Generate visuals to show the step being performed. Generate instructions for 3 type of users:  a. expert in makeup - need a brief one liner about the steps with the product and estimated quantity. b. Intermediate in makeup - Need a bit more detail on how to complete the step along with required product and estimated quantity. c. Novice/New to makeup: A detailed instruction on how to complete this step along with product name and estimated quantity. 6. When any step requires some wait before the next step, capture it in the step by step breakdown and indicate how much time the user needs to wait before going to the next step. 7. Include the start and end timestamps for each of these steps from the original video.  8. Keep the maximum number of steps to under 10.`;

const WATCH_PROMPT = `${OWNER_PROMPT}

How to watch (Mago rules):
- Watch the WHOLE video. It may have speech, on-screen captions or text, only background music, random noise, or no sound at all. Use every signal: what is said, what is written on screen, what packaging is held up to the camera, and what you see being applied.
- Products: read brand, product name and shade from speech, captions, and packaging labels shown to the camera. If a product is only seen, describe it (e.g. "warm brown matte eyeshadow") and mark it unbranded. Never invent a brand or shade.
- Do not produce the product images or step visuals yourself; Mago supplies those.
Return JSON only: {"language": "<ISO 639-1 of the spoken or on-screen language, 'xx' if none>", "title": "...", "creator": "...", "durationSec": <int>, "notes": "..."}.
In "notes", write one line per action in order, each starting with [MM:SS-MM:SS] (start and end), describing what is applied, where, with which tool, how much (quantity), any waiting time, and every product with brand, product name and shade exactly as said, written or shown, plus its colour.`;

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
