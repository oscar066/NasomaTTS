/**
 * useDocumentLoad — document fetching and caching.
 *
 * Single responsibility: given the current URL's `documentId` param, load the
 * document from the Zustand document-cache store (fast path) or the REST API
 * (slow path) and expose the result as reactive state.
 *
 * Progress restore
 * ────────────────
 * `initialPage` is resolved from two sources in priority order:
 *   1. `localStorage["nasoma_progress_<id>"]` — written by useTTSPlayback on
 *      every page turn so it is always up-to-date on this device.
 *   2. `doc.current_page` returned by the API — used as a cross-device fallback
 *      when no local progress entry exists.
 *
 * Cache contract
 * ──────────────
 * Documents are cached in `useDocumentCacheStore` (up to 5 entries, LRU-evicted,
 * persisted to localStorage via Zustand's persist middleware).  A cache entry is
 * considered valid when:
 *   - `id` matches the current `documentId`
 *   - `pdf_url` is not explicitly `null` (null = failed MinIO upload; force
 *     re-fetch so a re-uploaded document gets a valid URL)
 *   - For PDF documents the `pages` array must also be present
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { documentsApi, pdfProxyUrl, StoredPage } from "@/lib/api";
import { loadLocalProgress } from "@/lib/progress";
import { useDocumentCacheStore, stripPagesForCache } from "@/store/documentCache";

export interface DocumentLoadResult {
  documentId: string;
  docName: string;
  text: string;
  pdfUrl: string | null;
  storedPages: StoredPage[];
  paragraphs: string[];
  loading: boolean;
  error: string;
  initialPage: number;
  token: string | undefined;
}

export const useDocumentLoad = (): DocumentLoadResult => {
  const params = useParams();
  const documentId = (params?.documentId as string) ?? "";
  const { data: session } = useSession();

  const cacheGet = useDocumentCacheStore((s) => s.get);
  const cacheSet = useDocumentCacheStore((s) => s.set);

  const [state, setState] = useState<Omit<DocumentLoadResult, "documentId" | "token">>({
    docName: "",
    text: "",
    pdfUrl: null,
    storedPages: [],
    paragraphs: [],
    loading: true,
    error: "",
    initialPage: 0,
  });

  const update = (patch: Partial<typeof state>) =>
    setState((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!documentId) {
      update({ error: "No document ID provided.", loading: false });
      return;
    }

    const init = async () => {
      update({ loading: true, error: "" });
      try {
        const localPage = loadLocalProgress(documentId);

        // ── Fast path: Zustand document-cache store ───────────────────────
        const cached = cacheGet(documentId);
        const cacheValid =
          cached &&
          cached.pdf_url !== null &&
          (!cached.pdf_url || Array.isArray(cached.pages));

        if (cacheValid) {
          update({
            docName: cached.title,
            text: cached.content,
            pdfUrl: cached.pdf_url ? pdfProxyUrl(documentId) : null,
            storedPages: (cached.pages as StoredPage[]) ?? [],
            paragraphs: cached.content.split(/\n\s*\n/).filter(Boolean),
            initialPage: localPage > 0 ? localPage : (cached.current_page ?? 0),
            loading: false,
          });
          return;
        }

        // ── Slow path: REST API ───────────────────────────────────────────
        const doc = await documentsApi.get(documentId, session?.accessToken);

        cacheSet({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          pdf_url: doc.pdf_url ?? null,
          pages: stripPagesForCache(doc.pages),
          current_page: doc.current_page ?? 0,
        });

        update({
          docName: doc.title,
          text: doc.content,
          pdfUrl: doc.pdf_url ? pdfProxyUrl(documentId) : null,
          storedPages: doc.pages ?? [],
          paragraphs: doc.content.split(/\n\s*\n/).filter(Boolean),
          initialPage: localPage > 0 ? localPage : (doc.current_page ?? 0),
        });
      } catch (err: unknown) {
        update({ error: (err as Error)?.message || "Failed to load document." });
      } finally {
        update({ loading: false });
      }
    };

    init();
    // cacheGet is a stable selector reference — safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, session?.accessToken]);

  return {
    documentId,
    token: session?.accessToken,
    ...state,
  };
};
