import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BagItem } from '@mago/shared';
import { deviceStorage } from './storage';
import { uid } from '@/lib/id';

/** My makeup bag — lives on the device like the library. */
interface BagState {
  items: BagItem[];
  add: (items: Omit<BagItem, 'id' | 'addedAt'>[]) => void;
  update: (id: string, patch: Partial<BagItem>) => void;
  remove: (id: string) => void;
  reset: () => void;
}

export const useBag = create<BagState>()(
  persist(
    (set) => ({
      items: [],
      add: (items) =>
        set((s) => ({
          items: [...items.map((i) => ({ ...i, id: uid('bag'), addedAt: new Date().toISOString() })), ...s.items],
        })),
      update: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      reset: () => set({ items: [] }),
    }),
    { name: 'mago.bag.v1', storage: deviceStorage },
  ),
);

/** Photos picked during a scan, waiting for review (not persisted). */
export const useScanDraft = create<{ photos: string[]; setPhotos: (p: string[]) => void }>((set) => ({
  photos: [],
  setPhotos: (photos) => set({ photos }),
}));

/** Shade swatches she can tap when confirming a product. */
export const SHADE_SWATCHES = [
  '#F3DCC8',
  '#E6BC9C',
  '#C99A78',
  '#9A6A4F',
  '#5E3B2C',
  '#1E1A1C',
  '#F2B9C4',
  '#E59AA8',
  '#C98583',
  '#B9566A',
  '#9E1B32',
  '#F0A88A',
  '#E9D3B0',
  '#B07A58',
  '#EDE6E3',
];
