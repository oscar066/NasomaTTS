/**
 * useDocumentLoad — document fetching and caching.
 *
 * Single responsibility: given the current URL's `documentId` param, load the
 * document from localStorage (fast path) or the REST API (slow path) and
 * expose the result as reactive state.
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
 * The document content is cached in `localStorage["currentDocument"]`.  The
 * cache is considered valid when:
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

export interface DocumentLoadResult {
  /** Exposed so sub-hooks can reference the document ID without re-parsing the URL. */
  documentId: string;
  docName: string;
  text: string;
  pdfUrl: string | null;
  storedPages: StoredPage[];
  paragraphs: string[];
  loading: boolean;
  error: string;
  /** 0-based page to resume playback from (local progress → API fallback). */
  initialPage: number;
  /** Bearer token — exposed so progress saves can authenticate without re-calling useSession. */
  token: string | undefined;
}

export const useDocumentLoad = (): DocumentLoadResult => {
  const params = useParams();
  const documentId = (params?.documentId as string) ?? "";
  const { data: session } = useSession();

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
        // ── Resolve initial page from local progress store ────────────────
        // Local store is always more recent than the API on this device
        // because useTTSPlayback writes to it on every page turn.
        const localPage = loadLocalProgress(documentId);

        // ── Fast path: localStorage document cache ────────────────────────
        const cached = localStorage.getItem("currentDocument");
        if (cached) {
          const parsed = JSON.parse(cached);
          const pdfUrlMissing = !("pdf_url" in parsed);
          const cacheValid =
            parsed.id === documentId &&
            (pdfUrlMissing || parsed.pdf_url !== null) &&
            (!parsed.pdf_url || Array.isArray(parsed.pages));

          if (cacheValid) {
            update({
              docName: parsed.title,
              text: parsed.content,
              pdfUrl: parsed.pdf_url ? pdfProxyUrl(documentId) : null,
              storedPages: parsed.pages ?? [],
              paragraphs: parsed.content.split(/\n\s*\n/).filter(Boolean),
              // Prefer local progress; fall back to whatever the cache recorded
              initialPage: localPage > 0 ? localPage : (parsed.current_page ?? 0),
              loading: false,
            });
            return;
          }
        }

        // ── Slow path: REST API ───────────────────────────────────────────
        const doc = await documentsApi.get(documentId, session?.accessToken);
        localStorage.setItem(
          "currentDocument",
          JSON.stringify({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            pdf_url: doc.pdf_url,
            pages: doc.pages ?? null,
            current_page: doc.current_page ?? 0,
          })
        );
        update({
          docName: doc.title,
          text: doc.content,
          pdfUrl: doc.pdf_url ? pdfProxyUrl(documentId) : null,
          storedPages: doc.pages ?? [],
          paragraphs: doc.content.split(/\n\s*\n/).filter(Boolean),
          // Local progress wins if present; otherwise use what the API says
          initialPage: localPage > 0 ? localPage : (doc.current_page ?? 0),
        });
      } catch (err: unknown) {
        update({ error: (err as Error)?.message || "Failed to load document." });
      } finally {
        update({ loading: false });
      }
    };

    init();
  }, [documentId, session?.accessToken]);

  return {
    documentId,
    token: session?.accessToken,
    ...state,
  };
};
