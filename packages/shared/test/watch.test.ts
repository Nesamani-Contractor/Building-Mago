import { framesWatchPrompt, routineFromAi, OWNER_PROMPT } from '../src/watch';

const base = { id: 'rt1', source: { platform: 'upload' as const, language: 'en' }, creator: { name: 'Your video' }, durationSec: 60 };

describe('routineFromAi (uploaded videos)', () => {
  it('builds a valid routine from a silent, visual-only answer', () => {
    const { routine, issues } = routineFromAi(
      {
        videoStyle: 'silent_visual',
        title: 'Soft glam eyes',
        category: 'Eyes',
        occasion: ['Date night'],
        difficulty: 'easy',
        totalTimeMin: '8',
        tags: ['Date Night'],
        products: [
          { ref: 'p1', name: 'warm brown matte eyeshadow', kind: 'palette', shadeHex: '#8a5a44', confidence: 0.5 },
          { ref: 'p2', name: 'Lash Paradise', brand: 'L’Oréal', kind: 'mascara', confidence: '0.9' },
        ],
        sections: [
          {
            name: 'Eyes',
            steps: [
              { text: 'Sweep the warm brown shadow into your crease.', timestampSec: 3, endTimestampSec: 12, productRefs: ['p1'] },
              { text: 'Deepen the outer corner with the same shade.', timestampSec: '13', productRefs: ['p1', 'ghost'] },
              { text: 'Coat top lashes with two layers of mascara.', amount: '2 coats', productRefs: ['p2'], waitSec: 0 },
            ],
          },
        ],
      },
      base,
    );
    expect(issues).toEqual([]);
    expect(routine.title).toBe('Soft glam eyes');
    expect(routine.totalTimeMin).toBe(8);
    expect(routine.sections[0]!.steps[1]!.timestampSec).toBe(13);
    expect(routine.sections[0]!.steps[1]!.productRefs).toEqual(['p1']); // unknown ref dropped
    expect(routine.sections[0]!.steps[2]!.waitSec).toBeUndefined();
    expect(routine.products[1]!.confidence).toBe(0.9);
  });

  it('falls back to safe values for unknown enums and reports too few steps', () => {
    const { routine, issues } = routineFromAi({ title: 'x', category: 'Nails', difficulty: 'pro', sections: [{ name: 'A', steps: [{ text: 'Do it.' }] }] }, base);
    expect(routine.category).toBe('Full look');
    expect(routine.difficulty).toBe('medium');
    expect(issues.some((i) => i.message.includes('at least'))).toBe(true);
  });
});

describe('framesWatchPrompt', () => {
  it('carries the owner prompt and covers all three kinds of video', () => {
    const p = framesWatchPrompt({ durationSec: 95, sheetCount: 6, framesPerSheet: 4 });
    expect(p).toContain(OWNER_PROMPT);
    expect(p).toContain('01:35');
    expect(p).toMatch(/silent_visual/);
    expect(p).toMatch(/on screen/);
    expect(p).toMatch(/No speech transcript/);
  });
});
