/**
 * My makeup bag: what she owns, and how a tutorial's products map onto it.
 * For every product in a look: "have" (she owns it), "swap" (use something she owns instead, with
 * how-to advice) or "missing". Pure logic — used by the app and the server.
 */
import { productKind, type ProductKind, type ProductRef, type Section } from './routine';

/** What a product is FOR (more useful than how it looks when matching). */
export const PRODUCT_ROLES = [
  'primer',
  'foundation',
  'concealer',
  'corrector',
  'powder',
  'bronzer',
  'blush',
  'highlighter',
  'eyeshadow',
  'eyeliner',
  'mascara',
  'lashes',
  'brow',
  'lipstick',
  'lip liner',
  'gloss',
  'lip balm',
  'setting spray',
  'skincare',
  'sunscreen',
  'fragrance',
  'brush',
  'sponge',
  'tool',
  'other',
] as const;
export type ProductRole = (typeof PRODUCT_ROLES)[number];

export interface BagItem {
  id: string;
  name: string;
  brand?: string;
  kind?: ProductKind;
  role?: ProductRole;
  shadeHex?: string;
  /** Shade name as printed or said, e.g. "Warm Honey 220". */
  shade?: string;
  /** Plain product type as read from the label, e.g. "Liquid eyeliner", "Setting spray" (D-26). */
  type?: string;
  /** How sure Mago was when it read this from a photo (0–1). */
  confidence?: number;
  /** Added automatically from a photo and not yet checked by her (D-26). */
  needsReview?: boolean;
  /** How many of this exact product she owns (D-25). Missing on older items → 1. */
  count?: number;
  /** On-device photo of her product (never uploaded except briefly for reading, D-18). For a
   *  cluttered photo this is the product's own cut-out from her photo (D-28). */
  photoUri?: string;
  /** D-28: key ingredients of this product's usual formula, best known first (from the label when
   *  readable, otherwise general product knowledge). Always shown with "check your label". */
  ingredients?: string[];
  /** D-28: short notes worth knowing, e.g. "Contains fragrance", "SPF 15", "Fragrance-free". */
  ingredientNotes?: string[];
  addedAt: string;
  updatedAt?: string;
}

/** Bag sections (D-26): every role belongs to exactly one. */
export const BAG_CATEGORIES = ['Face', 'Eyes & brows', 'Lips', 'Skincare', 'Fragrance', 'Tools', 'Other'] as const;
export type BagCategory = (typeof BAG_CATEGORIES)[number];

const CATEGORY_OF: Record<ProductRole, BagCategory> = {
  primer: 'Face', foundation: 'Face', concealer: 'Face', corrector: 'Face', powder: 'Face', bronzer: 'Face',
  blush: 'Face', highlighter: 'Face', 'setting spray': 'Face',
  eyeshadow: 'Eyes & brows', eyeliner: 'Eyes & brows', mascara: 'Eyes & brows', lashes: 'Eyes & brows', brow: 'Eyes & brows',
  lipstick: 'Lips', 'lip liner': 'Lips', gloss: 'Lips', 'lip balm': 'Lips',
  skincare: 'Skincare', sunscreen: 'Skincare',
  fragrance: 'Fragrance',
  brush: 'Tools', sponge: 'Tools', tool: 'Tools',
  other: 'Other',
};

export function bagCategory(p: { name: string; role?: ProductRole }): BagCategory {
  return CATEGORY_OF[productRole(p)] ?? 'Other';
}

/** Below this, a photo-read product is flagged "Check this" on the review screen. */
export const SCAN_REVIEW_CONFIDENCE = 0.7;

/** How many she owns (never less than 1 while the item exists). */
export function bagCount(i: Pick<BagItem, 'count'>): number {
  return Math.max(1, Math.round(i.count ?? 1));
}

const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * D-25: is this the SAME product (same brand, name and shade) — not just the same kind?
 * Adding the same lipstick twice must raise its count, not create a second entry.
 */
