/**
 * How Mago "watches" a beauty video — shared by the app (web preview, frame-based) and the server
 * (Gemini, full video + audio). PRD FR-SHR-04 / FR-IMP-11 and D-22.
 *
 * Product requirement (owner, 13 Nov): the steps must describe what the video ACTUALLY shows,
 * whatever kind of video it is:
 *   1. the creator talks (with or without captions),
 *   2. the creator is silent but on-screen captions/text explain the steps,
 *   3. the video is silent (music or nothing) with no captions — only the products and actions.
 * So every signal is read: speech, on-screen text, product packaging held to the camera, and
 * what is visibly being applied. Nothing is invented and nothing comes from a sample/template.
 */
import {
  CATEGORIES,
  OCCASIONS,
  DIFFICULTIES,
  PRODUCT_KINDS,
  MAX_STEP_WORDS,
  validateRoutine,
  type Category,
  type Difficulty,
  type Occasion,
  type ProductKind,
  type ProductRef,
  type Routine,
  type Section,
  type ValidationIssue,
} from './routine';

/** The owner's extraction prompt, verbatim (D-22). */
export const OWNER_PROMPT = `You are an expert makeup artist. Review the attached video/YouTube video in the link and prepare a step by step make up tutorial. Your output should include the following details from the video: 1. An appropriate title for the makeup routine 2. Category tags for the makeup routine. It will be things like "Date Night", "5 Mins lip gloss", "10 min workday" etc. 3. An estimated time to complete the makeup. 4. Complete list of products used in the makeup with brand name, shade, product name etc. Prepare this as a list and get images from Internet to show the products. 5. A step by step make up instruction with required product and estimated quantity. Generate visuals to show the step being performed. Generate instructions for 3 type of users:  a. expert in makeup - need a brief one liner about the steps with the product and estimated quantity. b. Intermediate in makeup - Need a bit more detail on how to complete the step along with required product and estimated quantity. c. Novice/New to makeup: A detailed instruction on how to complete this step along with product name and estimated quantity. 6. When any step requires some wait before the next step, capture it in the step by step breakdown and indicate how much time the user needs to wait before going to the next step. 7. Include the start and end timestamps for each of these steps from the original video.  8. Keep the maximum number of steps to under 10.`;

/** The three kinds of video Mago must handle (owner requirement). Reported back by the AI. */
export const VIDEO_STYLES = ['narrated', 'captions_only', 'silent_visual'] as const;
export type VideoStyle = (typeof VIDEO_STYLES)[number];

/** How to read every signal — used in both the Gemini prompt and the frame prompt. */
export const WATCH_RULES = `How to watch:
- The video may have the creator talking, on-screen captions or text, only background music, random noise, or no sound at all. Use EVERY signal you have: what is said, what is written on screen (captions, titles, product callouts — read them word for word), what packaging is held up to the camera (read brand, product name and shade from the label), and what you can SEE being applied, where on the face, with which tool or fingers, and how much.
- If nobody explains anything, describe the routine purely from what is visibly happening, in order. A silent video still has steps.
- Products: brand, product name and shade exactly as said, written or printed on the packaging. If a product is only seen, describe it plainly (e.g. "warm brown matte eyeshadow", "clear lip gloss") with no brand. Never invent a brand, product name or shade.
- Describe only what is in THIS video. Do not add steps from a typical routine that the video does not show.
- Do not produce product images or step visuals; Mago supplies those.`;

/**
 * Prompt for the web preview, where Claude sees contact sheets of frames (each tile stamped
 * with its [MM:SS] time) plus any speech transcript the device could capture.
 */
export function framesWatchPrompt(input: {
  durationSec: number;
  sheetCount: number;
  framesPerSheet: number;
  fileName?: string;
  transcript?: string;
}): string {
  const dur = formatClock(input.durationSec);
  return `${OWNER_PROMPT}

You cannot play the video, so you are given ${input.sheetCount} contact sheet image(s) made from it, in time order. Each sheet holds up to ${input.framesPerSheet} frames (left to right, top to bottom), and each frame is stamped with its time in the video as [MM:SS]. The video is ${dur} long.${input.fileName ? ` The file was called "${input.fileName.slice(0, 80)}".` : ''}
${input.transcript ? `\nWhat the creator says (speech transcript):\n"""${input.transcript.slice(0, 8000)}"""\n` : '\nNo speech transcript is available — rely on the on-screen text, the packaging and the visible actions.\n'}
${WATCH_RULES}
- Work out each step from the frames: compare consecutive frames to see what changed on the face and which product or tool is in hand. Use the frame times for timestampSec (start) and endTimestampSec (end).

If the frames do not show a makeup, skincare or beauty routine at all, reply with only {"error":"not_beauty","reason":"<what the video shows, ≤ 15 words>"}.

Otherwise reply with ONLY this JSON (no prose):
{
  "videoStyle": "narrated" | "captions_only" | "silent_visual",
  "title": "<appropriate, specific title>",
  "category": one of ${JSON.stringify(CATEGORIES)},
  "occasion": array from ${JSON.stringify(OCCASIONS)},
  "difficulty": one of ${JSON.stringify(DIFFICULTIES)},
  "totalTimeMin": <estimated minutes to do the look>,
  "tags": ["short category tags like \\"Date Night\\", \\"5 Min Lip Gloss\\""],
  "products": [{"ref": "p1", "name": "<product name or plain description>", "brand": "<only if said/shown>", "shade": "<only if said/shown>", "kind": one of ${JSON.stringify(PRODUCT_KINDS)}, "shadeHex": "#RRGGBB approximate colour if visible", "confidence": 0..1}],
  "sections": [{"name": "Prep|Base|Eyes|Brows|Cheeks|Lips|Finish|…", "steps": [{
    "text": "<Intermediate version: ≤ ${MAX_STEP_WORDS} words, imperative, second person, names the product>",
    "textExpert": "<one-liner with product and quantity>",
    "textNovice": "<detailed how-to with product name and quantity>",
    "amount": "<estimated quantity, e.g. pea-size, 2 pumps>",
    "timestampSec": <start second>, "endTimestampSec": <end second>,
    "waitSec": <only if a wait is needed before the next step>,
    "productRefs": ["p1"]
  }]}]
}
Rules: 3 to 9 steps in total (combine tiny actions). Every productRefs entry must match a product "ref". confidence below 0.6 means you are unsure (e.g. the label was not readable).`;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** The AI's raw answer (frame prompt JSON or the server's save_routine tool input). */
export interface AiRoutineAnswer {
  error?: string;
  reason?: string;
  videoStyle?: string;
  title?: unknown;
  category?: unknown;
  occasion?: unknown;
  difficulty?: unknown;
  totalTimeMin?: unknown;
  tags?: unknown;
  products?: unknown;
  sections?: unknown;
}

