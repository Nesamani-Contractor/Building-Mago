import { Platform } from 'react-native';

/**
 * Mago design tokens — "WOW v2 · Porcelain Luxe" (decision D-21, 9 Nov 2026): plum main flow,
 * rose accents on the Home tab only, gold reserved for achievement. Replaces D-20 palette. Screens must use these tokens; no hard-coded colors, sizes,
 * radii or durations in screens.
 *
 * One strong color (Plum) in the UI; every other color comes from photography.
 * Contrast (WCAG AA), checked 9 Nov:
 *   ink #2A1E26 on porcelain #FBF7F4 15:1 · inkSecondary #7C6A73 on porcelain 4.7:1, on white 5.0:1
 *   (never secondary text on the sunken fill — 4.4:1) · porcelain on plum 10.5:1
 *   Home: white on roseFill #B5504E 5.0:1 · roseText #C45F5D 3.8:1 → large text (≥ 24pt) only;
 *   roseAccent #D9716F is for dots, rings and icons, never text. success #3E7457 on white 5.3:1.
 *   inkTertiary #9C8A92 3.0:1 → inactive/large only. Dark: ink 16:1, secondary 8.9:1.
 */

export const palette = {
  porcelain: '#FBF7F4',
  white: '#FFFFFF',
  sunken: '#F6EEE9',
  ink: '#2A1E26',
  inkSecondary: '#7C6A73',
  inkTertiary: '#9C8A92',
  plum: '#5B2A4A',
  onPlum: '#FBF7F4',
  blush: '#EBC9C4',
  blushDeep: '#E2B5B0',
  blushRow: '#FFFFFF',
  /** Gold means ONE thing: achievement (Unveil complete, Pro badge, milestones). */
  gold: '#C9A46A',
  champagne: '#C9A46A',
  // Rose — Home tab accents ("Discover Your Beauty").
  homeBg: '#FCF5F3',
  roseAccent: '#D9716F',
  roseText: '#C45F5D',
  roseFill: '#B5504E',
  roseTint: '#F7E4E0',
  heroTop: '#FBEDEA',
  heroBottom: '#F5DCD7',
  bannerFrom: '#F8D9D3',
  bannerTo: '#EFC1BA',
  // Blush wash for tab screens.
  washTop: '#F7E6E3',
  washMid: '#F9EEEB',
  washLow: '#FBF4F1',
  washEnd: '#FBF7F4',
  glowRose: '#EBC9C4',
  glowPetal: '#F2D6D1',
  // Night
  nightBg: '#16101A',
  nightSurface: '#201820',
  nightSunken: '#2A2028',
  nightInk: '#F6EEE9',
  nightSecondary: '#BFAEB6',
  nightTertiary: '#8E7E86',
  /** Shade swatches / product art only (never UI chrome). */
  peach: '#F6C9B4',
  rose: '#E8A5B5',
  lilac: '#CDB8E6',
} as const;

export interface ColorScheme {
  bg: string;
  /** Raised content (cards, list rows on blush). */
  surface: string;
  /** Sunken fills: chips, inputs, secondary buttons, product tiles. */
  surfaceAlt: string;
  /** Floating glass (tab bar, controls). */
  glass: string;
  glassOnPhoto: string;
  glassEdge: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  inkOnPrimary: string;
  inkOnPhoto: string;
  primary: string;
  /** Gold — achievement only, never text. */
  accent: string;
  gold: string;
  hairline: string;
  hairlineStrong: string;
  track: string;
  overlay: string;
  scrim: string;
  success: string;
  warningBg: string;
  warningInk: string;
  danger: string;
  shadow: string;
  /** Tint behind photos while they load. */
  mediaTint: string;
  wash: readonly [string, string, string, string];
  glowOpacity: number;
  blurTint: 'light' | 'dark';
  /** Rose accents (Home tab). */
  home: {
    bg: string;
    heroTop: string;
    heroBottom: string;
    accent: string;
    accentText: string;
    fill: string;
    onFill: string;
    tint: string;
    bannerFrom: string;
    bannerTo: string;
    card: string;
  };
}

export const light: ColorScheme = {
  bg: palette.porcelain,
  surface: palette.white,
  surfaceAlt: palette.sunken,
  glass: 'rgba(251,247,244,0.74)',
  glassOnPhoto: 'rgba(42,30,38,0.34)',
  glassEdge: 'rgba(255,255,255,0.38)',
  ink: palette.ink,
  inkSecondary: palette.inkSecondary,
  inkTertiary: palette.inkTertiary,
  inkOnPrimary: palette.onPlum,
  inkOnPhoto: palette.onPlum,
  primary: palette.plum,
  accent: palette.gold,
  gold: palette.gold,
  hairline: 'rgba(42,30,38,0.08)',
  hairlineStrong: 'rgba(42,30,38,0.16)',
  track: 'rgba(91,42,74,0.12)',
  overlay: 'rgba(42,30,38,0.38)',
  scrim: 'rgba(42,30,38,0.80)',
  success: '#3E7457',
  warningBg: '#FBEBD8',
  warningInk: '#7A4B00',
  danger: '#B3394B',
  shadow: '#5B2A4A',
  mediaTint: palette.blush,
  wash: [palette.washTop, palette.washMid, palette.washLow, palette.washEnd],
  glowOpacity: 1,
  blurTint: 'light',
  home: {
    bg: palette.homeBg,
    heroTop: palette.heroTop,
    heroBottom: palette.heroBottom,
    accent: palette.roseAccent,
    accentText: palette.roseText,
    fill: palette.roseFill,
    onFill: '#FFFFFF',
    tint: palette.roseTint,
    bannerFrom: palette.bannerFrom,
    bannerTo: palette.bannerTo,
    card: palette.white,
  },
};

