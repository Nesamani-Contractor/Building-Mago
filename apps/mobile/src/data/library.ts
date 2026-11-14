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
  /** Her own tags for organizing (FR-ORG). Missing on looks saved before 13 Nov → treat as []. */
  userTags?: string[];
  /** When she pinned it to "You and your beauty" (FR-PIN); newest first. */
  pinnedAt?: string;
  /** True once she has answered the Save sheet for this look (or saved it on purpose). */
  filed?: boolean;
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
  /** FR-ORG: file a look in categories with her tags (and optionally pin it). */
  file: (routineId: string, opts: { collectionIds: string[]; tags: string[]; pinned?: boolean }) => void;
  /** Save a Discover sample (or any routine) if it isn't in her library yet. */
  ensureSaved: (r: Routine) => void;
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
    (set, get) => ({
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
          if (!cur) return s;
          const pinned = !cur.pinned;
          return { items: { ...s.items, [id]: { ...cur, pinned, pinnedAt: pinned ? new Date().toISOString() : undefined } } };
        }),
      markDone: (id, at) =>
        set((s) => {
          const cur = s.items[id];
          return cur ? { items: { ...s.items, [id]: { ...cur, doneCount: cur.doneCount + 1, lastDoneAt: at } } } : s;
        }),
      addCollection: (name) => {
        const clean = name.trim().slice(0, 30);
        const existing = get().collections.find((c) => c.name.toLowerCase() === clean.toLowerCase());
        if (existing) return existing.id;
        const id = uid('col');
        set((s) => ({ collections: [...s.collections, { id, name: clean, createdAt: new Date().toISOString() }] }));
        return id;
      },
      file: (routineId, { collectionIds, tags, pinned }) =>
        set((s) => {
          const cur = s.items[routineId];
          if (!cur) return s;
          const now = new Date().toISOString();
          const pin = pinned === undefined ? {} : { pinned, pinnedAt: pinned ? (cur.pinned ? cur.pinnedAt : now) : undefined };
          return { items: { ...s.items, [routineId]: { ...cur, collectionIds: [...new Set(collectionIds)], userTags: normalizeTags(tags), filed: true, ...pin } } };
        }),
      ensureSaved: (r) => {
        if (!get().items[r.id]) get().save(r, { filed: true });
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
  return items.filter((saved) => {
    const { routine: r, note } = saved;
    const hay = [
      r.title,
      r.category,
      ...r.occasion,
      ...r.tags,
      ...(saved.userTags ?? []),
      ...r.products.map((p) => p.name),
      ...r.sections.flatMap((s) => s.steps.map((st) => st.text)),
      note ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return needle.split(/\s+/).every((w) => hay.includes(w));
  });
}

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 24;

/** Trim, de-duplicate (case-insensitive) and cap her tags. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.replace(/^#/, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out.slice(0, MAX_TAGS);
}

/** Pinned looks, newest pin first (FR-PIN). */
export function pinnedLooks(items: Record<string, SavedRoutine>): SavedRoutine[] {
  return Object.values(items)
    .filter((x) => x.pinned)
    .sort((a, b) => (b.pinnedAt ?? b.savedAt).localeCompare(a.pinnedAt ?? a.savedAt));
}

/** Every tag she has used, most used first. */
export function allUserTags(items: Record<string, SavedRoutine>): string[] {
  const count = new Map<string, number>();
  for (const x of Object.values(items)) for (const t of x.userTags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}
