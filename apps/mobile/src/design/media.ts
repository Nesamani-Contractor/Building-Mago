import type { Category, Occasion, Routine } from '@mago/shared';

/**
 * Look photography. Placeholder images (Unsplash License, one 'Porcelain Luxe' grade — see
 * assets/media/manifest.json) until the commissioned, model-released 4K shoot.
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
  heroClean: require('../../assets/looks/hero-clean.jpg'),
  vibeBold: require('../../assets/looks/vibe-bold.jpg'),
  glow: require('../../assets/looks/glow.jpg'),
  night: require('../../assets/looks/night.jpg'),
} as const satisfies Record<string, number>;

/** Muted, seamless placeholder loops (see assets/media/manifest.json). */
export const LOOPS = {
  softGlam: { video: require('../../assets/media/loop-soft-glam.mp4') as number, poster: require('../../assets/media/loop-soft-glam-poster.jpg') as number },
  eyes: { video: require('../../assets/media/loop-eyes.mp4') as number, poster: require('../../assets/media/loop-eyes-poster.jpg') as number },
} as const;

/** S-02 welcome reel (12 s, made in-house from the Mago photography + real app screens). */
export const WELCOME_REEL = { video: require('../../assets/media/welcome-reel.mp4') as number, poster: require('../../assets/media/welcome-reel-poster.jpg') as number };

export type Vibe = 'soft' | 'clean' | 'night' | 'bold';
export const VIBES: { id: Vibe; label: string; photo: keyof typeof PHOTOS; focus: string; meta: string }[] = [
  { id: 'soft', label: 'Soft glam', photo: 'softGlam', focus: '50% 42%', meta: '12 min · 6 steps' },
  { id: 'clean', label: 'Clean girl', photo: 'heroClean', focus: '50% 38%', meta: '8 min · 5 steps' },
  { id: 'night', label: 'Night out', photo: 'night', focus: '45% 35%', meta: '18 min · 8 steps' },
  { id: 'bold', label: 'Bold editorial', photo: 'vibeBold', focus: '45% 35%', meta: '15 min · 7 steps' },
];

/** Where the subject sits in each photo, so crops keep the face/feature in frame. */
export const PHOTO_FOCUS: Partial<Record<keyof typeof PHOTOS, string>> = {
  softGlam: '50% 42%',
  workFace: '50% 30%',
  glossyLips: '55% 38%',
  brows: '55% 45%',
  weddingGuest: '45% 38%',
  dewySkin: '50% 40%',
  partyLiner: '50% 42%',
  sunkissed: '50% 35%',
  heroClean: '50% 38%',
  vibeBold: '45% 35%',
  glow: '45% 30%',
  night: '45% 35%',
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
  Eyes: 'brows',
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

/** A step's photo, by the step's section, so a look reads Prep → Skin → Base → Eyes → Cheeks → Lips. */
export function sectionImage(section: string, fallback: LookImage): LookImage {
  const s = section.toLowerCase();
  if (s.includes('prep') || s.includes('skin')) return photo('dewySkin');
  if (s.includes('base') || s.includes('face')) return photo('sunkissed');
  if (s.includes('eye')) return photo('brows');
  if (s.includes('brow')) return { ...photo('brows'), focus: '55% 25%' };
  if (s.includes('cheek') || s.includes('blush')) return { ...photo('softGlam'), focus: '45% 55%' };
  if (s.includes('lip')) return { ...photo('glossyLips'), focus: '55% 55%' };
  if (s.includes('finish') || s.includes('set')) return photo('glow');
  return fallback;
}

/** The step's looping clip, when we have one (placeholder loops until real step clips exist). */
export function sectionLoop(section: string): (typeof LOOPS)[keyof typeof LOOPS] | undefined {
  return section.toLowerCase().includes('eye') ? LOOPS.eyes : undefined;
}
