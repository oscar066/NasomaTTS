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
import { documentsApi, pdfApi, pdfProxyUrl, StoredPage } from "@/lib/api";
import { loadLocalProgress } from "@/lib/progress";
import { useDocumentCacheStore, stripPagesForCache } from "@/store/documentCache";

export interface DocumentLoadResult {
  documentId: string;
  docName: string;
  text: string;
  pdfUrl: string | null;
  storedPages: StoredPage[];
  paragraphs: string[];
  /** Parallel to `paragraphs` — "heading" | "body" for text-only classics. */
  paragraphTypes: ("heading" | "body")[];
  totalWordCount: number | null;
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
    paragraphTypes: [],
    totalWordCount: null,
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

        // Fast path: Zustand document-cache store
        const cached = cacheGet(documentId);
        // Cache is valid when: entry exists, pdf_url isn't explicitly null
        // (null = failed upload → force re-fetch), and for PDF docs the pages
        // array is already populated from a prior parallel fetch.
        const cacheValid =
          cached &&
          cached.pdf_url !== null &&
          (!cached.pdf_url || (Array.isArray(cached.pages) && cached.pages.length > 0));

        if (cacheValid) {
          const cachedPages = (cached.pages as StoredPage[]) ?? [];
          const isTextOnly = !cached.pdf_url;
          const cachedParagraphs =
            isTextOnly && cachedPages.length > 0
              ? cachedPages.flatMap((p) =>
                  p.paragraphs?.length
                    ? p.paragraphs.map((para: { text: string }) => para.text)
                    : p.text.split(/\n\s*\n/).filter(Boolean)
                )
              : cached.content.split(/\n\s*\n/).filter(Boolean);
          const cachedTypes: ("heading" | "body")[] =
            isTextOnly && cachedPages.length > 0
              ? cachedPages.flatMap((p) =>
                  p.paragraphs?.length
                    ? p.paragraphs.map((para) => (para.type === "heading" ? "heading" : "body"))
                    : p.text.split(/\n\s*\n/).filter(Boolean).map(() => "body" as const)
                )
              : [];

          update({
            docName: cached.title,
            text: cached.content,
            pdfUrl: cached.pdf_url ? pdfProxyUrl(documentId) : null,
            storedPages: cachedPages,
            paragraphs: cachedParagraphs,
            paragraphTypes: cachedTypes,
            initialPage: localPage > 0 ? localPage : (cached.current_page ?? 0),
            loading: false,
          });
          return;
        }

        // Slow path: REST API 
        // Fetch document metadata and page data in parallel — pages live in
        // a separate collection and endpoint but are needed immediately for
        // TTS highlighting, so we avoid sequential round-trips.
        const [doc, pages] = await Promise.all([
          documentsApi.get(documentId, session?.accessToken),
          pdfApi.getPages(documentId, session?.accessToken).catch(() => [] as StoredPage[]),
        ]);

        cacheSet({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          pdf_url: doc.pdf_url ?? null,
          pages: stripPagesForCache(pages),
          current_page: doc.current_page ?? 0,
        });

        // For text-only docs (classics), build paragraphs from stored pages
        // so the reader shows the full book, not just the 4 000-char content excerpt.
        const isTextOnly = !doc.pdf_url;
        const paragraphs =
          isTextOnly && pages.length > 0
            ? pages.flatMap((p) =>
                p.paragraphs?.length
                  ? p.paragraphs.map((para: { text: string }) => para.text)
                  : p.text.split(/\n\s*\n/).filter(Boolean)
              )
            : doc.content.split(/\n\s*\n/).filter(Boolean);
        const paragraphTypes: ("heading" | "body")[] =
          isTextOnly && pages.length > 0
            ? pages.flatMap((p) =>
                p.paragraphs?.length
                  ? p.paragraphs.map((para) => (para.type === "heading" ? "heading" : "body"))
                  : p.text.split(/\n\s*\n/).filter(Boolean).map(() => "body" as const)
              )
            : [];

        update({
          docName: doc.title,
          text: doc.content,
          pdfUrl: doc.pdf_url ? pdfProxyUrl(documentId) : null,
          storedPages: pages,
          paragraphs,
          paragraphTypes,
          totalWordCount: doc.total_word_count ?? null,
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
