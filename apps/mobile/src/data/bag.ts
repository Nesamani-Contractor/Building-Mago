import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { bagCount, mergeIntoBag, type BagItem, type MergeResult } from '@mago/shared';
import { deviceStorage } from './storage';
import { uid } from '@/lib/id';

/** My makeup bag — lives on the device like the library. */
interface BagState {
  items: BagItem[];
  /** Adds products; the same product (brand + name + shade) raises its count instead (D-25). */
  add: (items: Omit<BagItem, 'id' | 'addedAt'>[]) => MergeResult;
  update: (id: string, patch: Partial<BagItem>) => void;
  /** Set how many she owns; 0 removes it. */
  setCount: (id: string, count: number) => void;
  remove: (id: string) => void;
  /** Put back an item she just removed (Undo). */
  restore: (item: BagItem) => void;
  /** D-26: she has checked these auto-added items. */
  markReviewed: (ids: string[]) => void;
  reset: () => void;
}

export const useBag = create<BagState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (drafts) => {
        const res = mergeIntoBag(get().items, drafts, new Date().toISOString(), () => uid('bag'));
        set({ items: res.items });
        return res;
      },
      setCount: (id, count) =>
        set((s) =>
          count <= 0
            ? { items: s.items.filter((i) => i.id !== id) }
            : { items: s.items.map((i) => (i.id === id ? { ...i, count: Math.min(99, Math.round(count)), updatedAt: new Date().toISOString() } : i)) },
        ),
      update: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      restore: (item) => set((s) => (s.items.some((i) => i.id === item.id) ? s : { items: [item, ...s.items] })),
      markReviewed: (ids) => set((s) => ({ items: s.items.map((i) => (ids.includes(i.id) ? { ...i, needsReview: false } : i)) })),
      reset: () => set({ items: [] }),
    }),
    { name: 'mago.bag.v1', storage: deviceStorage },
  ),
);

export interface ScanBatch {
  photos: number;
  /** Photos where Mago found nothing — she can name those by hand. */
  unreadPhotos: string[];
  /** One entry per product it touched: new ones, and ones whose count went up. */
  entries: { id: string; plus: number; prevCount: number; isNew: boolean; seenInPhotos: number }[];
}

/** Photos picked during a scan, waiting for review, and what the last save did (not persisted). */
export const useScanDraft = create<{
  photos: string[];
  setPhotos: (p: string[]) => void;
  lastResult: { added: number; updated: { name: string; count: number }[] } | null;
  setLastResult: (r: { added: number; updated: { name: string; count: number }[] } | null) => void;
  /** D-26: what the last photo scan added automatically, for the review screen. */
  batch: ScanBatch | null;
  setBatch: (b: ScanBatch | null) => void;
}>((set) => ({
  batch: null,
  setBatch: (batch) => set({ batch }),
  photos: [],
  setPhotos: (photos) => set({ photos }),
  lastResult: null,
  setLastResult: (lastResult) => set({ lastResult }),
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

/** Total units in the bag (2 lipsticks + 1 mascara = 3). */
export function bagUnits(items: BagItem[]): number {
  return items.reduce((n, i) => n + bagCount(i), 0);
}