export function isSameProduct(a: Pick<BagItem, 'name' | 'brand' | 'shade' | 'shadeHex' | 'role'>, b: Pick<BagItem, 'name' | 'brand' | 'shade' | 'shadeHex' | 'role'>): boolean {
  if (!norm(a.name) || !norm(b.name)) return false;
  if (productRole(a) !== productRole(b)) return false;
  const ba = norm(a.brand);
  const bb = norm(b.brand);
  if (ba && bb && ba !== bb) return false;
  // Overlap over the LONGER name: "Lipstick" is not the same product as "Matte Lipstick".
  const sim = nameOverlap(a.name, b.name);
  // Without both brands we need the names to agree fully; with matching brands, mostly.
  if (sim < (ba && bb ? 0.8 : 1)) return false;
  // Unbranded, unnamed descriptions ("lipstick") need a matching shade to count as the same item.
  if (!ba && !bb && !norm(a.shade) && !norm(b.shade) && !(a.shadeHex && b.shadeHex)) return tokens(a.name).size > 1 && tokens(b.name).size > 1;
  const sa = norm(a.shade);
  const sb = norm(b.shade);
  if (sa && sb) return sa === sb;
  if (a.shadeHex && b.shadeHex) return shadeDistance(a.shadeHex, b.shadeHex) <= 40;
  return true;
}

export interface MergeResult {
  items: BagItem[];
  /** Brand-new entries. */
  added: BagItem[];
  /** Existing entries whose count went up: the item after the update and how many were added. */
  merged: { item: BagItem; plus: number }[];
}

/**
 * Add products to the bag, merging repeats: the same product (already in the bag, or twice in one
 * scan) raises the count instead of duplicating. Missing details (brand, shade, photo) are filled in
 * from the new copy; what she already has is kept.
 */
export function mergeIntoBag(
  bag: BagItem[],
  drafts: (Omit<BagItem, 'id' | 'addedAt'> & { count?: number })[],
  now: string,
  makeId: () => string,
): MergeResult {
  const items = [...bag];
  const added: BagItem[] = [];
  const mergedMap = new Map<string, { item: BagItem; plus: number }>();
  for (const d of drafts) {
    const plus = bagCount(d);
    const idx = items.findIndex((i) => isSameProduct(i, d));
    if (idx >= 0) {
      const cur = items[idx]!;
      const next: BagItem = {
        ...cur,
        brand: cur.brand ?? d.brand,
        shade: cur.shade ?? d.shade,
        shadeHex: cur.shadeHex ?? d.shadeHex,
        kind: cur.kind ?? d.kind,
        role: cur.role ?? d.role,
        type: cur.type ?? d.type,
        photoUri: cur.photoUri ?? d.photoUri,
        ingredients: cur.ingredients?.length ? cur.ingredients : d.ingredients,
        ingredientNotes: cur.ingredientNotes?.length ? cur.ingredientNotes : d.ingredientNotes,
        count: bagCount(cur) + plus,
        updatedAt: now,
      };
      items[idx] = next;
      const addedIdx = added.findIndex((a) => a.id === cur.id);
      if (addedIdx >= 0) added[addedIdx] = next;
      else mergedMap.set(cur.id, { item: next, plus: (mergedMap.get(cur.id)?.plus ?? 0) + plus });
      continue;
    }
    const item: BagItem = { ...d, count: plus, id: makeId(), addedAt: now };
    items.unshift(item);
    added.push(item);
  }
  // A merged entry may have been updated again later in the same batch.
  const merged = [...mergedMap.values()].map((m) => ({ item: items.find((i) => i.id === m.item.id) ?? m.item, plus: m.plus }));
  return { items, added, merged };
}

/** How a look uses one product: in how many steps, and the amounts the video gives (D-25). */
export interface ProductUsage {
  steps: number;
  amounts: string[];
}

export function productUsage(sections: Section[] | undefined, ref: string): ProductUsage {
  const steps = (sections ?? []).flatMap((s) => s.steps).filter((st) => st.productRefs.includes(ref));
  const amounts = [...new Set(steps.map((st) => st.amount?.trim()).filter((a): a is string => !!a))];
  return { steps: steps.length, amounts };
}