const str = (v: unknown, max = 400): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);

/**
 * Turn the AI's answer into a Mago Routine, tolerating small format slips (string numbers,
 * unknown enum values, missing refs) so a good watch isn't thrown away over formatting.
 * Returns the routine plus any remaining validation issues.
 */
export function routineFromAi(
  a: AiRoutineAnswer,
  base: Pick<Routine, 'id' | 'source' | 'creator' | 'durationSec'>,
): { routine: Routine; issues: ValidationIssue[] } {
  const rawProducts = Array.isArray(a.products) ? (a.products as Record<string, unknown>[]) : [];
  const products: ProductRef[] = rawProducts.slice(0, 30).map((p, i) => {
    const kind = str(p.kind) as ProductKind | undefined;
    const hex = str(p.shadeHex);
    const conf = num(p.confidence);
    return {
      ref: str(p.ref, 40) ?? `p${i + 1}`,
      name: str(p.name, 120) ?? 'Product',
      brand: str(p.brand, 80),
      shade: str(p.shade, 80),
      category: str(p.category, 40),
      confidence: conf === undefined ? 0.5 : Math.min(1, Math.max(0, conf)),
      kind: kind && (PRODUCT_KINDS as readonly string[]).includes(kind) ? kind : undefined,
      shadeHex: hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : undefined,
    };
  });
  const refs = new Set(products.map((p) => p.ref));
  let n = 0;
  const rawSections = Array.isArray(a.sections) ? (a.sections as Record<string, unknown>[]) : [];
  const sections: Section[] = rawSections
    .map((s) => ({
      name: str(s.name, 40) ?? 'Steps',
      steps: (Array.isArray(s.steps) ? (s.steps as Record<string, unknown>[]) : [])
        .filter((st) => str(st.text))
        .map((st) => {
          const ts = num(st.timestampSec);
          const te = num(st.endTimestampSec);
          const wait = num(st.waitSec);
          const expert = str(st.textExpert);
          const novice = str(st.textNovice, 800);
          return {
            id: `${base.id}-s${++n}`,
            text: str(st.text)!,
            hint: str(st.hint),
            amount: str(st.amount, 60),
            levels: expert || novice ? { expert, novice } : undefined,
            timestampSec: ts !== undefined && ts >= 0 ? Math.round(ts) : undefined,
            endTimestampSec: te !== undefined && te >= 0 ? Math.round(te) : undefined,
            waitSec: wait !== undefined && wait > 0 ? Math.round(wait) : undefined,
            productRefs: (Array.isArray(st.productRefs) ? st.productRefs : []).map(String).filter((r) => refs.has(r)),
          };
        }),
    }))
    .filter((s) => s.steps.length > 0);

  const category = str(a.category) as Category | undefined;
  const difficulty = str(a.difficulty) as Difficulty | undefined;
  const occasion = (Array.isArray(a.occasion) ? a.occasion : []).map(String).filter((o): o is Occasion => (OCCASIONS as readonly string[]).includes(o));
  const routine: Routine = {
    ...base,
    title: str(a.title, 120) ?? 'Your look',
    category: category && (CATEGORIES as readonly string[]).includes(category) ? category : 'Full look',
    occasion: occasion.length ? occasion : ['Everyday'],
    difficulty: difficulty && (DIFFICULTIES as readonly string[]).includes(difficulty) ? difficulty : 'medium',
    totalTimeMin: Math.max(1, Math.round(num(a.totalTimeMin) ?? 10)),
    tags: (Array.isArray(a.tags) ? a.tags : []).map(String).map((t) => t.slice(0, 30)).slice(0, 8),
    sections,
    products,
  };
  return { routine, issues: validateRoutine(routine) };
}
