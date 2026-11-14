/**
 * My cart (D-25): products she wants to buy — usually the ones a look needs that aren't in her bag.
 * Pure rules shared by app and server: one line per product (same product → quantity goes up),
 * quantities 1–MAX_QTY, removing at 0.
 */
import type { ProductKind } from './routine';
import type { ProductRole } from './bag';

export const MAX_QTY = 10;

export interface CartLine {
  id: string;
  /** Same product = same key (brand + name + shade, lower-cased). */
  key: string;
  name: string;
  brand?: string;
  shade?: string;
  shadeHex?: string;
  kind?: ProductKind;
  role?: ProductRole;
  qty: number;
  /** The look she added it from, for "For: Soft glam for date night". */
  forLook?: { id: string; title: string };
  addedAt: string;
}

export type CartAdd = Omit<CartLine, 'id' | 'key' | 'qty' | 'addedAt'> & { qty?: number };

const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function cartKey(p: { name: string; brand?: string; shade?: string; shadeHex?: string }): string {
  return [norm(p.brand), norm(p.name), norm(p.shade) || (p.shadeHex ?? '').toLowerCase()].join('|');
}

const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.round(n)));

/** Add one or many products; the same product raises its quantity instead of adding a line. */
export function addToCart(lines: CartLine[], adds: CartAdd[], now: string, makeId: () => string): CartLine[] {
  const out = [...lines];
  for (const a of adds) {
    const key = cartKey(a);
    const i = out.findIndex((l) => l.key === key);
    if (i >= 0) out[i] = { ...out[i]!, qty: clampQty(out[i]!.qty + (a.qty ?? 1)) };
    else out.push({ ...a, id: makeId(), key, qty: clampQty(a.qty ?? 1), addedAt: now });
  }
  return out;
}

/** Change a line's quantity; 0 or less removes it. */
export function setCartQty(lines: CartLine[], id: string, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((l) => l.id !== id);
  return lines.map((l) => (l.id === id ? { ...l, qty: clampQty(qty) } : l));
}

/** Total units (2 × lipstick + 1 × mascara = 3). */
export function cartUnits(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export function inCart(lines: CartLine[], p: { name: string; brand?: string; shade?: string; shadeHex?: string }): CartLine | undefined {
  const key = cartKey(p);
  return lines.find((l) => l.key === key);
}
