import { bagCategory, checkBag, combineScan, isSameProduct, mergeIntoBag, productRole, productUsage, type BagItem } from '../src/bag';
import { addToCart, cartUnits, setCartQty, MAX_QTY } from '../src/cart';
import type { ProductRef, Section } from '../src/routine';

let n = 0;
const id = () => `b${++n}`;
const NOW = '2026-11-13T00:00:00.000Z';

describe('bag: same product merges into a count', () => {
  it('adding the same lipstick twice gives one item with count 2', () => {
    const first = mergeIntoBag([], [{ name: 'Matte Lipstick', brand: 'MAC', shade: 'Ruby Woo', role: 'lipstick' }], NOW, id);
    const second = mergeIntoBag(first.items, [{ name: 'matte lipstick', brand: 'mac', shade: 'ruby woo', role: 'lipstick' }], NOW, id);
    expect(second.items).toHaveLength(1);
    expect(second.items[0]!.count).toBe(2);
    expect(second.added).toHaveLength(0);
    expect(second.merged[0]!.plus).toBe(1);
  });

  it('repeats inside one scan merge too, and counts add up', () => {
    const r = mergeIntoBag(
      [],
      [
        { name: 'Lash Paradise Mascara', brand: "L'Oréal", role: 'mascara', count: 2 },
        { name: 'Lash Paradise Mascara', brand: "L'Oréal", role: 'mascara' },
      ],
      NOW,
      id,
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.count).toBe(3);
    expect(r.added).toHaveLength(1);
    expect(r.added[0]!.count).toBe(3);
  });

  it('different shades or brands stay separate', () => {
    const a = { name: 'Matte Lipstick', brand: 'MAC', shade: 'Ruby Woo', role: 'lipstick' as const };
    expect(isSameProduct(a, { ...a, shade: 'Velvet Teddy' })).toBe(false);
    expect(isSameProduct(a, { ...a, brand: 'NARS' })).toBe(false);
    expect(isSameProduct(a, { ...a, name: 'Gloss', role: 'gloss' })).toBe(false);
  });

  it('fills in details the first copy was missing', () => {
    const first = mergeIntoBag([], [{ name: 'Brow Pencil', role: 'brow' }], NOW, id);
    const second = mergeIntoBag(first.items, [{ name: 'Brow Pencil', role: 'brow', shadeHex: '#5E3B2C', photoUri: 'file://x.jpg' }], NOW, id);
    expect(second.items[0]!.shadeHex).toBe('#5E3B2C');
    expect(second.items[0]!.photoUri).toBe('file://x.jpg');
  });
});

describe('bag check: quantity details', () => {
  const products: ProductRef[] = [
    { ref: 'p1', name: 'Matte Lipstick', confidence: 1, kind: 'lipstick' },
    { ref: 'p2', name: 'Volumizing Mascara', confidence: 1, kind: 'mascara' },
    { ref: 'p3', name: 'Cream Blush', confidence: 1 },
  ];
  const sections: Section[] = [
    { name: 'Lips', steps: [{ id: 's1', text: 'Line lips.', productRefs: ['p1'], amount: '1 swipe' }, { id: 's2', text: 'Fill in.', productRefs: ['p1'], amount: '2 coats' }] },
    { name: 'Eyes', steps: [{ id: 's3', text: 'Coat lashes.', productRefs: ['p2'] }] },
  ];
  const bag: BagItem[] = [
    { id: 'x1', name: 'Matte Lipstick', role: 'lipstick', count: 2, addedAt: NOW },
    { id: 'x2', name: 'Mascara', role: 'mascara', addedAt: NOW },
  ];

  it('reports how many she owns, how the look uses each product, and units in total', () => {
    const c = checkBag(products, bag, sections);
    const lip = c.matches.find((m) => m.product.ref === 'p1')!;
    expect(lip.status).toBe('have');
    expect(lip.ownedCount).toBe(2);
    expect(lip.usage).toEqual({ steps: 2, amounts: ['1 swipe', '2 coats'] });
    expect(c.needed).toBe(3);
    expect(c.ownedUnits).toBe(3);
    expect(c.matches.find((m) => m.product.ref === 'p3')!.ownedCount).toBeGreaterThanOrEqual(0);
  });

  it('usage is empty when the product is not in any step', () => {
    expect(productUsage(sections, 'p9')).toEqual({ steps: 0, amounts: [] });
  });
});

