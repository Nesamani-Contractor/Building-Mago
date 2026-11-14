import { PRODUCT_ROLES, productPhotoPrompt, productRole, type BagItem, type ProductKind, type ProductRole } from '@mago/shared';
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
  /** Identical units seen (D-25). */
  count?: number;
  confidence: number;
}

export interface ScanResult {
  photoUri: string;
  /** What Mago read from the photo. Empty when it couldn't read it — she names it on the review screen. */
  items: ScanItem[];
}

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
    role: role && (PRODUCT_ROLES as readonly string[]).includes(role) ? role : productRole({ name }),
    kind: kind && KINDS.includes(kind) ? kind : undefined,
    shadeHex: hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : undefined,
    count: Math.max(1, Math.min(20, Math.round(Number(raw.count) || 1))),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.5)),
  };
}

/**
 * Read products from one or many photos (D-18, D-25).
 * - Full app: each photo is sent once to the scan-products function (Gemini vision) and NOT stored.
 * - Claude web preview: the photos go to Claude through the preview, in one call.
 * - Neither available: empty results — she names each product on the review screen.
 */
export async function readProductPhotos(photoUris: string[], base64: (uri: string) => Promise<string | null>): Promise<ScanResult[]> {
  track('bag_scan_started', { photos: photoUris.length });
  if (isDemo) return readInPreview(photoUris, base64);
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

async function readInPreview(photoUris: string[], base64: (uri: string) => Promise<string | null>): Promise<ScanResult[]> {
  const empty = photoUris.map((photoUri) => ({ photoUri, items: [] as ScanItem[] }));
  const sample = await getSample();
  const limits = sample ? await sample.limits().catch(() => null) : null;
  if (!sample || !limits?.images) return empty;
  const max = Math.max(1, limits.images.maxCount);
  const out = [...empty];
  for (let start = 0; start < photoUris.length; start += max) {
    const batch = photoUris.slice(start, start + max);
    const blobs = (await Promise.all(batch.map((u) => toBlob(u, base64)))).map((b, i) => ({ b, i })).filter((x): x is { b: Blob; i: number } => !!x.b);
    if (!blobs.length) continue;
    try {
      const ans = await sample.json<{ photos?: { photo?: number; items?: Record<string, unknown>[] }[] }>(productPhotoPrompt(blobs.length), { images: blobs.map((x) => x.b), modelTier: 'default' });
      (ans.photos ?? []).forEach((p, k) => {
        const which = blobs[(typeof p.photo === 'number' ? p.photo - 1 : k)] ?? blobs[k];
        if (!which) return;
        out[start + which.i] = { photoUri: batch[which.i]!, items: (p.items ?? []).map(clean).filter((x): x is ScanItem => !!x) };
      });
    } catch {
      // Leave this batch empty: she can still name them by hand.
    }
  }
  return out;
}

export function draftFrom(r: ScanResult): Omit<BagItem, 'id' | 'addedAt'>[] {
  if (r.items.length === 0) return [{ name: '', photoUri: r.photoUri }];
  return r.items.map((i) => ({ name: i.name, brand: i.brand, shade: i.shade, kind: i.kind, role: i.role, shadeHex: i.shadeHex, count: i.count, photoUri: r.photoUri }));
}
