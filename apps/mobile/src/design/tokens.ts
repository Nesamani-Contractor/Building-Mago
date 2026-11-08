/**
 * Mago design tokens — "Warm luxury A: Champagne & Plum" (decision D-13, revised 8 Nov 2026).
 * Screens must use these tokens; no hard-coded colors, sizes, radii or durations in screens.
 *
 * Contrast (WCAG AA), checked:
 *   ink #2A1622 on porcelain #FBF7F4 ≈ 15.9:1 · porcelain on ink ≈ 15.9:1
 *   inkSecondary #7A6670 on porcelain/white ≈ 5.0:1 (never on raw champagne: 4.2:1)
 *   gold #C9A46A is NEVER text (≈ 2.2:1) — hairlines, badge outlines, ring, dots only.
 *   dark: ink #F6EEE9 on #1A1015 ≈ 16:1 · inkSecondary #BCA8B2 ≈ 8.3:1
 */

export const palette = {
  porcelain: '#FBF7F4',
  champagne: '#F3E3D3',
  peach: '#F6C9B4',
  rose: '#E8A5B5',
  lilac: '#CDB8E6',
  plum: '#2A1622',
  plumSecondary: '#7A6670',
  gold: '#C9A46A',
  white: '#FFFFFF',
  nightBg: '#1A1015',
  nightSurface: '#251820',
  nightInk: '#F6EEE9',
  nightSecondary: '#BCA8B2',
} as const;

export interface ColorScheme {
  bg: string;
  surface: string;
  surfaceAlt: string;
  glass: string;
  ink: string;
  inkSecondary: string;
  inkOnPrimary: string;
  primary: string;
  accent: string;
  hairline: string;
  hairlineStrong: string;
  track: string;
  overlay: string;
  success: string;
  warningBg: string;
  warningInk: string;
  danger: string;
  shadow: string;
  glowOpacity: number;
  blurTint: 'light' | 'dark';
}

export const light: ColorScheme = {
  bg: palette.porcelain,
  surface: palette.white,
  surfaceAlt: '#F6EFEA',
  glass: 'rgba(255,255,255,0.70)',
  ink: palette.plum,
  inkSecondary: palette.plumSecondary,
  inkOnPrimary: palette.porcelain,
  primary: palette.plum,
  accent: palette.gold,
  hairline: 'rgba(201,164,106,0.35)',
  hairlineStrong: 'rgba(201,164,106,0.7)',
  track: 'rgba(42,22,34,0.08)',
  overlay: 'rgba(42,22,34,0.38)',
  success: '#2F6B4F',
  warningBg: '#FFF1D6',
  warningInk: '#7A4B00',
  danger: '#A0283C',
  shadow: palette.plum,
  glowOpacity: 1,
  blurTint: 'light',
};

export const dark: ColorScheme = {
  bg: palette.nightBg,
  surface: palette.nightSurface,
  surfaceAlt: '#2E1F28',
  glass: 'rgba(37,24,32,0.72)',
  ink: palette.nightInk,
  inkSecondary: palette.nightSecondary,
  inkOnPrimary: palette.plum,
  primary: palette.nightInk,
  accent: palette.gold,
  hairline: 'rgba(201,164,106,0.30)',
  hairlineStrong: 'rgba(201,164,106,0.6)',
  track: 'rgba(255,255,255,0.10)',
  overlay: 'rgba(0,0,0,0.55)',
  success: '#8FD1AE',
  warningBg: '#3A2A10',
  warningInk: '#F5D28F',
  danger: '#F29AA8',
  shadow: '#000000',
  glowOpacity: 0.5,
  blurTint: 'dark',
};

/** 4-pt base grid. */
export const space = {
  xxs: 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  x3: 32,
  x4: 40,
  x5: 48,
  x6: 64,
} as const;

export const radius = {
  chip: 12,
  thumb: 16,
  card: 24,
  sheet: 32,
  pill: 999,
} as const;

export const fonts = {
  serif: 'CormorantGaramond_600SemiBold',
  serifMedium: 'CormorantGaramond_500Medium',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  /** Handwritten — only for the stylist's note. */
  hand: 'Caveat_500Medium',
} as const;

/** Type scale. Serif for headlines, sans for everything else. Sentence case everywhere. */
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 48, lineHeight: 50, letterSpacing: -0.8 },
  title1: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 40, letterSpacing: -0.6 },
  title2: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.4 },
  title3: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, letterSpacing: -0.2 },
  step: { fontFamily: fonts.serifMedium, fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  headline: { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 26 },
  callout: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  subhead: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22 },
  footnote: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  button: { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 22, letterSpacing: 0.2 },
  tab: { fontFamily: fonts.sansMedium, fontSize: 11, lineHeight: 14 },
} as const;
export type TypeVariant = keyof typeof type;

/** One shared spring for everything (≤ 400 ms feel). */
export const motion = {
  spring: { damping: 18, stiffness: 260, mass: 0.9 },
  pressScale: 0.97,
  fast: 160,
  step: 250,
  slow: 400,
} as const;

export const layout = {
  tapMin: 44,
  /** Bigger targets for anything used at arm's length during makeup. */
  tapMirror: 72,
  buttonHeight: 56,
  maxContentWidth: 640,
  tabBarHeight: 64,
  /** Space tab screens leave at the bottom so content clears the tab bar. */
  tabBarSpace: 96,
} as const;

/** Warm, soft, plum-tinted shadow (never grey). */
export function softShadow(c: ColorScheme, strength: 'card' | 'raised' = 'card') {
  return {
    shadowColor: c.shadow,
    shadowOpacity: strength === 'card' ? 0.06 : 0.12,
    shadowRadius: strength === 'card' ? 18 : 24,
    shadowOffset: { width: 0, height: strength === 'card' ? 10 : 14 },
    elevation: strength === 'card' ? 2 : 6,
  } as const;
}

/** Full-strength gradients — allowed ONLY on the streak ring, the before/after reveal and the paywall header. */
export const signatureGradient = [palette.champagne, palette.peach, palette.rose] as const;