describe('cart', () => {
  it('adds, merges the same product, updates and removes', () => {
    let lines = addToCart([], [{ name: 'Cream Blush', brand: 'Rare', shade: 'Joy' }], NOW, id);
    lines = addToCart(lines, [{ name: 'cream blush', brand: 'rare', shade: 'joy', qty: 2 }, { name: 'Setting Spray' }], NOW, id);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.qty).toBe(3);
    expect(cartUnits(lines)).toBe(4);
    lines = setCartQty(lines, lines[0]!.id, 99);
    expect(lines[0]!.qty).toBe(MAX_QTY);
    lines = setCartQty(lines, lines[1]!.id, 0);
    expect(lines).toHaveLength(1);
  });
});

describe('scan: cluttered photos (D-26)', () => {
  it('counts a product seen in two photos once, keeping the best reading', () => {
    const out = combineScan([
      [
        { name: 'Sun Expert Ultra Matte Lotion', brand: 'Lakme', role: 'sunscreen' as const, count: 1, confidence: 0.95 },
        { name: 'Matte Lipstick', brand: 'MAC', shade: 'Ruby Woo', role: 'lipstick' as const, count: 2, confidence: 0.8 },
      ],
      [
        { name: 'Sun Expert Ultra Matte Lotion', brand: 'Lakme', role: 'sunscreen' as const, count: 1, confidence: 0.6 },
        { name: 'Raging Red', brand: 'wet n wild', shade: '563C Raging Red', role: 'lipstick' as const, count: 1, confidence: 0.9 },
      ],
    ]);
    expect(out).toHaveLength(3);
    const sun = out.find((o) => o.role === 'sunscreen')!;
    expect(sun.count).toBe(1);
    expect(sun.seenInPhotos).toBe(2);
    expect(sun.confidence).toBe(0.95);
    expect(out.find((o) => o.shade === 'Ruby Woo')!.count).toBe(2);
  });

  it('never merges different lipsticks just because one name contains the other', () => {
    type Read = { name: string; brand?: string; shadeHex?: string; role: 'lipstick'; confidence: number; count?: number };
    const out = combineScan<Read>([
      [
        { name: 'Holographic-cap lipstick', role: 'lipstick' as const, confidence: 0.4 },
        { name: 'Square black lipstick', role: 'lipstick' as const, confidence: 0.35 },
      ],
      [
        { name: 'Matte Lipstick', brand: 'MAC', shadeHex: '#B9786E', role: 'lipstick' as const, confidence: 0.6 },
        { name: 'Matte Lipstick', brand: 'MAC', shadeHex: '#9E1B32', role: 'lipstick' as const, confidence: 0.6 },
        { name: 'Lipstick', brand: 'MAC', role: 'lipstick' as const, confidence: 0.5 },
      ],
    ]);
    expect(out).toHaveLength(5);
    expect(out.every((o) => o.count === 1 && o.seenInPhotos === 1)).toBe(true);
  });

  it('sorts products into bag categories', () => {
    expect(bagCategory({ name: 'Bio-Oil Skincare Oil', role: 'skincare' })).toBe('Skincare');
    expect(bagCategory({ name: 'Eau de parfum' })).toBe('Fragrance');
    expect(bagCategory({ name: 'Prep + Prime Fix+', role: 'setting spray' })).toBe('Face');
    expect(bagCategory({ name: 'Liquid eyeliner' })).toBe('Eyes & brows');
    expect(productRole({ name: 'Liquid Sindoor' })).toBe('other');
    expect(bagCategory({ name: 'Sun Expert lotion SPF 30' })).toBe('Skincare');
  });
});
