import { Platform } from 'react-native';
import { cleanList, cropBox, PRODUCT_ROLES, productPhotoPrompt, productRole, type BagItem, type ProductKind, type ProductRole } from '@mago/shared';
import { isDemo } from './config';
import { callFunction } from './supabase';
import { track } from './analytics';
import { getSample } from './videoWatch';

export interface ScanItem {
  name: string;
  brand?: string;
  shade?: string;
  kind?: ProductKind;
  role?: ProductRole;
  shadeHex?: string;
  /** Plain product type, e.g. "Liquid eyeliner" (D-26). */
  type?: string;
  /** Identical units seen (D-25). */
  count?: number;
  confidence: number;
  /** D-28: where it sits in her photo, [x, y, w, h] as fractions — used to cut out its picture. */
  box?: [number, number, number, number];
  /** D-28: key ingredients and short notes ("Contains fragrance"). */
  ingredients?: string[];
  ingredientNotes?: string[];
}

export interface ScanResult {
  photoUri: string;
  /** What Mago read from the photo. Empty when it couldn't read it — she names it on the review screen. */
  items: ScanItem[];
  /** Why the photo couldn't be read (permission, network, unreadable file…), when it failed. */
  error?: ScanError;
}

export type ScanError = 'unavailable' | 'not_granted' | 'busy' | 'bad_photo' | 'failed';

const KINDS: ProductKind[] = ['lipstick', 'gloss', 'pencil', 'mascara', 'palette', 'brush', 'sponge', 'bottle', 'tube', 'pot', 'spray', 'tool'];

function clean(raw: Record<string, unknown>): ScanItem | null {
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
  if (!name) return null;
  const str = (v: unknown, n = 60) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : undefined);
  const role = str(raw.role) as ProductRole | undefined;
  const kind = str(raw.kind) as ProductKind | undefined;
  const hex = str(raw.shadeHex);
  return {
    name,
    brand: str(raw.brand),
    shade: str(raw.shade),
    type: str(raw.type, 40),
    role: role && (PRODUCT_ROLES as readonly string[]).includes(role) ? role : productRole({ name }),
    kind: kind && KINDS.includes(kind) ? kind : undefined,
    shadeHex: hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : undefined,
    count: Math.max(1, Math.min(20, Math.round(Number(raw.count) || 1))),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.5)),
    box: cropBox(raw.box) ?? undefined,
    ingredients: cleanList(raw.ingredients, 6),
    ingredientNotes: cleanList(raw.ingredientNotes, 3, 32),
  };
}

const CUTOUT_SIDE = 360;

/**
 * D-28: each product's own picture, cut out of her photo on the device (nothing is uploaded).
 * Web (the preview): canvas → small JPEG data URL. Native: needs expo-image-manipulator (not yet
 * approved) — until then products from a cluttered photo show the shade illustration instead.
 */
export async function cutOuts(photoUri: string, boxes: ([number, number, number, number] | undefined)[], base64: (uri: string) => Promise<string | null>): Promise<(string | undefined)[]> {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !boxes.some(Boolean)) return boxes.map(() => undefined);
  try {
    const blob = await toBlob(photoUri, base64);
    if (!blob) return boxes.map(() => undefined);
    const img = await loadImage(blob);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const out = boxes.map((b) => {
      if (!b) return undefined;
      // The product's own outline (already padded a little) — never squared up, so a long thin
      // product doesn't pull in its neighbours.
      const [x, y, w, h] = b;
      const sx = Math.max(0, x * W);
      const sy = Math.max(0, y * H);
      const cw = Math.min(W - sx, w * W);
      const ch = Math.min(H - sy, h * H);
      const scale = Math.min(1, CUTOUT_SIDE / Math.max(cw, ch));
      const dw = Math.round(cw * scale);
      const dh = Math.round(ch * scale);
      // Products lying on their side (much wider than tall) are stood upright, so the picture
      // fills a square thumbnail the way the product sits on a shelf.
      const turn = dw > dh * 1.6;
      const canvas = document.createElement('canvas');
      canvas.width = turn ? dh : dw;
      canvas.height = turn ? dw : dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      if (turn) {
        ctx.translate(dh, 0);
        ctx.rotate(Math.PI / 2);
      }
      ctx.drawImage(img, sx, sy, cw, ch, 0, 0, dw, dh);
      return canvas.toDataURL('image/jpeg', 0.85);
    });
    URL.revokeObjectURL(img.src);
    return out;
  } catch {
    return boxes.map(() => undefined);
  }
}

/**
 * Read products from one or many photos (D-18, D-25).
 * - Full app: each photo is sent once to the scan-products function (Gemini vision) and NOT stored.
 * - Claude web preview: the photos go to Claude through the preview, in one call.
 * - Neither available: empty results — she names each product on the review screen.
 */
