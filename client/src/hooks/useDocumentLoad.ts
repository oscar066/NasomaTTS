/**
 * useDocumentLoad — document fetching and caching.
 *
 * Single responsibility: given the current URL's `documentId` param, load the
 * document from localStorage (fast path) or the REST API (slow path) and
 * expose the result as reactive state.
 *
 * Cache contract
 * ──────────────
 * The document is stored in `localStorage["currentDocument"]` as JSON.  The
 * cache is considered valid when:
 *   - `id` matches the current `documentId`
 *   - `pdf_url` is not explicitly `null` (null means a failed MinIO upload at
 *     ingest time; forcing a re-fetch picks up a valid URL if the document was
 *     re-uploaded since)
 *   - For PDF documents (`pdf_url` present) the `pages` array must also be
 *     present (old cache entries pre-dating per-page extraction are rejected)
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { documentsApi, pdfProxyUrl, StoredPage } from "@/lib/api";

export interface DocumentLoadResult {
  docName: string;
  text: string;
  pdfUrl: string | null;
  storedPages: StoredPage[];
  paragraphs: string[];
  loading: boolean;
  error: string;
}

export const useDocumentLoad = (): DocumentLoadResult => {
  const params = useParams();
  const documentId = params?.documentId as string;
  const { data: session } = useSession();

  const [state, setState] = useState<DocumentLoadResult>({
    docName: "",
    text: "",
    pdfUrl: null,
    storedPages: [],
    paragraphs: [],
    loading: true,
    error: "",
  });

  const update = (patch: Partial<DocumentLoadResult>) =>
    setState((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!documentId) {
      update({ error: "No document ID provided.", loading: false });
      return;
    }

    const init = async () => {
      update({ loading: true, error: "" });
      try {
        // ── Fast path: localStorage cache ─────────────────────────────────
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
            });
            update({ loading: false });
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
          })
        );
        update({
          docName: doc.title,
          text: doc.content,
          pdfUrl: doc.pdf_url ? pdfProxyUrl(documentId) : null,
          storedPages: doc.pages ?? [],
          paragraphs: doc.content.split(/\n\s*\n/).filter(Boolean),
        });
      } catch (err: unknown) {
        update({ error: (err as Error)?.message || "Failed to load document." });
      } finally {
        update({ loading: false });
      }
    };

    init();
  }, [documentId, session?.accessToken]);

  return state;
};
