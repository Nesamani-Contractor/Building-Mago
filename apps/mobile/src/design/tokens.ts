import { Platform } from 'react-native';

/**
 * Mago design tokens — "Luxury v2 · A · Porter editorial" (decision D-20, 8 Nov 2026).
 * Replaces Warm luxury A (D-13). Screens must use these tokens; no hard-coded colors, sizes,
 * radii or durations in screens.
 *
 * One strong color (Plum) in the UI; every other color comes from photography.
 * Contrast (WCAG AA), checked:
 *   ink #1F1418 on porcelain #FAF7F4 ≈ 17:1 · on blush #FBE7E9 ≈ 15:1
 *   inkSecondary #6B5A60 on porcelain ≈ 6.4:1 · on blush ≈ 5.6:1
 *   onPrimary #FFF8F4 on plum #4A1F35 ≈ 13:1
 *   champagne #B8956A is NEVER text — progress, selected marks and one detail per screen only.
 *   dark: ink #F6EEE9 on #140E11 ≈ 17:1 · inkSecondary #BBA9B0 ≈ 8.6:1
 */

export const palette = {
  porcelain: '#FAF7F4',
  white: '#FFFFFF',
  sunken: '#F2ECE7',
  ink: '#1F1418',
  inkSecondary: '#6B5A60',
  inkTertiary: '#9C8D92',
  plum: '#4A1F35',
  onPlum: '#FFF8F4',
  champagne: '#B8956A',
  blush: '#FBE7E9',
  blushDeep: '#F1CCD3',
  blushRow: '#FFF7F7',
  // Blush background wash (Today and tab screens).
  washTop: '#F6D9DE',
  washMid: '#F9E4E6',
  washLow: '#FCEFEE',
  washEnd: '#FDF6F3',
  glowRose: '#EAB2C0',
  glowPetal: '#F4C8CE',
  // Night
  nightBg: '#140E11',
  nightSurface: '#1E161A',
  nightSunken: '#271D22',
  nightInk: '#F6EEE9',
  nightSecondary: '#BBA9B0',
  nightTertiary: '#8C7C82',
  /** Kept for type art and shade swatches only (never UI chrome). */
  peach: '#F6C9B4',
  rose: '#E8A5B5',
  lilac: '#CDB8E6',
  gold: '#B8956A',
} as const;

export interface ColorScheme {
  bg: string;
  /** Raised content (sheets, list rows on blush). */
  surface: string;
  /** Sunken fills: chips, inputs, secondary buttons, product tiles. */
  surfaceAlt: string;
  /** Floating glass (tab bar, buttons over photos). */
  glass: string;
  glassOnPhoto: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  inkOnPrimary: string;
  inkOnPhoto: string;
  primary: string;
  /** Champagne — decoration only, never text. */
  accent: string;
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
}

export const light: ColorScheme = {
  bg: palette.porcelain,
  surface: palette.blushRow,
  surfaceAlt: palette.sunken,
  glass: 'rgba(255,244,246,0.82)',
  glassOnPhoto: 'rgba(20,14,16,0.42)',
  ink: palette.ink,
  inkSecondary: palette.inkSecondary,
  inkTertiary: palette.inkTertiary,
  inkOnPrimary: palette.onPlum,
  inkOnPhoto: palette.onPlum,
  primary: palette.plum,
  accent: palette.champagne,
  hairline: 'rgba(31,20,24,0.08)',
  hairlineStrong: 'rgba(31,20,24,0.16)',
  track: 'rgba(74,31,53,0.12)',
  overlay: 'rgba(31,20,24,0.38)',
  scrim: 'rgba(20,10,14,0.72)',
  success: '#2F6B4F',
  warningBg: '#FBEBD8',
  warningInk: '#7A4B00',
  danger: '#A23B3B',
  shadow: '#964060',
  mediaTint: palette.blushDeep,
  wash: [palette.washTop, palette.washMid, palette.washLow, palette.washEnd],
  glowOpacity: 1,
  blurTint: 'light',
};

export const dark: ColorScheme = {
  bg: palette.nightBg,
  surface: palette.nightSurface,
  surfaceAlt: palette.nightSunken,
  glass: 'rgba(30,22,26,0.80)',
  glassOnPhoto: 'rgba(20,14,16,0.50)',
  ink: palette.nightInk,
  inkSecondary: palette.nightSecondary,
  inkTertiary: palette.nightTertiary,
  inkOnPrimary: '#3A1428',
  inkOnPhoto: palette.onPlum,
  primary: palette.blushDeep,
  accent: '#D4B48C',
  hairline: 'rgba(246,238,233,0.10)',
  hairlineStrong: 'rgba(246,238,233,0.20)',
  track: 'rgba(246,238,233,0.14)',
  overlay: 'rgba(0,0,0,0.55)',
  scrim: 'rgba(8,4,6,0.78)',
  success: '#8FD1AE',
  warningBg: '#3A2A10',
  warningInk: '#F5D28F',
  danger: '#F29AA8',
  shadow: '#000000',
  mediaTint: '#3A2A30',
  wash: ['#2A1A21', '#1E1418', '#170F13', palette.nightBg],
  glowOpacity: 0.45,
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

/** One radius per size, continuous corners. */
export const radius = {
  chip: 10,
  thumb: 16,
  card: 24,
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
  spring: { damping: 26, stiffness: 300, mass: 1 },
  flick: { damping: 20, stiffness: 260, mass: 1 },
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
