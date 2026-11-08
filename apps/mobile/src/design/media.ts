import type { Category, Occasion, Routine } from '@mago/shared';

/**
 * Look photography. Demo images are licensed under the Unsplash License (see assets/looks/CREDITS.md)
 * and will be replaced by a commissioned Mago shoot before launch.
 * Saved YouTube looks use the video's own thumbnail; other sources fall back to a category photo.
 */
export const PHOTOS = {
  softGlam: require('../../assets/looks/soft-glam.jpg'),
  workFace: require('../../assets/looks/work-face.jpg'),
  glossyLips: require('../../assets/looks/glossy-lips.jpg'),
  brows: require('../../assets/looks/brows.jpg'),
  weddingGuest: require('../../assets/looks/wedding-guest.jpg'),
  dewySkin: require('../../assets/looks/dewy-skin.jpg'),
  partyLiner: require('../../assets/looks/party-liner.jpg'),
  sunkissed: require('../../assets/looks/sunkissed.jpg'),
  palette: require('../../assets/looks/palette.jpg'),
  flatlay: require('../../assets/looks/flatlay.jpg'),
} as const satisfies Record<string, number>;

/** Where the subject sits in each photo, so crops keep the face/feature in frame. */
export const PHOTO_FOCUS: Partial<Record<keyof typeof PHOTOS, string>> = {
  softGlam: '50% 40%',
  workFace: '70% 30%',
  brows: '55% 30%',
  partyLiner: '45% 40%',
  weddingGuest: '40% 50%',
};

const BY_ROUTINE: Record<string, keyof typeof PHOTOS> = {
  'sample-soft-glam': 'softGlam',
  'sample-work-face': 'workFace',
  'sample-glossy-lips': 'glossyLips',
  'sample-five-min-brows': 'brows',
  'sample-wedding-guest': 'weddingGuest',
  'sample-dewy-skin': 'dewySkin',
  'sample-party-liner': 'partyLiner',
  'sample-sunkissed': 'sunkissed',
};

const BY_CATEGORY: Record<Category, keyof typeof PHOTOS> = {
  Eyes: 'softGlam',
  Lips: 'glossyLips',
  'Face/Base': 'workFace',
  Brows: 'brows',
  'Full look': 'weddingGuest',
  Skincare: 'dewySkin',
  Hair: 'workFace',
  Other: 'flatlay',
};

export const OCCASION_PHOTO: Record<Occasion, keyof typeof PHOTOS> = {
  Everyday: 'workFace',
  Work: 'flatlay',
  'Date night': 'glossyLips',
  Party: 'partyLiner',
  'Wedding/Event': 'weddingGuest',
  Custom: 'palette',
};

export interface LookImage {
  source: number | { uri: string };
  /** CSS-style object position ("x% y%"). */
  focus?: string;
}

export function photo(key: keyof typeof PHOTOS): LookImage {
  return { source: PHOTOS[key], focus: PHOTO_FOCUS[key] };
}

export function routineImage(r: Pick<Routine, 'id' | 'category' | 'source'> & { variantOf?: string }): LookImage {
  const sampleKey = BY_ROUTINE[r.id] ?? (r.variantOf ? BY_ROUTINE[r.variantOf] : undefined);
  if (sampleKey) return photo(sampleKey);
  if (r.source.platform === 'youtube' && r.source.videoId) {
    return { source: { uri: `https://i.ytimg.com/vi/${encodeURIComponent(r.source.videoId)}/hqdefault.jpg` } };
  }
  return photo(BY_CATEGORY[r.category] ?? 'flatlay');
}
