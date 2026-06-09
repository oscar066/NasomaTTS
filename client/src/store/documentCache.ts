import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { StoredPage } from "@/lib/api";

export interface CachedDocument {
  id: string;
  title: string;
  content: string;
  pdf_url: string | null;
  /** Paragraph data stripped before caching — can be large for long PDFs. */
  pages: Array<{ page_number: number; text: string }> | null;
  current_page: number;
  cachedAt: number;
}

const MAX_CACHED = 5;

interface DocumentCacheStore {
  cache: Record<string, CachedDocument>;
  get: (id: string) => CachedDocument | undefined;
  set: (doc: Omit<CachedDocument, "cachedAt">) => void;
  invalidate: (id: string) => void;
}

export const useDocumentCacheStore = create<DocumentCacheStore>()(
  persist(
    (set, get) => ({
      cache: {},

      get: (id) => get().cache[id],

      set: (doc) =>
        set((s) => {
          const updated = {
            ...s.cache,
            [doc.id]: { ...doc, cachedAt: Date.now() },
          };

          // Evict oldest entries when the cache exceeds the limit.
          const entries = Object.values(updated);
          if (entries.length > MAX_CACHED) {
            entries.sort((a, b) => a.cachedAt - b.cachedAt);
            entries.slice(0, entries.length - MAX_CACHED).forEach((e) => {
              delete updated[e.id];
            });
          }

          return { cache: updated };
        }),

      invalidate: (id) =>
        set((s) => {
          const next = { ...s.cache };
          delete next[id];
          return { cache: next };
        }),
    }),
    {
      name: "nasoma-document-cache",
      storage: createJSONStorage(() => localStorage),
      // Only persist the cache entries themselves — actions are not serialisable.
      partialize: (s) => ({ cache: s.cache }),
    }
  )
);

// Helper: convert a full API Document's pages array to the stripped cache format.
export function stripPagesForCache(
  pages: StoredPage[] | null | undefined
): Array<{ page_number: number; text: string }> | null {
  if (!pages) return null;
  return pages.map(({ page_number, text }) => ({ page_number, text }));
}
