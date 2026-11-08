import {
  normalizeLink,
  extractFirstUrl,
  validateRoutine,
  simplifyRoutine,
  allSteps,
  computeStreak,
  canUseFreeze,
  earnedBadges,
  nextBadge,
  checkConversionQuota,
  weekKey,
  sanitizeProps,
  productKind,
  pickReadAloudVoice,
  rankVoices,
  isLikelyMale,
  type Routine,
} from '../src';

describe('normalizeLink', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'youtube:dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'youtube:dQw4w9WgXcQ'],
    ['youtube.com/shorts/dQw4w9WgXcQ', 'youtube:dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube:dQw4w9WgXcQ'],
    ['https://www.tiktok.com/@glow/video/7234567890123456789?lang=en', 'tiktok:7234567890123456789'],
    ['https://www.instagram.com/reel/C1aBcDeFgHi/?igsh=x', 'instagram:C1aBcDeFgHi'],
    ['Check this look! https://youtu.be/dQw4w9WgXcQ so pretty', 'youtube:dQw4w9WgXcQ'],
  ])('accepts %s', (input, key) => {
    const r = normalizeLink(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.link.canonicalKey).toBe(key);
  });

  it.each([
    ['', 'empty'],
    ['https://evil.example.com/watch?v=dQw4w9WgXcQ', 'host_not_allowed'],
    ['https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'host_not_allowed'],
    ['http://169.254.169.254/latest/meta-data', 'host_not_allowed'],
    ['https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ', 'credentials_in_url'],
    ['https://www.youtube.com:8080/watch?v=dQw4w9WgXcQ', 'host_not_allowed'],
    ['https://www.youtube.com/watch?v=short', 'unsupported_path'],
    ['https://www.youtube.com/@channel', 'unsupported_path'],
    ['https://vm.tiktok.com/ZMabc123/', 'short_link_needs_resolution'],
    ['file:///etc/passwd', 'not_https'],
    ['javascript:alert(1)', 'not_a_url'],
  ])('rejects %s', (input, error) => {
    const r = normalizeLink(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(error);
  });

  it('rebuilds a clean canonical URL instead of keeping the raw one', () => {
    const r = normalizeLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=XYZ&redirect=http://evil');
    expect(r.ok && r.link.canonicalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('extracts the first URL from shared text', () => {
    expect(extractFirstUrl('see https://youtu.be/dQw4w9WgXcQ.')).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(extractFirstUrl('no link here')).toBeNull();
  });
});

function sample(stepCount = 9): Routine {
  const steps = Array.from({ length: stepCount }, (_, i) => ({
    id: `s${i + 1}`,
    text: `Step number ${i + 1} does something lovely`,
    productRefs: i % 2 === 0 ? ['p1'] : [],
  }));
  return {
    id: 'r1',
    title: 'Soft glam',
    source: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', language: 'en' },
    totalTimeMin: 20,
    category: 'Full look',
    occasion: ['Date night'],
    difficulty: 'medium',
    tags: [],
    sections: [
      { name: 'Base', steps: steps.slice(0, 3) },
      { name: 'Eyes', steps: steps.slice(3, 6) },
      { name: 'Lips', steps: steps.slice(6) },
    ],
    products: [{ ref: 'p1', name: 'Blush', confidence: 0.9 }],
  };
}

describe('validateRoutine', () => {
  it('accepts a valid routine', () => {
    expect(validateRoutine(sample())).toEqual([]);
  });
  it('rejects too few steps, long steps, bad lists and unknown products', () => {
    const r = sample(2);
    r.category = 'Nails' as never;
    r.occasion = ['Brunch' as never];
    r.sections[0]!.steps[0]!.text = Array(30).fill('word').join(' ');
    r.sections[0]!.steps[0]!.productRefs = ['nope'];
    const messages = validateRoutine(r).map((i) => i.message).join(' | ');
    expect(messages).toMatch(/at least 3 steps/);
    expect(messages).toMatch(/Unknown category/);
    expect(messages).toMatch(/Unknown occasion/);
    expect(messages).toMatch(/30 words/);
    expect(messages).toMatch(/Unknown product ref/);
  });
});

describe('simplifyRoutine', () => {
  it('keeps at most 60% of steps, at least 3, and stays valid', () => {
    const s = simplifyRoutine(sample(10), 'r1-simple');
    expect(allSteps(s).length).toBe(6);
    expect(s.variantOf).toBe('r1');
    expect(validateRoutine(s)).toEqual([]);
    expect(s.sections.map((x) => x.name)).toEqual(['Base', 'Eyes', 'Lips']);
  });
  it('never drops below 3 steps', () => {
    expect(allSteps(simplifyRoutine(sample(4), 'x')).length).toBe(3);
  });
});

describe('weekly streaks', () => {
  const wed = new Date(2026, 10, 11); // Wed 11 Nov 2026
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 9);

  it('weeks start on Monday', () => {
    expect(weekKey(new Date(2026, 10, 15))).toBe('2026-11-09'); // Sunday → Monday 9th
    expect(weekKey(new Date(2026, 10, 9))).toBe('2026-11-09');
  });

  it('counts consecutive met weeks and includes this week only when met', () => {
    const s = computeStreak({
      completions: [d(2026, 10, 27), d(2026, 11, 3), d(2026, 11, 10), d(2026, 11, 11)],
      weeklyGoal: 1,
      frozenWeeks: [],
      now: wed,
    });
    expect(s.thisWeekCount).toBe(2);
    expect(s.thisWeekMet).toBe(true);
    expect(s.streakWeeks).toBe(3);
  });

  it('a freeze bridges a missed week; a miss without freeze ends it', () => {
    const base = { completions: [d(2026, 10, 20), d(2026, 11, 3)], weeklyGoal: 1, now: wed };
    expect(computeStreak({ ...base, frozenWeeks: [] }).streakWeeks).toBe(1);
    expect(computeStreak({ ...base, frozenWeeks: ['2026-10-26'] }).streakWeeks).toBe(2);
  });

  it('nudges once with two days left when unmet', () => {
    const sat = new Date(2026, 10, 14);
    expect(computeStreak({ completions: [], weeklyGoal: 2, frozenWeeks: [], now: sat }).shouldNudge).toBe(true);
    expect(computeStreak({ completions: [], weeklyGoal: 2, frozenWeeks: [], now: wed }).shouldNudge).toBe(false);
  });

  it('one freeze per calendar month', () => {
    expect(canUseFreeze(['2026-11-02'], wed)).toBe(false);
    expect(canUseFreeze(['2026-10-26'], wed)).toBe(true);
  });

  it('badges', () => {
    expect(earnedBadges(12)).toEqual([1, 5, 10]);
    expect(nextBadge(12)).toBe(25);
    expect(nextBadge(500)).toBeNull();
  });
});

describe('quota', () => {
  it('free users get 5 new conversions a month', () => {
    const now = new Date(2026, 10, 8);
    expect(checkConversionQuota(4, false, now).allowed).toBe(true);
    const q = checkConversionQuota(5, false, now);
    expect(q.allowed).toBe(false);
    expect(q.refreshesOn).toBe('2026-12-01');
    expect(checkConversionQuota(149, true, now).allowed).toBe(true);
    expect(checkConversionQuota(150, true, now).allowed).toBe(false);
  });
});

describe('analytics sanitising', () => {
  it('drops personal fields and URLs', () => {
    expect(sanitizeProps({ adapter: 'youtube', url: 'x', note: 'hi', link: 'https://a.b', step: 3 })).toEqual({
      adapter: 'youtube',
      step: 3,
    });
  });
});

describe('product pictures', () => {
  it.each([
    ['Pink-nude lipstick', 'lipstick'],
    ['Clear gloss', 'gloss'],
    ['Brow pencil', 'pencil'],
    ['Lengthening mascara', 'mascara'],
    ['Warm brown eyeshadow', 'palette'],
    ['Fluffy blending brush', 'brush'],
    ['Damp sponge', 'sponge'],
    ['Setting spray', 'spray'],
    ['Rosy cream blush', 'pot'],
    ['SPF 50 sunscreen', 'tube'],
    ['Skin-tint foundation', 'bottle'],
    ['Lash curler', 'tool'],
  ])('%s → %s', (name, kind) => {
    expect(productKind({ name })).toBe(kind);
  });
  it('an explicit kind wins, and bad shades are rejected', () => {
    expect(productKind({ name: 'Mystery', kind: 'pot' })).toBe('pot');
    const r = sample();
    r.products[0]!.shadeHex = 'pink';
    expect(validateRoutine(r).map((i) => i.message)).toContain('Shade must be a #RRGGBB color');
  });
});

describe('read-aloud voice', () => {
  const v = (name: string, language = 'en-US', identifier = name, quality = 'Default') => ({ name, language, identifier, quality });
  const ios = [
    v('Fred', 'en-US', 'com.apple.speech.synthesis.voice.Fred'),
    v('Daniel', 'en-GB', 'com.apple.voice.compact.en-GB.Daniel'),
    v('Samantha', 'en-US', 'com.apple.voice.compact.en-US.Samantha'),
    v('Ava (Premium)', 'en-US', 'com.apple.voice.premium.en-US.Ava', 'Enhanced'),
    v('Thomas', 'fr-FR', 'com.apple.voice.compact.fr-FR.Thomas'),
  ];
  it('prefers a premium female English voice on iOS', () => {
    expect(pickReadAloudVoice(ios)?.name).toBe('Ava (Premium)');
  });
  it('never picks known male voices', () => {
    expect(rankVoices(ios).map((x) => x.name)).not.toContain('Fred');
    expect(rankVoices(ios).map((x) => x.name)).not.toContain('Daniel');
    expect(isLikelyMale(v('Google UK English Male', 'en-GB'))).toBe(true);
    expect(isLikelyMale(v('Google UK English Female', 'en-GB'))).toBe(false);
  });
  it('picks a female voice on web/Android', () => {
    const web = [v('Microsoft Guy Online (Natural)'), v('Microsoft Aria Online (Natural)'), v('Google UK English Male', 'en-GB')];
    expect(pickReadAloudVoice(web)?.name).toBe('Microsoft Aria Online (Natural)');
    const android = [v('en-us-x-iom-local'), v('en-us-x-sfg-local'), v('en-us-x-tpd-network')];
    expect(pickReadAloudVoice(android)?.name).toBe('en-us-x-sfg-local');
  });
  it('honours the user’s choice and falls back to system default when nothing fits', () => {
    expect(pickReadAloudVoice(ios, 'com.apple.voice.compact.en-US.Samantha')?.name).toBe('Samantha');
    expect(pickReadAloudVoice([v('Fred')])).toBeUndefined();
  });
});

import { checkBag, productRole, shadeDistance, type BagItem } from '../src';

describe('makeup bag check', () => {
  const item = (name: string, shadeHex?: string): BagItem => ({ id: name, name, shadeHex, addedAt: '2026-11-08' });
  const prod = (name: string, shadeHex?: string) => ({ ref: name, name, confidence: 0.9, shadeHex });

  it('infers roles from names', () => {
    expect(productRole({ name: 'Rosy cream blush' })).toBe('blush');
    expect(productRole({ name: 'Gel eyeliner' })).toBe('eyeliner');
    expect(productRole({ name: 'Lash curler' })).toBe('tool');
    expect(productRole({ name: 'Skin-tint foundation' })).toBe('foundation');
    expect(productRole({ name: 'Setting spray' })).toBe('setting spray');
    expect(productRole({ name: 'Matte brown eyeshadow' })).toBe('eyeshadow');
    expect(productRole({ name: 'Brow pencil' })).toBe('brow');
  });

  it('have / swap / missing', () => {
    const bag = [item('Fenty concealer', '#EFCDB0'), item('Matte brown eyeshadow', '#8A5A40'), item('Ruby lipstick', '#9E1B32'), item('Mascara')];
    const r = checkBag(
      [prod('Concealer', '#EECBAE'), prod('Lengthening mascara', '#1E1A1C'), prod('Gel eyeliner', '#1E1A1C'), prod('Rosy cream blush', '#D9808E'), prod('Setting spray'), prod('Highlighter')],
      bag,
    );
    const by = Object.fromEntries(r.matches.map((m) => [m.product.name, m]));
    expect(by['Concealer']!.status).toBe('have');
    expect(by['Lengthening mascara']!.status).toBe('have');
    expect(by['Gel eyeliner']!.status).toBe('swap');
    expect(by['Gel eyeliner']!.item!.name).toBe('Matte brown eyeshadow');
    expect(by['Rosy cream blush']!.status).toBe('swap');
    expect(by['Rosy cream blush']!.item!.name).toBe('Ruby lipstick');
    expect(by['Setting spray']!.status).toBe('missing');
    expect(r.have).toBe(2);
    expect(by['Highlighter']!.status).toBe('swap');
    expect(r.missing).toBe(1);
  });

  it('a very different shade of the same thing is a swap, not a match', () => {
    const r = checkBag([prod('Pink-nude lipstick', '#C98583')], [item('Black lipstick', '#111111')]);
    expect(r.matches[0]!.status).toBe('swap');
  });

  it('brushes and sponges fall back to fingertips', () => {
    expect(checkBag([prod('Damp sponge')], []).matches[0]!.status).toBe('swap');
  });

  it('shade distance', () => {
    expect(shadeDistance('#FFFFFF', '#FFFFFF')).toBe(0);
    expect(shadeDistance('#000000', '#FFFFFF')).toBeGreaterThan(700);
    expect(shadeDistance(undefined, '#FFFFFF')).toBe(Number.POSITIVE_INFINITY);
  });
});