export const dark: ColorScheme = {
  bg: palette.nightBg,
  surface: palette.nightSurface,
  surfaceAlt: palette.nightSunken,
  glass: 'rgba(32,24,32,0.78)',
  glassOnPhoto: 'rgba(20,14,18,0.40)',
  glassEdge: 'rgba(255,255,255,0.18)',
  ink: palette.nightInk,
  inkSecondary: palette.nightSecondary,
  inkTertiary: palette.nightTertiary,
  inkOnPrimary: '#3A1428',
  inkOnPhoto: palette.onPlum,
  primary: palette.blush,
  accent: '#D8B87E',
  gold: '#D8B87E',
  hairline: 'rgba(246,238,233,0.10)',
  hairlineStrong: 'rgba(246,238,233,0.20)',
  track: 'rgba(246,238,233,0.14)',
  overlay: 'rgba(0,0,0,0.55)',
  scrim: 'rgba(8,4,6,0.80)',
  success: '#8FD1AE',
  warningBg: '#3A2A10',
  warningInk: '#F5D28F',
  danger: '#F29AA8',
  shadow: '#000000',
  mediaTint: '#3A2A30',
  wash: ['#2A1A21', '#1E1418', '#19111A', palette.nightBg],
  glowOpacity: 0.45,
  blurTint: 'dark',
  home: {
    bg: palette.nightBg,
    heroTop: '#2A1A20',
    heroBottom: '#22161C',
    accent: '#F0A09D',
    accentText: '#F0A09D',
    fill: '#F0A09D',
    onFill: '#3A1414',
    tint: '#33222A',
    bannerFrom: '#3A2328',
    bannerTo: '#4A2A30',
    card: palette.nightSurface,
  },
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

/** One radius per size, continuous corners. */
export const radius = {
  chip: 10,
  thumb: 14,
  card: 20,
  sheet: 32,
  pill: 999,
} as const;

/** System sans (SF Pro on iOS) for all UI text; Cormorant Garamond only for display (≥ 28pt). */
const SYSTEM_SANS =
  Platform.OS === 'web'
    ? "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif"
    : Platform.OS === 'android'
      ? 'sans-serif'
      : 'System';

export const fonts = {
  serif: 'CormorantGaramond_500Medium',
  serifMedium: 'CormorantGaramond_500Medium',
  serifSemibold: 'CormorantGaramond_600SemiBold',
  serifItalic: 'CormorantGaramond_500Medium_Italic',
  sans: SYSTEM_SANS,
  sansMedium: SYSTEM_SANS,
  sansSemibold: SYSTEM_SANS,
  sansBold: SYSTEM_SANS,
} as const;

/** Type scale. Serif for display only, system sans for everything else. Sentence case. */
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 42, letterSpacing: -0.4 },
  title1: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, letterSpacing: -0.4 },
  title2: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.2 },
  /** Section titles (SF semibold, per the template). */
  title3: { fontFamily: fonts.sans, fontWeight: '600', fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  /** Follow-Along instruction. */
  step: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.sans, fontWeight: '600', fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.sans, fontWeight: '400', fontSize: 17, lineHeight: 24 },
  callout: { fontFamily: fonts.sans, fontWeight: '400', fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 15, lineHeight: 20 },
  footnote: { fontFamily: fonts.sans, fontWeight: '400', fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 12, lineHeight: 16 },
  /** UPPERCASE label above titles. */
  eyebrow: { fontFamily: fonts.sans, fontWeight: '600', fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  button: { fontFamily: fonts.sans, fontWeight: '600', fontSize: 17, lineHeight: 22 },
  tab: { fontFamily: fonts.sans, fontWeight: '500', fontSize: 10, lineHeight: 12, letterSpacing: 0.1 },
} as const;
export type TypeVariant = keyof typeof type;

/** Springs: critically damped by default; slight bounce only after a flick. */
export const motion = {
  /** Default: critically damped (damping ratio 1.0, response ≈ 0.35 s). Colour/opacity never bounce. */
  spring: { damping: 26, stiffness: 300, mass: 1 },
  /** Momentum / gesture (damping ratio ≈ 0.8) — only after a flick or for The Unveil. */
  flick: { damping: 20, stiffness: 260, mass: 1 },
  unveil: { damping: 15, stiffness: 140, mass: 1 },
  pressScale: 0.97,
  fast: 160,
  step: 250,
  slow: 400,
} as const;

export const layout = {
  tapMin: 44,
  /** Bigger targets for anything used at arm's length during makeup. */
  tapMirror: 64,
  buttonHeight: 56,
  maxContentWidth: 640,
  tabBarHeight: 64,
  /** Floating tab bar sits this far above the bottom safe area. */
  tabBarFloat: 10,
  /** Space tab screens leave at the bottom so content clears the floating tab bar. */
  tabBarSpace: 104,
} as const;

/** Soft, warm, rose-tinted shadow — floating layers only (tab bar, sticky bars), never content cards. */
export function softShadow(c: ColorScheme, strength: 'card' | 'raised' = 'card') {
  return {
    shadowColor: c.shadow,
    shadowOpacity: strength === 'card' ? 0.08 : 0.14,
    shadowRadius: strength === 'card' ? 18 : 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: strength === 'card' ? 2 : 6,
  } as const;
}

/** Image scrim (bottom of photos) — the only gradient allowed in UI chrome. */
export function scrimColors(c: ColorScheme): readonly [string, string] {
  return [c.scrim.replace(/[\d.]+\)$/, '0)'), c.scrim];
}

/** Kept for the before/after reveal only. */
export const signatureGradient = [palette.blush, palette.peach, palette.rose] as const;