const ROLE_RULES: [RegExp, ProductRole][] = [
  [/setting spray|fixing spray|setting mist/i, 'setting spray'],
  [/sunscreen|\bspf\b|sun expert|sun block/i, 'sunscreen'],
  [/perfume|parfum|eau de|fragrance|cologne|body mist/i, 'fragrance'],
  [/sindoor|kumkum/i, 'other'],
  [/primer/i, 'primer'],
  [/corrector/i, 'corrector'],
  [/concealer/i, 'concealer'],
  [/foundation|skin ?tint|bb cream|cc cream/i, 'foundation'],
  [/setting powder|translucent|powder(?!.*(blush|bronzer))/i, 'powder'],
  [/bronzer|contour/i, 'bronzer'],
  [/blush/i, 'blush'],
  [/highlight/i, 'highlighter'],
  [/\bbrows?\b/i, 'brow'],
  [/lip ?liner|lip pencil/i, 'lip liner'],
  [/eye ?liner|liquid liner|gel liner|kohl/i, 'eyeliner'],
  [/mascara/i, 'mascara'],
  [/lash(es)?\b(?!.*curler)|lash glue/i, 'lashes'],
  [/eyeshadow|eye shadow|shimmer|palette/i, 'eyeshadow'],
  [/gloss|lip oil/i, 'gloss'],
  [/balm/i, 'lip balm'],
  [/lipstick|lip colou?r|lip tint/i, 'lipstick'],
  [/moistu?ri[sz]er|cleanser|toner|serum|scrub|micellar/i, 'skincare'],
  [/sponge|blender/i, 'sponge'],
  [/brush|spoolie|swab/i, 'brush'],
  [/curler|tweezer/i, 'tool'],
];

export function productRole(p: { name: string; role?: ProductRole }): ProductRole {
  if (p.role && PRODUCT_ROLES.includes(p.role)) return p.role;
  for (const [re, role] of ROLE_RULES) if (re.test(p.name)) return role;
  return 'other';
}

/** Owned roles that can stand in for a missing one, best first, with plain-language advice. */
const SWAPS: Partial<Record<ProductRole, { role: ProductRole; tip: string }[]>> = {
  primer: [{ role: 'skincare', tip: 'Let your moisturizer sink in for a minute — it works as a light primer.' }],
  foundation: [{ role: 'concealer', tip: 'Thin it with a drop of moisturizer and press it in only where you need it.' }],
  concealer: [{ role: 'foundation', tip: 'Tap a second thin layer of foundation where you need more cover.' }],
  corrector: [
    { role: 'concealer', tip: 'Use a slightly warmer concealer and tap it on before the rest.' },
    { role: 'lipstick', tip: 'A tiny dab of a peachy-red lipstick, blended thin, can color-correct dark circles.' },
  ],
  powder: [{ role: 'setting spray', tip: 'Skip powder and mist setting spray to lock your base.' }],
  bronzer: [
    { role: 'eyeshadow', tip: 'A matte warm-brown eyeshadow on a fluffy brush works as bronzer.' },
    { role: 'blush', tip: 'A warm blush swept higher gives a sun-kissed look.' },
  ],
  blush: [
    { role: 'lipstick', tip: 'Dab a little lipstick on your cheeks and blend with fingertips — a classic cream-blush trick.' },
    { role: 'bronzer', tip: 'A light sweep of bronzer gives warmth instead.' },
  ],
  highlighter: [{ role: 'eyeshadow', tip: 'A shimmery eyeshadow tapped on your cheekbones works beautifully.' }],
  eyeliner: [{ role: 'eyeshadow', tip: 'Press a dark eyeshadow along the lash line with a damp angled or thin brush.' }],
  brow: [{ role: 'eyeshadow', tip: 'A matte brown eyeshadow on an angled brush fills brows softly.' }],
  'lip liner': [{ role: 'lipstick', tip: 'Line with the lipstick itself using its edge, then fill in.' }],
  gloss: [{ role: 'lip balm', tip: 'A clear balm on the center of your lips gives a similar shine.' }],
  lipstick: [
    { role: 'gloss', tip: 'Your gloss gives a sheerer version of the color.' },
    { role: 'lip balm', tip: 'A tinted balm gives a softer, sheer version.' },
  ],
  'lip balm': [{ role: 'gloss', tip: 'Use a thin layer of gloss.' }],
  'setting spray': [{ role: 'powder', tip: 'Lightly dust powder where you get shiny instead.' }],
  sponge: [{ role: 'brush', tip: 'Use a dense brush with small circular motions.' }],
  brush: [{ role: 'sponge', tip: 'A damp sponge works — or your fingertips for creams.' }],
  eyeshadow: [{ role: 'bronzer', tip: 'A little bronzer in the crease is a great soft eyeshadow.' }],
};

