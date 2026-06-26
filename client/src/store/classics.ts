import { create } from "zustand";
import { GutenbergBook } from "@/lib/api";

const TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  books: GutenbergBook[];
  total: number;
  fetchedAt: number;
}

interface ClassicsStore {
  cache: Record<string, CacheEntry>;
  set: (key: string, books: GutenbergBook[], total: number) => void;
  get: (key: string) => CacheEntry | null;
}

export const useClassicsStore = create<ClassicsStore>((set, get) => ({
  cache: {},

  set: (key, books, total) =>
    set((s) => ({
      cache: { ...s.cache, [key]: { books, total, fetchedAt: Date.now() } },
    })),

  get: (key) => {
    const entry = get().cache[key];
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > TTL_MS) return null;
    return entry;
  },
}));

export function cacheKey(search: string, page: number) {
  return `${page}:${search.trim().toLowerCase()}`;
}
