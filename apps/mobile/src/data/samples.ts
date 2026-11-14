import type { Category, Difficulty, Occasion, ProductRef, Routine, Section } from '@mago/shared';

/**
 * Demo content. These are Mago-written sample routines, not taken from any creator's video.
 * In the live app, Discover is filled from the shared routine cache of public tutorials (PRD FR-DSC).
 */

type StepSpec = [text: string, products?: string[], hint?: string, waitSec?: number];

/** Approximate shades for the sample products (drives the product pictures). */
const SHADES: Record<string, string> = {
  'Skin-tint foundation': '#E3B796',
  'Skin tint': '#E6BC9C',
  Concealer: '#EFCDB0',
  'Peach corrector': '#F2B48F',
  'Long-wear foundation': '#DDAF8C',
  'Setting powder': '#F1DCC6',
  'Warm brown eyeshadow': '#9A6A4F',
  'Champagne shimmer': '#E9D3B0',
  'Transition eyeshadow': '#C9937A',
  'Deep brown eyeshadow': '#5E3B2C',
  'Lengthening mascara': '#1E1A1C',
  'Volumizing mascara': '#1E1A1C',
  'Liquid liner': '#1E1A1C',
  'Gel eyeliner': '#2A2224',
  'Rosy cream blush': '#D9808E',
  'Cream blush': '#E0918F',
  'Peach blush': '#F0A88A',
  Bronzer: '#B07A58',
  'Liquid highlighter': '#F3DEC2',
  'Lip liner': '#B9707A',
  'Pink lip liner': '#D78A97',
  'Pink-nude lipstick': '#C98583',
  'Sheer pink lipstick': '#E59AA8',
  'Long-wear lip color': '#A85461',
  'Clear gloss': '#F6E9EC',
  'Nude gloss': '#E3B3A6',
  'Tinted lip balm': '#DE9A9C',
  'Brow pencil': '#6B4A3A',
  'Brow gel': '#7A5A48',
  'Clear brow gel': '#EDE6E3',
  'Light moisturizer': '#F7F1EC',
  Moisturizer: '#F7F1EC',
};

/** Sample shade names + amounts (PRD FR-IMP-11: product list has shade; steps have quantity). */
const SHADE_NAMES: Record<string, string> = {
  'Skin-tint foundation': 'Warm Honey', 'Skin tint': 'Light Neutral', Concealer: 'Light Peach', 'Peach corrector': 'Soft Peach',
  'Long-wear foundation': 'Golden Beige', 'Setting powder': 'Translucent', 'Warm brown eyeshadow': 'Cinnamon Matte',
  'Champagne shimmer': 'Champagne Pop', 'Transition eyeshadow': 'Toasted Rose', 'Deep brown eyeshadow': 'Espresso',
  'Lengthening mascara': 'Blackest Black', 'Volumizing mascara': 'Blackest Black', 'Liquid liner': 'Jet Black', 'Gel eyeliner': 'Soft Black',
  'Rosy cream blush': 'Rose Petal', 'Cream blush': 'Warm Rose', 'Peach blush': 'Peach Glow', Bronzer: 'Sun Kissed',
  'Liquid highlighter': 'Champagne Glow', 'Lip liner': 'Dusty Rose', 'Pink lip liner': 'Ballet Pink', 'Pink-nude lipstick': 'Pink Nude',
  'Sheer pink lipstick': 'Sheer Rose', 'Long-wear lip color': 'Berry Satin', 'Clear gloss': 'Crystal Clear', 'Nude gloss': 'Rosy Nude',
  'Tinted lip balm': 'Rose Tint', 'Brow pencil': 'Soft Brown', 'Brow gel': 'Taupe', 'Clear brow gel': 'Clear',
};
const AMOUNTS: [RegExp, string][] = [
  [/moistur/i, 'Pea-size amount'], [/foundation|skin tint/i, '1–2 pumps'], [/conceal|corrector/i, '2–3 small dots'],
  [/powder/i, 'Light dusting'], [/shimmer/i, 'One fingertip press'], [/eyeshadow/i, 'One brush dip, tap off excess'],
  [/mascara/i, '2 coats'], [/liner/i, 'One thin stroke'], [/blush/i, 'One dab per cheek'], [/bronzer/i, 'One light sweep'],
  [/highlight/i, 'One drop'], [/gloss/i, 'One swipe'], [/lip/i, 'One coat'], [/brow/i, 'Light, hair-like strokes'],
];