/** Tools and steps where "use your fingers" is honest advice. */
const FINGERS_OK: ProductRole[] = ['brush', 'sponge'];

export type BagStatus = 'have' | 'swap' | 'missing';

export interface BagMatch {
  product: ProductRef;
  status: BagStatus;
  item?: BagItem;
  tip?: string;
  /** How many of the matched bag item she owns (D-25). 0 when missing. */
  ownedCount: number;
  /** Steps that use this product and the amounts from the video. */
  usage: ProductUsage;
}

export interface BagCheck {
  matches: BagMatch[];
  have: number;
  swaps: number;
  missing: number;
  /** Products the look uses. */
  needed: number;
  /** Units she owns of the products she HAS for this look (e.g. 2 lipsticks + 1 mascara = 3). Swaps not included. */
  ownedUnits: number;
}

const STOP = new Set(['the', 'a', 'an', 'and', 'with', 'for', 'of', 'in', 'my', 'shade']);
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w)),
  );
}
function nameSimilarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let common = 0;
  A.forEach((w) => B.has(w) && common++);
  return common / Math.min(A.size, B.size);
}

/** Shared words over the longer name's words (1 = same words). */
function nameOverlap(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let common = 0;
  A.forEach((w) => B.has(w) && common++);
  return common / Math.max(A.size, B.size);
}

/** Perceptual-ish distance between two #RRGGBB colors (0 = same, ~442 = black vs white). */
export function shadeDistance(a?: string, b?: string): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}

/** Close enough that she'd call it the same shade family. */
const SAME_SHADE = 120;

export function checkBag(products: ProductRef[], bag: BagItem[], sections?: Section[]): BagCheck {
  const byRole = new Map<ProductRole, BagItem[]>();
  for (const item of bag) {
    const r = productRole(item);
    byRole.set(r, [...(byRole.get(r) ?? []), item]);
  }
  const closest = (items: BagItem[], shade?: string) =>
    [...items].sort((x, y) => shadeDistance(x.shadeHex, shade) - shadeDistance(y.shadeHex, shade))[0];

  const raw: Omit<BagMatch, 'ownedCount' | 'usage'>[] = products.map((product) => {
    const role = productRole(product);
    const same = byRole.get(role) ?? [];
    if (same.length > 0) {
      const byName = [...same].sort((x, y) => nameSimilarity(y.name, product.name) - nameSimilarity(x.name, product.name))[0] as BagItem;
      if (nameSimilarity(byName.name, product.name) >= 0.6) return { product, status: 'have', item: byName };
      const best = closest(same, product.shadeHex) as BagItem;
      const d = shadeDistance(best.shadeHex, product.shadeHex);
      if (!product.shadeHex || !best.shadeHex || d <= SAME_SHADE || role === 'mascara' || role === 'tool' || role === 'brush' || role === 'sponge') {
        return { product, status: 'have', item: best };
      }
      return {
        product,
        status: 'swap',
        item: best,
        tip: d > 250 ? 'Your shade is quite different — apply a lighter layer and build slowly.' : 'A slightly different shade — blend a little more for the same effect.',
      };
    }
    for (const alt of SWAPS[role] ?? []) {
      const candidates = byRole.get(alt.role);
      if (candidates && candidates.length > 0) {
        return { product, status: 'swap', item: closest(candidates, product.shadeHex), tip: alt.tip };
      }
    }
    if (FINGERS_OK.includes(role)) return { product, status: 'swap', tip: 'No tool needed — warm the product on your fingertips and tap it in.' };
    return { product, status: 'missing' };
  });
  const matches: BagMatch[] = raw.map((m) => ({ ...m, ownedCount: m.item ? bagCount(m.item) : 0, usage: productUsage(sections, m.product.ref) }));
  const counted = new Set<string>();
  let ownedUnits = 0;
  for (const m of matches)
    if (m.item && m.status === 'have' && !counted.has(m.item.id)) {
      counted.add(m.item.id);
      ownedUnits += bagCount(m.item);
    }

  return {
    matches,
    needed: products.length,
    ownedUnits,
    have: matches.filter((m) => m.status === 'have').length,
    swaps: matches.filter((m) => m.status === 'swap').length,
    missing: matches.filter((m) => m.status === 'missing').length,
  };
}

