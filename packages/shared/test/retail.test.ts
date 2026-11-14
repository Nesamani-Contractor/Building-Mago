import { cleanList, combineScan, cropBox, mergeIntoBag } from '../src/bag';
import { productQuery, retailerLink, retailersFor, RETAILERS, shoppingList } from '../src/retailers';

describe('retailers (D-28)', () => {
  it('US shoppers get Amazon, Macy’s, Sephora, Ulta, Target and Walmart', () => {
    expect(retailersFor('US').map((r) => r.id)).toEqual(['amazon', 'macys', 'sephora', 'ulta', 'target', 'walmart']);
    expect(retailersFor(undefined)[0]!.id).toBe('amazon');
  });
  it('UK shoppers get UK stores', () => {
    expect(retailersFor('GB').map((r) => r.id)).toContain('boots');
    expect(retailersFor('gb').every((r) => r.market === 'UK')).toBe(true);
  });
  it('searches brand + name + shade without repeating the brand', () => {
    expect(productQuery({ name: 'Matte Lipstick', brand: 'MAC', shade: 'Ruby Woo' })).toBe('MAC Matte Lipstick Ruby Woo');
    expect(productQuery({ name: 'MAC Studio Fix Fluid', brand: 'MAC' })).toBe('MAC Studio Fix Fluid');
  });
  it('every store link is https on the store’s own host, query encoded', () => {
    for (const r of RETAILERS) {
      const url = retailerLink(r, { name: 'Lip & Cheek', brand: 'Lakmé', shade: '#1 Red' });
      expect(url.startsWith(`https://${r.host}/`)).toBe(true);
      expect(url).not.toContain(' ');
      expect(url).not.toContain('#1');
    }
  });
  it('shopping list has quantities', () => {
    expect(shoppingList([{ name: 'Mascara', brand: 'Maybelline', qty: 2 }])).toBe('2 × Maybelline Mascara');
  });
});

describe('scan cut-outs and ingredients (D-28)', () => {
  it('accepts 0–1, 0–100 and 0–1000 boxes, pads and clamps them', () => {
    const a = cropBox([0.1, 0.2, 0.2, 0.3])!;
    expect(a[0]).toBeCloseTo(0.06);
    expect(cropBox([100, 200, 200, 300])![0]).toBeCloseTo(0.06);
    expect(cropBox([10, 20, 20, 30])![0]).toBeCloseTo(0.06);
    expect(cropBox([0.9, 0.9, 0.5, 0.5])![2]).toBeCloseTo(0.14);
  });
  it('rejects junk and whole-photo boxes', () => {
    expect(cropBox(null)).toBeNull();
    expect(cropBox([0, 0, 1, 1])).toBeNull();
    expect(cropBox(['a', 0, 1, 1])).toBeNull();
    expect(cropBox([0.2, 0.2, 0, 0.3])).toBeNull();
  });
  it('cleans ingredient lists', () => {
    expect(cleanList(['Glycerin', 'glycerin', 3, ' Adenosine '], 6)).toEqual(['Glycerin', 'Adenosine']);
    expect(cleanList('x', 6)).toBeUndefined();
  });
  it('keeps each product’s own picture and ingredients when merging', () => {
    const c = combineScan([[{ name: 'Studio Fix Fluid', brand: 'MAC', role: 'foundation', photoUri: 'crop1', ingredients: ['Titanium Dioxide'] }], [{ name: 'Studio Fix Fluid', brand: 'MAC', role: 'foundation', confidence: 0.9 }]]);
    expect(c).toHaveLength(1);
    expect(c[0]!.photoUri).toBe('crop1');
    expect(c[0]!.ingredients).toEqual(['Titanium Dioxide']);
    const m = mergeIntoBag([{ id: 'x', name: 'Studio Fix Fluid', brand: 'MAC', role: 'foundation', addedAt: 'n' }], [{ name: 'Studio Fix Fluid', brand: 'MAC', role: 'foundation', ingredients: ['Glycerin'] }], 'n', () => 'y');
    expect(m.items[0]!.ingredients).toEqual(['Glycerin']);
  });
});