function mk(
  id: string,
  title: string,
  category: Category,
  occasion: Occasion[],
  difficulty: Difficulty,
  totalTimeMin: number,
  sections: [string, StepSpec[]][],
  extra: { lowConfidence?: string[]; tags?: string[] } = {},
): Routine {
  const products = new Map<string, ProductRef>();
  let n = 0;
  const secs: Section[] = sections.map(([name, steps]) => ({
    name,
    steps: steps.map(([text, prods = [], hint, waitSec]) => {
      n += 1;
      const refs = prods.map((p) => {
        const ref = p.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!products.has(ref))
          products.set(ref, {
            ref,
            name: p,
            confidence: extra.lowConfidence?.includes(p) ? 0.45 : 0.9,
            shadeHex: SHADES[p],
            shade: SHADE_NAMES[p],
          });
        return ref;
      });
      return {
        id: `${id}-s${n}`,
        text,
        hint,
        waitSec,
        timestampSec: 20 + n * 38,
        endTimestampSec: 20 + n * 38 + 34,
        amount: prods.map((x) => AMOUNTS.find(([re]) => re.test(x))?.[1]).find(Boolean),
        productRefs: refs,
      };
    }),
  }));
  return {
    id,
    title,
    creator: { name: 'Mago sample' },
    source: { platform: 'manual', language: 'en' },
    totalTimeMin,
    category,
    occasion,
    difficulty,
    tags: extra.tags ?? [],
    sections: secs,
    products: [...products.values()],
  };
}