/** Suggested kind for a role (used when she adds an item by hand). */
export function kindForRole(role: ProductRole): ProductKind {
  const map: Partial<Record<ProductRole, ProductKind>> = {
    primer: 'tube',
    foundation: 'bottle',
    concealer: 'tube',
    corrector: 'tube',
    powder: 'palette',
    bronzer: 'palette',
    blush: 'palette',
    highlighter: 'palette',
    eyeshadow: 'palette',
    eyeliner: 'pencil',
    mascara: 'mascara',
    lashes: 'tool',
    brow: 'pencil',
    lipstick: 'lipstick',
    'lip liner': 'pencil',
    gloss: 'gloss',
    'lip balm': 'pot',
    'setting spray': 'spray',
    skincare: 'pot',
    sunscreen: 'tube',
    fragrance: 'bottle',
    brush: 'brush',
    sponge: 'sponge',
  };
  return map[role] ?? 'tool';
}

export function bagItemKind(item: BagItem): ProductKind {
  return item.kind ?? (item.role ? kindForRole(item.role) : productKind(item));
}

/**
 * D-25: how Mago reads product photos (one photo or many). Shared by the server (Gemini) and the
 * web preview (Claude). Identical units of the same product are COUNTED, not listed twice.
 */
export function productPhotoPrompt(photoCount: number, zoomCrops = 0): string {
  const zoom = zoomCrops
    ? `\nYou get ONE photo as ${zoomCrops + 1} images: image 1 is the whole photo; images 2–${zoomCrops + 1} are zoomed-in, overlapping sections of the SAME photo, only so you can read small print. Every physical product counts ONCE even if it shows in several images. Report everything under "photo": 1.\n`
    : '';
  return `You are an expert beauty-counter assistant cataloguing someone's makeup bag from ${photoCount === 1 ? 'a photo' : `${photoCount} photos`}.${zoom}
Photos are often cluttered: products lying together on a mat, standing in an organizer, shot from the top or the bottom (label stickers on the base of a lipstick), partly hidden, or next to things that are not products (nail tips, jewellery, toys, packaging).

For EACH photo, list EVERY beauty, makeup, skincare or fragrance product you can see — scan the whole photo edge to edge, including products that are only partly visible or cut off at the edge. A cluttered photo of 8 products must give 8 entries (or fewer entries with counts, when some are identical).
- Read brands from labels AND logos (e.g. the MAC wordmark on a lipstick bullet, the Lancôme rose, LAKMÉ).
- name: the product name exactly as printed ("Studio Fix Fluid", "Sun Expert Ultra Matte Lotion"). If no name is readable, a short plain description ("red bullet lipstick", "black liquid lipstick").
- brand: as printed on the product or recognised from its unmistakable design (e.g. the MAC logo). Leave out if you can't tell. Never guess a brand from colour alone.
- shade: shade name and/or number exactly as printed ("563C Raging Red", "01 Intense Black"). Leave out if not visible.
- type: what the product is, in plain words ("Matte lipstick", "Liquid eyeliner", "Setting spray", "Face serum", "Body oil", "Loose powder", "Sunscreen lotion", "Liquid sindoor", "Perfume").
- role, one of: ${PRODUCT_ROLES.join(', ')}. Skincare oils and serums are "skincare"; perfume is "fragrance"; anything else that doesn't fit is "other".
- kind (how it looks), one of: lipstick, gloss, pencil, mascara, palette, brush, sponge, bottle, tube, pot, spray, tool.
- shadeHex: the product's colour as #RRGGBB when visible.
- count: how many physically separate, identical units (same brand, name and same colour/shade) you can see in THIS photo. Two identical lipsticks = ONE entry with count 2. Two lipsticks of the same brand but different colours (e.g. a nude MAC and a red MAC) = two entries, each count 1.
- confidence: 0–1 — how sure you are of the name and brand (below 0.7 = she should check it).
- box: where the product is in IMAGE 1 (the whole photo), as [x, y, width, height] fractions 0–1 from the top-left corner, tight around the product (for identical units, around the clearest one). Always give a box.
- ingredients: up to 6 KEY ingredients of this product's formula, most important first — read from the label when visible, otherwise from your knowledge of this exact brand + product. Only when you know the product; leave out for unknown or unbranded items. Never invent.
- ingredientNotes: up to 3 short facts worth knowing, only when you know them: "Contains fragrance", "Fragrance-free", "SPF 15", "Contains alcohol", "Vegan".
Skip things that are not beauty products. Don't list the same physical product twice within one photo. If a photo has no products, give it an empty list.
Reply with ONLY JSON: {"photos": [{"photo": 1, "items": [{"name": "...", "brand": "...", "shade": "...", "type": "...", "role": "...", "kind": "...", "shadeHex": "#RRGGBB", "count": 1, "confidence": 0.9, "box": [0.1, 0.2, 0.15, 0.4], "ingredients": ["..."], "ingredientNotes": ["..."]}]}]}`;
}

