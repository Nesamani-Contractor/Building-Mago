/**
 * Read-aloud voice choice. Phones don't label voices by gender, so we rank by known voice names:
 * natural female English voices first, higher-quality ("enhanced"/"premium") first, known male
 * voices excluded. The user can override the choice in Settings → Read-aloud voice.
 */

export interface VoiceInfo {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
}

/** Well-known female English voices across iOS, Android (Google TTS), Windows/Edge and Chrome. */
const FEMALE = [
  // Warm, lower, softer voices first (best for a soft/husky read)
  'ava',
  'zoe',
  'allison',
  'jenny',
  'sonia',
  'serena',
  'moira',
  'libby',
  'hazel',
  'susan',
  'samantha',
  'nicky',
  'kate',
  'stephanie',
  'karen',
  'tessa',
  'fiona',
  'victoria',
  'joelle',
  'aria',
  'zira',
  'natasha',
  'michelle',
  'emma',
  'google us english',
  'google uk english female',
  'tpc', // Google en-US female (warmer)
  'sfg', // Google en-US female
  'tpf', // Google en-US female
  'gba', // Google en-GB female
  'female',
];

const MALE = [
  'male',
  'daniel',
  'david',
  'mark',
  'guy',
  'alex',
  'fred',
  'aaron',
  'arthur',
  'gordon',
  'rishi',
  'tom',
  'oliver',
  'ryan',
  'eric',
  'evan',
  'nathan',
  'reed',
  'ralph',
  'albert',
  'bruce',
  'junior',
  'iob',
  'iom',
  'tpd',
  'rjs',
  'gbd',
];

function words(v: VoiceInfo): string {
  return `${v.name} ${v.identifier}`.toLowerCase();
}

export function isLikelyMale(v: VoiceInfo): boolean {
  const w = words(v);
  if (/\bfemale\b/.test(w)) return false;
  return MALE.some((m) => new RegExp(`(^|[^a-z])${m}([^a-z]|$)`).test(w));
}

/** Higher is better. Negative means "don't use". */
export function voiceScore(v: VoiceInfo): number {
  if (!/^en([-_]|$)/i.test(v.language)) return -100;
  if (isLikelyMale(v)) return -50;
  const w = words(v);
  let score = 0;
  const idx = FEMALE.findIndex((f) => w.includes(f));
  if (idx >= 0) score += 40 - Math.min(idx, 30); // earlier in the list = more natural
  if (/premium/.test(w)) score += 30;
  else if (/enhanced|natural|neural|online/.test(w) || v.quality === 'Enhanced') score += 20;
  if (/^en[-_]us/i.test(v.language)) score += 5;
  else if (/^en[-_](gb|au|ie)/i.test(v.language)) score += 3;
  if (/compact|eloquence|novelty/.test(w)) score -= 25;
  return score;
}

/** Best voice for read-aloud, or undefined to fall back to the system default. */
export function pickReadAloudVoice(voices: VoiceInfo[], preferredId?: string | null): VoiceInfo | undefined {
  if (preferredId) {
    const chosen = voices.find((v) => v.identifier === preferredId);
    if (chosen) return chosen;
  }
  const ranked = rankVoices(voices);
  return ranked.length > 0 && voiceScore(ranked[0] as VoiceInfo) > 0 ? ranked[0] : undefined;
}

/** English, not-male voices, best first (for the Settings picker). */
export function rankVoices(voices: VoiceInfo[]): VoiceInfo[] {
  return voices
    .filter((v) => voiceScore(v) >= 0)
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

/** Friendly label: "Ava (Premium)" from "com.apple.voice.premium.en-US.Ava". */
export function voiceLabel(v: VoiceInfo): string {
  const w = words(v);
  const tier = /premium/.test(w) ? ' · Premium' : /enhanced|natural|neural/.test(w) || v.quality === 'Enhanced' ? ' · Enhanced' : '';
  const region = /^en[-_]gb/i.test(v.language) ? 'British' : /^en[-_]au/i.test(v.language) ? 'Australian' : /^en[-_]ie/i.test(v.language) ? 'Irish' : /^en[-_]in/i.test(v.language) ? 'Indian' : 'American';
  return `${v.name.replace(/\s*\((Enhanced|Premium)\)/i, '')} — ${region}${tier}`;
}

/**
 * How she sounds. Device voices can't be "made husky", but a slightly lower pitch and slower,
 * unhurried pace reads as softer and warmer. "Soft & husky" is the default (owner request).
 */
export const VOICE_STYLES = {
  husky: { label: 'Soft & husky', pitch: 0.88, rate: 0.86 },
  natural: { label: 'Natural', pitch: 1.0, rate: 0.92 },
  bright: { label: 'Bright', pitch: 1.1, rate: 0.95 },
} as const;
export type VoiceStyle = keyof typeof VOICE_STYLES;
export const DEFAULT_VOICE_STYLE: VoiceStyle = 'husky';
