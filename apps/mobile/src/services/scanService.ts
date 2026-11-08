import { productRole, type BagItem, type ProductKind, type ProductRole } from '@mago/shared';
import { isDemo } from './config';
import { callFunction } from './supabase';
import { track } from './analytics';

export interface ScanResult {
  photoUri: string;
  /** What Mago read from the photo. Empty in demo mode — she confirms it on the review screen. */
  items: { name: string; brand?: string; kind?: ProductKind; role?: ProductRole; shadeHex?: string; confidence: number }[];
}

/**
 * Read products from photos.
 * Live (D-18): each photo is sent once to the scan-products function, read by Gemini vision, and
 * NOT stored — the server keeps nothing. Demo: no AI, so the review screen asks her to name each one.
 */
export async function readProductPhotos(photoUris: string[], base64: (uri: string) => Promise<string | null>): Promise<ScanResult[]> {
  track('bag_scan_started', { photos: photoUris.length });
  if (isDemo) return photoUris.map((photoUri) => ({ photoUri, items: [] }));
  const out: ScanResult[] = [];
  for (const photoUri of photoUris) {
    const data = await base64(photoUri);
    if (!data) {
      out.push({ photoUri, items: [] });
      continue;
    }
    try {
      const res = await callFunction<{ items: ScanResult['items'] }>('scan-products', { image: data, mimeType: 'image/jpeg' });
      out.push({ photoUri, items: res.items.map((i) => ({ ...i, role: i.role ?? productRole(i) })) });
    } catch {
      out.push({ photoUri, items: [] });
    }
  }
  return out;
}

export function draftFrom(r: ScanResult): Omit<BagItem, 'id' | 'addedAt'>[] {
  if (r.items.length === 0) return [{ name: '', photoUri: r.photoUri }];
  return r.items.map((i) => ({ name: i.name, brand: i.brand, kind: i.kind, role: i.role, shadeHex: i.shadeHex, photoUri: r.photoUri }));
}