/**
 * D-26: combine what was read from several photos of ONE scan. The same product seen in two photos
 * is usually the same item photographed twice, so it is counted once (the highest count seen in a
 * single photo), not added up. She confirms the final counts on the review screen.
 */
export function combineScan<T extends Pick<BagItem, 'name' | 'brand' | 'shade' | 'shadeHex' | 'role' | 'photoUri' | 'ingredients' | 'ingredientNotes'> & { count?: number; confidence?: number }>(perPhoto: T[][]): (T & { seenInPhotos: number })[] {
  const out: (T & { seenInPhotos: number })[] = [];
  for (const items of perPhoto) {
    for (const it of items) {
      const j = out.findIndex((o) => isSameProduct(o, it));
      if (j < 0) {
        out.push({ ...it, count: bagCount(it), seenInPhotos: 1 });
        continue;
      }
      const cur = out[j]!;
      const better = (it.confidence ?? 0) > (cur.confidence ?? 0) ? it : cur;
      out[j] = {
        ...cur,
        ...better,
        brand: cur.brand ?? it.brand,
        shade: cur.shade ?? it.shade,
        shadeHex: cur.shadeHex ?? it.shadeHex,
        photoUri: better.photoUri ?? cur.photoUri ?? it.photoUri,
        ingredients: better.ingredients?.length ? better.ingredients : cur.ingredients?.length ? cur.ingredients : it.ingredients,
        ingredientNotes: better.ingredientNotes?.length ? better.ingredientNotes : cur.ingredientNotes?.length ? cur.ingredientNotes : it.ingredientNotes,
        count: Math.max(bagCount(cur), bagCount(it)),
        seenInPhotos: cur.seenInPhotos + 1,
      };
    }
  }
  return out;
}

/** D-28: a product's box in its photo, as fractions [x, y, w, h]; null when unusable. Padded a little. */
export function cropBox(raw: unknown, pad = 0.04): [number, number, number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const n = raw.map(Number);
  if (n.some((v) => !Number.isFinite(v))) return null;
  let [x, y, w, h] = n as [number, number, number, number];
  // Some models answer 0–1000 or 0–100 instead of 0–1.
  const scale = Math.max(x + w, y + h) > 100 ? 1000 : Math.max(x + w, y + h) > 1.5 ? 100 : 1;
  [x, y, w, h] = [x / scale, y / scale, w / scale, h / scale];
  if (w <= 0.01 || h <= 0.01) return null;
  const x0 = Math.max(0, x - pad);
  const y0 = Math.max(0, y - pad);
  const x1 = Math.min(1, x + w + pad);
  const y1 = Math.min(1, y + h + pad);
  if (x1 - x0 < 0.02 || y1 - y0 < 0.02) return null;
  // A "box" that is the whole photo is no cut-out.
  if (x1 - x0 > 0.95 && y1 - y0 > 0.95) return null;
  return [x0, y0, x1 - x0, y1 - y0];
}

/** D-28: tidy ingredient lists from a model (strings only, short, de-duplicated). */
export function cleanList(raw: unknown, max: number, len = 48): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const t = v.replace(/\s+/g, ' ').trim().slice(0, len);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= max) break;
  }
  return out.length ? out : undefined;
}
