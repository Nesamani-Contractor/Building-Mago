import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addToCart, cartUnits, setCartQty, type CartAdd, type CartLine } from '@mago/shared';
import { deviceStorage } from './storage';
import { uid } from '@/lib/id';

export interface Order {
  id: string;
  /** Short number she can read out, e.g. "MG-4821". */
  number: string;
  lines: CartLine[];
  placedAt: string;
  status: 'requested' | 'received';
  /** D-28: the store she ordered from (Mago handed the products over to its website). */
  store?: { id: string; name: string };
}

/** My cart + orders (D-25). Lives on the device; nothing is charged in this build. */
interface CartState {
  lines: CartLine[];
  orders: Order[];
  add: (items: CartAdd[]) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  /** Put back a line she just removed (Undo). */
  restore: (line: CartLine) => void;
  clear: () => void;
  placeOrder: (store?: { id: string; name: string }) => Order | null;
  markReceived: (id: string) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      orders: [],
      add: (items) => set((s) => ({ lines: addToCart(s.lines, items, new Date().toISOString(), () => uid('cart')) })),
      setQty: (id, qty) => set((s) => ({ lines: setCartQty(s.lines, id, qty) })),
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      restore: (line) => set((s) => (s.lines.some((l) => l.id === line.id) ? s : { lines: [...s.lines, line] })),
      clear: () => set({ lines: [] }),
      placeOrder: (store) => {
        const lines = get().lines;
        if (lines.length === 0) return null;
        const order: Order = {
          id: uid('ord'),
          number: `MG-${String(Math.floor(1000 + Math.random() * 9000))}`,
          lines,
          placedAt: new Date().toISOString(),
          status: 'requested',
          store,
        };
        set((s) => ({ lines: [], orders: [order, ...s.orders] }));
        return order;
      },
      markReceived: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'received' } : o)) })),
    }),
    { name: 'mago.cart.v1', storage: deviceStorage },
  ),
);

export function useCartUnits(): number {
  return useCart((s) => cartUnits(s.lines));
}
