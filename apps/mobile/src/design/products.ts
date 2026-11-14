
import { productKind, type ProductRef } from '@mago/shared';

/**
 * Studio product renders (D-22). Generated in Figma AI as unbranded 4K studio shots on porcelain,
 * one per product type and shade family. They stand in until a licensed retailer feed
 * (affiliate catalog with display rights) supplies the real brand photo via `imageUrl`.
 */
const R = {
  moisturizer: require('../../assets/products/moisturizer.jpg'),
  foundation: require('../../assets/products/foundation.jpg'),
  concealer: require('../../assets/products/concealer.jpg'),
  powder: require('../../assets/products/powder.jpg'),
  eyeshadow: require('../../assets/products/eyeshadow.jpg'),
  shimmer: require('../../assets/products/shimmer.jpg'),
  mascara: require('../../assets/products/mascara.jpg'),
  liner: require('../../assets/products/liner.jpg'),
  blush: require('../../assets/products/blush.jpg'),
  bronzer: require('../../assets/products/bronzer.jpg'),
  highlighter: require('../../assets/products/highlighter.jpg'),
  lipstick: require('../../assets/products/lipstick.jpg'),
  gloss: require('../../assets/products/gloss.jpg'),
  lipliner: require('../../assets/products/lipliner.jpg'),
  brow: require('../../assets/products/brow.jpg'),
  sponge: require('../../assets/products/sponge.jpg'),
} satisfies Record<string, number>;

export type RenderKey = keyof typeof R;

/** Name keywords → render. Order matters: most specific first. */
const RULES: [RegExp, RenderKey | null][] = [
  [/curler|tweezer|sharpener|mirror|tissue|cotton/i, null],
  [/lip ?liner|lip pencil/i, 'lipliner'],
  [/gloss|lip oil/i, 'gloss'],
  [/lipstick|lip colou?r|lip balm|tint(ed)? balm|lip/i, 'lipstick'],
  [/\bbrow(?!n)/i, 'brow'],
  [/mascara|lash/i, 'mascara'],
  [/liner|kohl/i, 'liner'],
  [/shimmer|glitter|metallic|topper/i, 'shimmer'],
  [/eye ?shadow|shadow|crease|palette/i, 'eyeshadow'],
  [/highlight|illuminat|strobe/i, 'highlighter'],
  [/bronz|contour/i, 'bronzer'],
  [/blush|cheek/i, 'blush'],
  [/conceal|corrector/i, 'concealer'],
  [/powder|setting/i, 'powder'],
  [/foundation|skin ?tint|tint|bb |cc |base/i, 'foundation'],
  [/moistur|cream|serum|primer|spf|sunscreen|skin/i, 'moisturizer'],
  [/sponge|blender|brush|tool/i, 'sponge'],
];

const BY_KIND: Partial<Record<ReturnType<typeof productKind>, RenderKey>> = {
  lipstick: 'lipstick',
  gloss: 'gloss',
  pencil: 'liner',
  mascara: 'mascara',
  palette: 'eyeshadow',
  sponge: 'sponge',
  bottle: 'foundation',
  tube: 'concealer',
  pot: 'moisturizer',
  brush: 'sponge',
};

/** True for makeup itself (has a shade or a render that isn't a tool) — these lead the step tile. */
export function isMakeup(p: Pick<ProductRef, 'name' | 'kind' | 'shadeHex'>): boolean {
  if (/curler|tweezer|sharpener|sponge|blender|brush|mirror|tissue|cotton/i.test(p.name)) return false;
  return !!p.shadeHex || !!productRender(p);
}

export function productRender(p: Pick<ProductRef, 'name' | 'kind'>): number | undefined {
  for (const [re, key] of RULES) if (re.test(p.name)) return key ? R[key] : undefined;
  const k = BY_KIND[productKind(p)];
  return k ? R[k] : undefined;
}
