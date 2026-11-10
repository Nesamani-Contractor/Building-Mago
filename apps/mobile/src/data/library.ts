import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Routine } from '@mago/shared';
import { deviceStorage } from './storage';
import { uid } from '@/lib/id';

export interface SavedRoutine {
  routine: Routine;
  savedAt: string;
  favorite: boolean;
  pinned: boolean;
  collectionIds: string[];
  note?: string;
  rating?: number;
  doneCount: number;
  lastDoneAt?: string;
  /** D-06: her own on-device copy of an uploaded video (never re-downloaded from the server). */
  localVideoUri?: string;
  /** Demo mode: true when steps are sample content rather than read from the video. */
  isDemoContent?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

export type ImportStatus =
  | 'pending_offline'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'needs_upload'
  | 'non_english'
  | 'limit_reached';

export interface ImportJob {
  id: string;
  kind: 'link' | 'upload';
  platform: 'youtube' | 'tiktok' | 'instagram' | 'upload';
  canonicalKey?: string;
  title?: string;
  status: ImportStatus;
  /** Index into IMPORT_STAGES. */
  stage: number;
  routineId?: string;
  errorMessage?: string;
  createdAt: string;
}

export const IMPORT_STAGES = ['Got your video', 'Watching the video', 'Writing your steps', 'Matching products', 'Ready'] as const;

interface LibraryState {
  items: Record<string, SavedRoutine>;
  collections: Collection[];
  imports: Record<string, ImportJob>;
  save: (r: Routine, extra?: Partial<SavedRoutine>) => void;
  update: (id: string, patch: Partial<SavedRoutine>) => void;
  updateRoutine: (id: string, routine: Routine) => void;
  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
  togglePinned: (id: string) => void;
  markDone: (id: string, at: string) => void;
  addCollection: (name: string) => string;
  toggleInCollection: (routineId: string, collectionId: string) => void;
  upsertImport: (job: ImportJob) => void;
  patchImport: (id: string, patch: Partial<ImportJob>) => void;
  reset: () => void;
}

const DEFAULT_COLLECTIONS: Collection[] = [
  { id: 'col-everyday', name: 'Everyday', createdAt: '2026-11-01T00:00:00.000Z' },
  { id: 'col-date', name: 'Date night', createdAt: '2026-11-01T00:00:00.000Z' },
];

/** A dot on the Library tab after she saves something new, so she knows where it went (cleared when she opens Library). */
export const useSaveDot = create<{ dot: boolean; setDot: (dot: boolean) => void }>()((set) => ({
  dot: false,
  setDot: (dot) => set({ dot }),
}));

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      items: {},
      collections: DEFAULT_COLLECTIONS,
      imports: {},
      save: (r, extra) =>
        set((s) => {
          if (!s.items[r.id]) useSaveDot.getState().setDot(true);
          return {
          items: {
            ...s.items,
            [r.id]: s.items[r.id] ?? {
              routine: r,
              savedAt: new Date().toISOString(),
              favorite: false,
              pinned: false,
              collectionIds: [],
              doneCount: 0,
              ...extra,
            },
          },
          };
        }),
      update: (id, patch) =>
        set((s) => {
          const cur = s.items[id];
          return cur ? { items: { ...s.items, [id]: { ...cur, ...patch } } } : s;
        }),
      updateRoutine: (id, routine) =>
        set((s) => {
          const cur = s.items[id];
          return cur ? { items: { ...s.items, [id]: { ...cur, routine } } } : s;
        }),
      remove: (id) =>
        set((s) => {
          const items = { ...s.items };
          delete items[id];
          return { items };
        }),
      toggleFavorite: (id) =>
        set((s) => {
          const cur = s.items[id];
          return cur ? { items: { ...s.items, [id]: { ...cur, favorite: !cur.favorite } } } : s;
        }),
      togglePinned: (id) =>
        set((s) => {
          const cur = s.items[id];
          return cur ? { items: { ...s.items, [id]: { ...cur, pinned: !cur.pinned } } } : s;
        }),
      markDone: (id, at) =>
        set((s) => {
          const cur = s.items[id];
          return cur ? { items: { ...s.items, [id]: { ...cur, doneCount: cur.doneCount + 1, lastDoneAt: at } } } : s;
        }),
      addCollection: (name) => {
        const id = uid('col');
        set((s) => ({ collections: [...s.collections, { id, name: name.trim(), createdAt: new Date().toISOString() }] }));
        return id;
      },
      toggleInCollection: (routineId, collectionId) =>
        set((s) => {
          const cur = s.items[routineId];
          if (!cur) return s;
          const has = cur.collectionIds.includes(collectionId);
          const collectionIds = has ? cur.collectionIds.filter((c) => c !== collectionId) : [...cur.collectionIds, collectionId];
          return { items: { ...s.items, [routineId]: { ...cur, collectionIds } } };
        }),
      upsertImport: (job) => set((s) => ({ imports: { ...s.imports, [job.id]: job } })),
      patchImport: (id, patch) =>
        set((s) => {
          const cur = s.imports[id];
          return cur ? { imports: { ...s.imports, [id]: { ...cur, ...patch } } } : s;
        }),
      reset: () => set({ items: {}, collections: DEFAULT_COLLECTIONS, imports: {} }),
    }),
    { name: 'mago.library.v1', storage: deviceStorage },
  ),
);

/** Simple on-device search across title, steps, products and tags. (Production: SQLite FTS5.) */
export function searchLibrary(items: SavedRoutine[], q: string): SavedRoutine[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(({ routine: r, note }) => {
    const hay = [
      r.title,
      r.category,
      ...r.occasion,
      ...r.tags,
      ...r.products.map((p) => p.name),
      ...r.sections.flatMap((s) => s.steps.map((st) => st.text)),
      note ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return needle.split(/\s+/).every((w) => hay.includes(w));
  });
}