export const SAMPLE_ROUTINES: Routine[] = [
  mk(
    'sample-soft-glam',
    'Soft glam for date night',
    'Full look',
    ['Date night'],
    'medium',
    20,
    [
      [
        'Base',
        [
          ['Smooth on a light moisturizer and let it sink in.', ['Light moisturizer'], 'Tap Start timer, then give it a minute.', 60],
          ['Dot foundation on the center of your face, then blend outward with a damp sponge.', ['Skin-tint foundation', 'Damp sponge']],
          ['Tap concealer under your eyes and soften the edges.', ['Concealer'], 'Tap, don’t swipe.'],
        ],
      ],
      [
        'Eyes',
        [
          ['Sweep a soft brown shade into your crease with small circles.', ['Warm brown eyeshadow', 'Fluffy blending brush'], 'Build the color slowly — you can always add more.'],
          ['Press a shimmer shade onto the center of your lid with a fingertip.', ['Champagne shimmer']],
          ['Curl your lashes, then add two coats of mascara from root to tip.', ['Lash curler', 'Lengthening mascara'], 'Wiggle the wand at the roots.'],
        ],
      ],
      ['Cheeks', [['Smile and blend a rosy blush onto your cheeks, up toward your temples.', ['Rosy cream blush']]]],
      ['Lips', [['Line just at your lip edge, then fill in with a pink-nude lipstick.', ['Lip liner', 'Pink-nude lipstick']]]],
      ['Finish', [['Mist setting spray in an X and a T over your face.', ['Setting spray'], 'Hold the bottle an arm’s length away.']]],
    ],
    { lowConfidence: ['Pink-nude lipstick'], tags: ['glam', 'evening'] },
  ),
  mk(
    'sample-work-face',
    'Fresh, no-fuss work face',
    'Face/Base',
    ['Work', 'Everyday'],
    'easy',
    10,
    [
      ['Prep', [['Apply sunscreen all over and give it a minute to set.', ['SPF 50 sunscreen'], undefined, 60]]],
      [
        'Base',
        [
          ['Warm a skin tint between your fingers and press it into the center of your face.', ['Skin tint']],
          ['Spot-conceal only where you need it.', ['Concealer']],
        ],
      ],
      [
        'Finish',
        [
          ['Brush brows up with a clear gel.', ['Clear brow gel']],
          ['Tap a cream blush high on your cheeks.', ['Cream blush']],
          ['Swipe on a tinted balm.', ['Tinted lip balm']],
        ],
      ],
    ],
    { tags: ['quick', 'natural'] },
  ),
  mk(
    'sample-glossy-lips',
    'Glossy pink lips',
    'Lips',
    ['Everyday', 'Party'],
    'easy',
    5,
    [
      [
        'Lips',
        [
          ['Exfoliate gently with a lip scrub, then wipe clean.', ['Lip scrub']],
          ['Line your lips with a soft pink liner, slightly blurring the edge.', ['Pink lip liner']],
          ['Fill in the center with a sheer pink lipstick.', ['Sheer pink lipstick']],
          ['Add gloss to the center of both lips.', ['Clear gloss']],
        ],
      ],
    ],
  ),
  mk(
    'sample-five-min-brows',
    '5-minute brows',
    'Brows',
    ['Everyday', 'Work'],
    'easy',
    5,
    [
      [
        'Brows',
        [
          ['Brush brows straight up with a spoolie.', ['Spoolie']],
          ['Fill sparse spots with light, hair-like pencil strokes.', ['Brow pencil'], 'Start from the middle, not the front.'],
          ['Set everything in place with brow gel.', ['Brow gel']],
        ],
      ],
    ],
  ),
  mk(
    'sample-wedding-guest',
    'Long-wear wedding guest look',
    'Full look',
    ['Wedding/Event', 'Party'],
    'advanced',
    35,
    [
      [
        'Prep',
        [
          ['Apply a hydrating primer and let it settle.', ['Hydrating primer'], undefined, 90],
          ['Press a blurring primer over your T-zone.', ['Blurring primer']],
        ],
      ],
      [
        'Base',
        [
          ['Buff in a long-wear foundation in thin layers.', ['Long-wear foundation', 'Dense buffing brush']],
          ['Brighten under your eyes with a peach corrector, then concealer.', ['Peach corrector', 'Concealer']],
          ['Set under the eyes and T-zone with a fine powder.', ['Setting powder']],
        ],
      ],
      [
        'Eyes',
        [
          ['Blend a warm transition shade into your crease.', ['Transition eyeshadow']],
          ['Deepen the outer corner with a brown shade.', ['Deep brown eyeshadow']],
          ['Apply a thin liner along your upper lash line.', ['Gel eyeliner']],
          ['Add individual lashes to the outer corners.', ['Individual lashes', 'Lash glue'], 'Let the glue go tacky for 30 seconds first.', 30],
        ],
      ],
      [
        'Finish',
        [
          ['Sweep bronzer under your cheekbones.', ['Bronzer']],
          ['Line and fill lips with a long-wear formula.', ['Long-wear lip color']],
          ['Lock it in with setting spray.', ['Setting spray']],
        ],
      ],
    ],
    { lowConfidence: ['Long-wear lip color'] },
  ),
  mk(
    'sample-dewy-skin',
    'Dewy skin morning routine',
    'Skincare',
    ['Everyday'],
    'easy',
    8,
    [
      [
        'Skin',
        [
          ['Cleanse with lukewarm water and pat dry.', ['Gentle cleanser']],
          ['Pat on a hydrating toner with your palms.', ['Hydrating toner']],
          ['Apply a pea-size amount of moisturizer.', ['Moisturizer'], undefined, 60],
          ['Finish with sunscreen, two finger lengths.', ['SPF 50 sunscreen']],
        ],
      ],
    ],
  ),
  mk(
    'sample-party-liner',
    'Graphic liner for a night out',
    'Eyes',
    ['Party'],
    'advanced',
    15,
    [
      [
        'Eyes',
        [
          ['Prime your lids so the liner stays sharp.', ['Eyeshadow primer']],
          ['Map the wing with small dots from your lower lash line.', ['Liquid liner']],
          ['Connect the dots in one smooth stroke.', ['Liquid liner'], 'Rest your elbow on the table to steady your hand.'],
          ['Clean the edge with micellar water on a pointed swab.', ['Micellar water', 'Pointed swabs']],
          ['Add mascara to finish.', ['Volumizing mascara']],
        ],
      ],
    ],
  ),
  mk(
    'sample-sunkissed',
    'Sun-kissed bronze in 10 minutes',
    'Face/Base',
    ['Everyday', 'Date night'],
    'medium',
    10,
    [
      [
        'Face',
        [
          ['Even out skin with a light tint.', ['Skin tint']],
          ['Sweep bronzer where the sun naturally hits.', ['Bronzer', 'Fluffy brush']],
          ['Tap a peachy blush on top of the bronzer.', ['Peach blush']],
          ['Add a touch of highlight on your cheekbones.', ['Liquid highlighter']],
        ],
      ],
      ['Lips', [['Finish with a nude gloss.', ['Nude gloss']]]],
    ],
  ),
];

export const OCCASION_TILES: { occasion: Occasion; label: string }[] = [
  { occasion: 'Everyday', label: 'Everyday' },
  { occasion: 'Work', label: 'Work' },
  { occasion: 'Date night', label: 'Date night' },
  { occasion: 'Party', label: 'Party' },
  { occasion: 'Wedding/Event', label: 'Events' },
];