export async function readProductPhotos(
  photoUris: string[],
  base64: (uri: string) => Promise<string | null>,
  onProgress?: (done: number, total: number) => void,
): Promise<ScanResult[]> {
  track('bag_scan_started', { photos: photoUris.length });
  if (isDemo) return readInPreview(photoUris, base64, onProgress);
  const out: ScanResult[] = [];
  for (const photoUri of photoUris) {
    const data = await base64(photoUri);
    if (!data) {
      out.push({ photoUri, items: [] });
      continue;
    }
    try {
      const res = await callFunction<{ items: Record<string, unknown>[] }>('scan-products', { image: data, mimeType: 'image/jpeg' });
      out.push({ photoUri, items: res.items.map(clean).filter((x): x is ScanItem => !!x) });
    } catch {
      out.push({ photoUri, items: [] });
    }
  }
  return out;
}

async function toBlob(uri: string, base64: (uri: string) => Promise<string | null>): Promise<Blob | null> {
  try {
    const b64 = await base64(uri);
    if (b64) return await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
    return await (await fetch(uri)).blob();
  } catch {
    return null;
  }
}

/** Decode any photo the browser can show (JPEG, PNG, HEIC on Safari) into an image element. */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

const MAX_SIDE = 1600;

function jpeg(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number): Promise<Blob | null> {
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.88));
}

/**
 * D-26 fix: one photo → the whole photo + up to 4 overlapping zoomed quarters, all re-encoded as
 * JPEG (so iPhone HEIC photos are accepted). Each image is shrunk to ~1.2 MP before Claude sees
 * it, so on a cluttered table the zoomed quarters are what make small labels and shade names
 * readable.
 */
async function photoImages(blob: Blob, maxImages: number): Promise<Blob[]> {
  const img = await loadImage(blob);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const out: Blob[] = [];
  const whole = await jpeg(img, 0, 0, W, H);
  if (whole) out.push(whole);
  const crops = Math.min(4, Math.max(0, maxImages - 1));
  const cw = Math.round(W * 0.6);
  const ch = Math.round(H * 0.6);
  const spots: [number, number][] = [
    [0, 0],
    [W - cw, 0],
    [0, H - ch],
    [W - cw, H - ch],
  ];
  for (const [x, y] of spots.slice(0, crops)) {
    const b = await jpeg(img, x, y, cw, ch);
    if (b) out.push(b);
  }
  URL.revokeObjectURL(img.src);
  return out;
}

type PhotoAnswer = { photos?: { photo?: number; items?: Record<string, unknown>[] }[]; items?: Record<string, unknown>[] };

function errorFrom(code: string | undefined): ScanError {
  if (code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled') return 'not_granted';
  if (code === 'rate_limited') return 'busy';
  if (code === 'image_rejected' || code === 'images_unavailable') return 'bad_photo';
  return 'failed';
}

async function readInPreview(
  photoUris: string[],
  base64: (uri: string) => Promise<string | null>,
  onProgress?: (done: number, total: number) => void,
): Promise<ScanResult[]> {
  const sample = await getSample();
  const limits = sample ? await sample.limits().catch(() => null) : null;
  if (!sample || !limits?.images) return photoUris.map((photoUri) => ({ photoUri, items: [], error: 'unavailable' as const }));
  const maxImages = Math.max(1, limits.images.maxCount);
  const out: ScanResult[] = [];
  let i = 0;
  for (const photoUri of photoUris) {
    onProgress?.(i, photoUris.length);
    const blob = await toBlob(photoUri, base64);
    let images: Blob[] = [];
    try {
      images = blob ? await photoImages(blob, maxImages) : [];
    } catch {
      images = blob ? [blob] : [];
    }
    if (!images.length) {
      out.push({ photoUri, items: [], error: 'bad_photo' });
      i++;
      continue;
    }
    const prompt = productPhotoPrompt(1, images.length - 1);
    let result: ScanResult | null = null;
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      try {
        const ans = await sample.json<PhotoAnswer>(attempt === 0 ? prompt : `${prompt}\n\nReply with ONLY the JSON object — no other text.`, {
          images,
          modelTier: 'default',
          cache: attempt === 0,
        });
        const raw = ans.photos?.flatMap((p) => p.items ?? []) ?? ans.items ?? [];
        result = { photoUri, items: raw.map(clean).filter((x): x is ScanItem => !!x) };
      } catch (e) {
        const code = (e as { code?: string })?.code;
        const err = errorFrom(code);
        if (err === 'not_granted') {
          // She said no: stop asking for the rest of the photos.
          return [...out, ...photoUris.slice(out.length).map((u) => ({ photoUri: u, items: [], error: err }))];
        }
        if (attempt === 1 || (code !== 'invalid_json' && code !== 'upstream_error' && code !== 'rate_limited')) result = { photoUri, items: [], error: err };
        else if (code === 'rate_limited') await new Promise((r) => setTimeout(r, 4000));
      }
    }
    out.push(result ?? { photoUri, items: [], error: 'failed' });
    i++;
  }
  onProgress?.(photoUris.length, photoUris.length);
  return out;
}

export function draftFrom(r: ScanResult): Omit<BagItem, 'id' | 'addedAt'>[] {
  if (r.items.length === 0) return [{ name: '', photoUri: r.photoUri }];
  return r.items.map((i) => ({ name: i.name, brand: i.brand, shade: i.shade, type: i.type, kind: i.kind, role: i.role, shadeHex: i.shadeHex, count: i.count, photoUri: r.photoUri, ingredients: i.ingredients, ingredientNotes: i.ingredientNotes }));
}
