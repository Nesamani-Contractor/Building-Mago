/**
 * Mago design tokens — "Rose" (decision D-20, 9 Nov 2026; replaces Warm luxury A / D-13).
 * Spec: owner's rose reference UI + the "Rose · Home hero" board in "Mago — Top 5 screens".
 * Screens must use these tokens; no hard-coded colors, sizes, radii or durations in screens.
 *
 * Contrast (WCAG AA), checked:
 *   ink #2A1E1D on blush #FCF5F3 ≈ 15:1
 *   inkSecondary #7A6461 on blush ≈ 5.1:1, on white ≈ 5.5:1 (the spec's #8A7673 was 4.0:1, so darkened)
 *   white on roseButton #B5504E ≈ 5.0:1 — every filled rose button/pill uses roseButton, not #D9716F
 *   roseText #A84846 on blush ≈ 5.3:1 — small rose text ("See all")
 *   roseDeep #C45F5D ≈ 3.8:1 — ONLY for large text (the second line of serif heroes, 24pt+)
 *   rose #D9716F is NEVER text — dots, selection rings, swatches, progress, icons only.
 *   dark: ink #F8EEEC on #1C1414 ≈ 16:1 · inkSecondary #C4AFAC ≈ 8.7:1 · plum ink on #E58A87 ≈ 6.4:1
 */

export const palette = {
  blush: '#FCF5F3',
  /** Top-of-screen hero gradient stops. */
  blushTop: '#FBEDEA',
  blushMid: '#F5DCD7',
  /** Chips, circles, image wells. */
  petal: '#F7E4E0',
  /** Tag / pill fill. */
  petalSoft: '#F3D3CE',
  /** Promo banner gradient stops. */
  bannerA: '#F8D9D3',
  bannerB: '#EFC1BA',
  rose: '#D9716F',
  roseDeep: '#C45F5D',
  roseButton: '#B5504E',
  roseText: '#A84846',
  ink: '#2A1E1D',
  inkSecondary: '#7A6461',
  divider: '#EFE2DF',
  star: '#E8A13A',
  white: '#FFFFFF',
  nightBg: '#1C1414',
  nightSurface: '#271C1C',
  nightInk: '#F8EEEC',
  nightSecondary: '#C4AFAC',
  nightRose: '#E58A87',
  /** Follow-Along stage (deep rose so white controls stay readable). */
  stageTop: '#D48C87',
  stageBottom: '#9E5653',
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
  /** Rose accent: dots, rings, progress, active icons. Never body text. */
  accent: string;
  /** Rose for small text links. */
  accentText: string;
  /** Large serif accent line (24pt+ only). */
  accentDisplay: string;
  /** Soft rose fill for chips, wells, selected states. */
  tint: string;
  tintStrong: string;
  hairline: string;
  hairlineStrong: string;
  track: string;
  overlay: string;
  success: string;
  warningBg: string;
  warningInk: string;
  danger: string;
  star: string;
  shadow: string;
  heroGradient: readonly [string, string, string];
  bannerGradient: readonly [string, string];
  glowOpacity: number;
  blurTint: 'light' | 'dark';
}

export const light: ColorScheme = {
  bg: palette.blush,
  surface: palette.white,
  surfaceAlt: palette.petal,
  glass: 'rgba(255,255,255,0.82)',
  ink: palette.ink,
  inkSecondary: palette.inkSecondary,
  inkOnPrimary: palette.white,
  primary: palette.roseButton,
  accent: palette.rose,
  accentText: palette.roseText,
  accentDisplay: palette.roseDeep,
  tint: palette.petal,
  tintStrong: palette.petalSoft,
  hairline: palette.divider,
  hairlineStrong: '#E6D2CE',
  track: 'rgba(42,30,29,0.08)',
  overlay: 'rgba(42,30,29,0.38)',
  success: '#2F6B4F',
  warningBg: '#FFF1D6',
  warningInk: '#7A4B00',
  danger: '#A0283C',
  star: palette.star,
  shadow: '#965A55',
  heroGradient: [palette.blushTop, palette.blushMid, 'rgba(252,245,243,0)'],
  bannerGradient: [palette.bannerA, palette.bannerB],
  glowOpacity: 1,
  blurTint: 'light',
};

export const dark: ColorScheme = {
  bg: palette.nightBg,
  surface: palette.nightSurface,
  surfaceAlt: '#332424',
  glass: 'rgba(39,28,28,0.82)',
  ink: palette.nightInk,
  inkSecondary: palette.nightSecondary,
  inkOnPrimary: palette.ink,
  primary: palette.nightRose,
  accent: palette.nightRose,
  accentText: palette.nightRose,
  accentDisplay: palette.nightRose,
  tint: '#3A2929',
  tintStrong: '#4A3333',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.16)',
  track: 'rgba(255,255,255,0.10)',
  overlay: 'rgba(0,0,0,0.55)',
  success: '#8FD1AE',
  warningBg: '#3A2A10',
  warningInk: '#F5D28F',
  danger: '#F29AA8',
  star: palette.star,
  shadow: '#000000',
  heroGradient: ['#2E1F1F', '#241919', 'rgba(28,20,20,0)'],
  bannerGradient: ['#3A2828', '#4A2E2E'],
  glowOpacity: 0.5,
  blurTint: 'dark',
};

/** 4-pt base grid (8-pt rhythm for layout). */
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

/** Rose spec: cards 16, images 14, chips + buttons pill, sheets 24. */
export const radius = {
  chip: 999,
  thumb: 14,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  serifMedium: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  /** Handwritten — only for the stylist's note. */
  hand: 'Caveat_500Medium',
} as const;

/** Type scale. DM Serif Display for headlines, Inter for everything else. Sentence case everywhere. */
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, letterSpacing: -0.3 },
  title1: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.3 },
  title2: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, letterSpacing: -0.2 },
  title3: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, letterSpacing: -0.1 },
  /** Follow-Along step text — read at arm's length. */
  step: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 34, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.sansSemibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  subhead: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20 },
  footnote: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  button: { fontFamily: fonts.sansSemibold, fontSize: 16, lineHeight: 20, letterSpacing: 0.1 },
  tab: { fontFamily: fonts.sansMedium, fontSize: 10, lineHeight: 12 },
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
  screenPadding: 20,
  sectionGap: 24,
  tapMin: 44,
  /** Bigger targets for anything used at arm's length during makeup. */
  tapMirror: 64,
  buttonHeight: 52,
  /** Small rose pill (card actions). */
  pillSmall: 32,
  searchHeight: 48,
  iconButton: 36,
  categoryCircle: 56,
  maxContentWidth: 640,
  tabBarHeight: 64,
  /** Space tab screens leave at the bottom so content clears the tab bar. */
  tabBarSpace: 104,
} as const;

/** Very soft rose-tinted shadow (spec: 0 4 16 rgba(150,90,85,0.08)). Never grey, never hard. */
export function softShadow(c: ColorScheme, strength: 'card' | 'raised' = 'card') {
  return {
    shadowColor: c.shadow,
    shadowOpacity: strength === 'card' ? 0.08 : 0.16,
    shadowRadius: strength === 'card' ? 16 : 20,
    shadowOffset: { width: 0, height: strength === 'card' ? 4 : 8 },
    elevation: strength === 'card' ? 2 : 6,
  } as const;
}

/** Full-strength gradient — streak ring, before/after reveal, paywall header, share card. */
export const signatureGradient = [palette.bannerA, palette.bannerB, palette.rose] as const;
