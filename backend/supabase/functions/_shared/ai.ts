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

const WATCH_PROMPT = `You are watching a makeup or beauty tutorial.
Return JSON only: {"language": "<ISO 639-1 of the spoken language>", "title": "...", "creator": "...", "durationSec": <int>, "notes": "..."}.
In "notes", write one line per action in order, each starting with a [MM:SS] timestamp, describing what is applied, where, with which tool, and any product names shown or said. Include waiting times and the colour of each product when visible (e.g. "warm brown eyeshadow"). Do not invent products.`;

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
                  timestampSec: { type: 'integer' },
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

const SYSTEM = `You turn makeup tutorial notes into a calm, clear, follow-along routine.
Rules: 3–40 steps, each step ≤ ${MAX_STEP_WORDS} words, imperative, second person ("Blend…").
Group steps into sections like Base, Eyes, Brows, Cheeks, Lips, Finish. Put optional extra advice in "hint".
Use the [MM:SS] timestamps for timestampSec. Use waitSec only when the video says to wait.
Products: only those clearly shown or said; confidence 0–1 (below 0.6 means unsure). Never invent brands.
For each product set "kind" (what it looks like: lipstick, gloss, pencil, mascara, palette, brush, sponge, bottle, tube, pot, spray, tool) and, when the video shows or names a colour, "shadeHex" as an approximate #RRGGBB.`;

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
        max_tokens: 4000,
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
          timestampSec: typeof st.timestampSec === 'number' ? st.timestampSec : undefined,
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
