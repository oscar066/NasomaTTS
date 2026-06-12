"use client";

/**
 * PDFViewer — renders a PDF and highlights the currently spoken word plus a
 * short "reading window" around it inside the pdf.js text layer.
 *
 * Why a reading window instead of paragraph highlighting
 * ───────────────────────────────────────────────────────
 * PyMuPDF (the server-side extractor) often groups an entire page — or many
 * visual paragraphs — into a single paragraph block.  Painting the whole block
 * floods the viewport with colour.  A reading window (a fixed band of N word
 * spans centred on the current word) is visually clean and works regardless of
 * how the document was segmented server-side.
 *
 * Word entry indexing
 * ───────────────────
 * react-pdf renders a transparent `.react-pdf__Page__textContent` div whose
 * child <span>s match the canvas.  We split multi-word spans into one child
 * <span> per word and store the flat array in `wordEntriesRef`.
 *
 * The current word's entry index is derived from `currentWordInParagraph`
 * (within-paragraph word index from the SSE stream, resets to 0 each paragraph)
 * plus the paragraph's start offset in the entry array.  This avoids the
 * cumulative drift that plagued the old `absoluteWordIdx` approach.
 *
 * Race-condition fix
 * ──────────────────
 * `indexedCount` state is incremented each time a page finishes indexing.
 * Both highlight effects depend on it so they re-run once entries are ready,
 * even if the paragraph/word props haven't changed since the SSE event fired.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Skeleton } from "@/components/ui/skeleton";
import type { StoredPage } from "@/lib/api";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// ── Constants ─────────────────────────────────────────────────────────────────

const INDEX_MAX_ATTEMPTS = 12;
const INDEX_RETRY_MS     = 60;

/** Word entries before the current word that receive the reading-window tint. */
const WINDOW_BEFORE = 12;
/** Word entries after the current word that receive the reading-window tint. */
const WINDOW_AFTER  = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageData {
  wordCount: number;
}

interface PDFViewerProps {
  url: string;
  onPagesReady?: (pages: PageData[]) => void;
  /**
   * Fired as soon as the PDF structure loads and page wrapper divs are in the
   * DOM (before text-layer indexing).  DocumentReader uses this to know it is
   * safe to scroll to the saved resume page.
   */
  onDocumentLoaded?: (numPages: number) => void;
  /** 0-based page index currently being spoken. */
  highlightPage?: number;
  /**
   * 0-based paragraph index within the active page (from SSE newParagraph
   * events).  Used together with `paragraphWordBoundaries` to locate the
   * paragraph's start offset inside `wordEntriesRef`.
   */
  highlightParagraphIdx?: number;
  /**
   * Word index within the current paragraph (from SSE word events).
   * Resets to 0 at each paragraph boundary — no cross-paragraph drift.
   */
  currentWordInParagraph?: number;
  /**
   * Cumulative PyMuPDF word counts per paragraph on the active page.
   * e.g. [5, 12, 20] → paragraph 0 has words 0-4, paragraph 1 has 5-11 …
   * Absent for legacy documents — the whole page is treated as one paragraph.
   */
  paragraphWordBoundaries?: number[];
  /**
   * All stored pages for the document (from the API).  When the active
   * paragraph has a `bbox`, PDFViewer renders a coordinate-based overlay div
   * instead of the word-count reading window.  Falls back to the reading
   * window for legacy documents that lack bbox data.
   */
  storedPages?: StoredPage[];
}

interface WordEntry {
  span: HTMLElement;
  text: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

const LINE_WIDTHS = [
  "100%", "96%", "91%", "100%", "88%", "45%",
  "100%", "94%", "98%", "100%", "83%", "62%",
  "100%", "97%", "90%", "100%", "86%", "55%",
  "100%", "95%", "92%", "100%", "78%", "38%",
];

const DocumentSkeleton: React.FC<{ width: number }> = ({ width }) => {
  const height = Math.round(width * (11 / 8.5));
  const pad = Math.round(width * 0.09);
  const linesPerParagraph = 6;
  const bodyHeight = height - pad * 2 - pad * 0.6 * 2;
  const totalLines = Math.max(12, Math.ceil(bodyHeight / (20 * linesPerParagraph + 16)) * linesPerParagraph);

  return (
    <div className="bg-background rounded-lg shadow-lg overflow-hidden" style={{ width, height }}>
      <div className="h-full flex flex-col overflow-hidden" style={{ padding: `${pad}px` }}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-2.5 w-10" />
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: totalLines }, (_, i) => (
            <div key={i} style={{ marginBottom: (i + 1) % linesPerParagraph === 0 ? "20px" : "10px" }}>
              <Skeleton className="h-2.5" style={{ width: LINE_WIDTHS[i % LINE_WIDTHS.length] }} />
            </div>
          ))}
        </div>
        <div className="flex justify-center pt-3 flex-shrink-0">
          <Skeleton className="h-2 w-8" />
        </div>
      </div>
    </div>
  );
};

// ── PDFViewer ─────────────────────────────────────────────────────────────────

const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  onPagesReady,
  onDocumentLoaded,
  highlightPage,
  highlightParagraphIdx,
  currentWordInParagraph,
  paragraphWordBoundaries,
  storedPages,
}) => {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);

  // Incremented each time a page finishes indexing so highlight effects
  // re-run even though wordEntriesRef itself is a ref (not state).
  const [indexedCount, setIndexedCount] = useState(0);

  // When the active paragraph has a bbox we render a coordinate-based overlay
  // div instead of manipulating text-layer spans.  null = no overlay.
  const [paraOverlay, setParaOverlay] = useState<{
    pageIdx: number;
    bbox: [number, number, number, number];
  } | null>(null);

  // ── Lazy rendering ────────────────────────────────────────────────────────
  // Rendering 100+ PDF canvases simultaneously blocks the main thread.
  // We track which pages have been "activated" (entered the viewport or been
  // targeted by TTS).  Once activated a page is never deactivated — so
  // scrolling back is seamless.  The IntersectionObserver adds pages with a
  // generous 600 px root margin so they load before the user reaches them.
  const [renderedPages, setRenderedPages] = useState<Set<number>>(
    () => new Set([0, 1, 2])
  );

  const pageRefs       = useRef<(HTMLDivElement | null)[]>([]);
  const wordEntriesRef = useRef<WordEntry[][]>([]);

  // Track which spans currently carry each CSS class for O(1) removal.
  const activeWindowSpansRef = useRef<HTMLElement[]>([]);
  const activeWordSpanRef    = useRef<HTMLElement | null>(null);

  const indexedCountRef = useRef(0);
  const numPagesRef     = useRef(0);

  // ── Container resize observer ─────────────────────────────────────────────

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // ── Reset on URL change ───────────────────────────────────────────────────

  useEffect(() => {
    wordEntriesRef.current      = [];
    activeWindowSpansRef.current = [];
    activeWordSpanRef.current    = null;
    indexedCountRef.current      = 0;
    numPagesRef.current          = 0;
    setNumPages(0);
    setIndexedCount(0);
    setRenderedPages(new Set([0, 1, 2]));
    setParaOverlay(null);
  }, [url]);

  // ── IntersectionObserver — activate pages as they approach the viewport ──
  //
  // Runs whenever numPages changes (i.e. once the PDF loads).  Observes every
  // page-wrapper div; when one enters within 600 px of the viewport we mark
  // it and its immediate neighbours as rendered so the real <Page> element
  // replaces the skeleton before the user sees it.

  useEffect(() => {
    if (numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const newIds: number[] = [];
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(
            (entry.target as HTMLElement).dataset.nasomaPage
          );
          if (!isNaN(idx)) newIds.push(idx);
        });
        if (newIds.length === 0) return;

        setRenderedPages((prev) => {
          const next = new Set(prev);
          newIds.forEach((idx) => {
            // Activate the page plus one page on each side as a buffer.
            for (
              let i = Math.max(0, idx - 1);
              i <= Math.min(numPages - 1, idx + 2);
              i++
            ) {
              next.add(i);
            }
          });
          return next;
        });
      },
      { rootMargin: "600px 0px", threshold: 0 }
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages]);

  // ── Pre-activate the TTS target page ─────────────────────────────────────
  //
  // When playback advances to a page the user hasn't scrolled to yet, we must
  // ensure that page (and the next two) are rendered so highlighting works.

  useEffect(() => {
    const page = highlightPage;
    if (page == null || page < 0) return;
    setRenderedPages((prev) => {
      if (prev.has(page) && prev.has(page + 1)) return prev; // already there
      const next = new Set(prev);
      for (
        let i = Math.max(0, page - 1);
        i <= Math.min(numPagesRef.current - 1, page + 2);
        i++
      ) {
        next.add(i);
      }
      return next;
    });
  }, [highlightPage]);

  // ── Text layer indexing ───────────────────────────────────────────────────

  const indexPageWords = useCallback(
    (pageIndex: number, attempt = 0) => {
      const pageEl = pageRefs.current[pageIndex];
      if (!pageEl) return;

      const textLayer = pageEl.querySelector(
        ".react-pdf__Page__textContent"
      ) as HTMLElement | null;

      if (!textLayer) {
        if (attempt < INDEX_MAX_ATTEMPTS)
          setTimeout(() => indexPageWords(pageIndex, attempt + 1), INDEX_RETRY_MS);
        return;
      }

      if (textLayer.dataset.nasomaIndexed === "1") return;

      // react-pdf v10 uses pdfjs-dist's native TextLayer renderer, which wraps
      // text items inside <span class="markedContent"> containers for tagged PDFs.
      // Querying ":scope > span" would return those wrappers, not the actual text
      // items.  The real text items always have role="presentation" regardless of
      // nesting depth, so we target them directly.
      const rawSpans = Array.from(
        textLayer.querySelectorAll<HTMLElement>("span[role='presentation']")
      );

      if (rawSpans.length === 0) {
        if (attempt < INDEX_MAX_ATTEMPTS)
          setTimeout(() => indexPageWords(pageIndex, attempt + 1), INDEX_RETRY_MS);
        return;
      }

      // Sort into visual reading order (top → left) because pdf.js stores spans
      // in PDF structure order which often differs from visual sequence.  Without
      // this the reading-window window hits spans scattered around the page.
      const layerRect = textLayer.getBoundingClientRect();
      const originalSpans = [...rawSpans].sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const dy = (ar.top - layerRect.top) - (br.top - layerRect.top);
        if (Math.abs(dy) > 3) return dy;
        return (ar.left - layerRect.left) - (br.left - layerRect.left);
      });

      const entries: WordEntry[] = [];

      for (const span of originalSpans) {
        const rawText = span.textContent ?? "";
        if (!rawText.trim()) continue;

        const tokens     = rawText.split(/(\s+)/);
        const wordTokens = tokens.filter((t) => t.trim());

        if (wordTokens.length <= 1) {
          entries.push({ span, text: rawText.trim().toLowerCase() });
          continue;
        }

        span.textContent = "";
        for (const token of tokens) {
          if (/^\s+$/.test(token)) {
            span.appendChild(document.createTextNode(token));
          } else if (token) {
            const wSpan = document.createElement("span");
            wSpan.textContent = token;
            span.appendChild(wSpan);
            entries.push({ span: wSpan, text: token.toLowerCase() });
          }
        }
      }

      textLayer.dataset.nasomaIndexed = "1";
      wordEntriesRef.current[pageIndex] = entries;
      indexedCountRef.current += 1;

      console.debug(
        `[PDFViewer] page ${pageIndex} indexed: ${entries.length} words` +
        ` from ${originalSpans.length} spans`
      );

      if (indexedCountRef.current === numPagesRef.current && onPagesReady) {
        const pages: PageData[] = Array.from(
          { length: numPagesRef.current },
          (_, i) => ({ wordCount: wordEntriesRef.current[i]?.length ?? 0 })
        );
        onPagesReady(pages);
      }

      // Trigger highlight effects to re-run now that entries are ready.
      setIndexedCount((c) => c + 1);
    },
    [onPagesReady]
  );

  // ── Resolve paragraph start offset in pdf.js entries ─────────────────────
  //
  // Returns the entry index where the given paragraph begins, scaled from
  // PyMuPDF word counts to pdf.js entry counts.

  const resolveParagraphStart = (pIdx: number, totalEntries: number): number => {
    const b = paragraphWordBoundaries;
    if (!b || b.length === 0 || pIdx <= 0) return 0;

    const totalPyMuPDF = b[b.length - 1] ?? 0;
    if (totalPyMuPDF === 0) return 0;

    const ratio    = totalEntries / totalPyMuPDF;
    const rawStart = b[pIdx - 1] ?? 0;
    return Math.min(Math.round(rawStart * ratio), totalEntries - 1);
  };

  // ── Combined highlight effect ─────────────────────────────────────────────
  //
  // Runs on every word advance (currentWordInParagraph) and also whenever a
  // page finishes indexing (indexedCount) so it retries after the race window.
  //
  // Three-step update:
  //   1. Remove old reading-window tint.
  //   2. Remove old word highlight.
  //   3. Compute current word entry index, apply window tint + word highlight,
  //      scroll current word into view.

  useEffect(() => {
    // ── 1. Clear previous window tint ────────────────────────────────────
    for (const sp of activeWindowSpansRef.current) {
      sp.classList.remove("nasoma-window");
    }
    activeWindowSpansRef.current = [];

    // ── 2. Clear previous word highlight ─────────────────────────────────
    if (activeWordSpanRef.current) {
      activeWordSpanRef.current.classList.remove("nasoma-word");
      activeWordSpanRef.current = null;
    }

    const page = highlightPage ?? -1;
    const pIdx = highlightParagraphIdx ?? -1;
    const wIdx = currentWordInParagraph ?? -1;

    if (page < 0 || pIdx < 0 || wIdx < 0) return;

    const entries = wordEntriesRef.current[page];
    if (!entries || entries.length === 0) return;

    // ── 3a. Resolve current word entry index ─────────────────────────────
    const paraStart = resolveParagraphStart(pIdx, entries.length);

    // Scale within-paragraph word index proportionally.
    // We only know the paragraph's raw word count from the boundaries array.
    const b = paragraphWordBoundaries;
    const rawParaLen = (() => {
      if (!b || b.length === 0) return entries.length;
      const rawEnd   = b[pIdx]        ?? b[b.length - 1] ?? 0;
      const rawStart = pIdx > 0 ? (b[pIdx - 1] ?? 0) : 0;
      return rawEnd - rawStart;
    })();

    const rawParaEndEntry = (() => {
      if (!b || b.length === 0) return entries.length;
      const totalPyMuPDF = b[b.length - 1] ?? 0;
      if (totalPyMuPDF === 0) return entries.length;
      const ratio  = entries.length / totalPyMuPDF;
      const rawEnd = b[pIdx] ?? totalPyMuPDF;
      return Math.min(Math.round(rawEnd * ratio), entries.length);
    })();

    const paraEntryLen = Math.max(1, rawParaEndEntry - paraStart);
    const wordRatio    = rawParaLen > 0 ? paraEntryLen / rawParaLen : 1;
    const wordEntryIdx = Math.min(
      paraStart + Math.round(wIdx * wordRatio),
      entries.length - 1
    );

    // ── 3b. Paragraph overlay OR reading-window fallback ────────────────
    //
    // Prefer a coordinate-based overlay div (bbox) when the stored page data
    // has it — this is pixel-perfect and requires no text-layer span mapping.
    // Fall back to the word-count reading window for legacy documents.
    const activeBbox = storedPages?.[page]?.paragraphs?.[pIdx]?.bbox;

    console.debug(
      `[PDFViewer highlight] page=${page} pIdx=${pIdx} wIdx=${wIdx}`,
      `| storedPages[page] paras=${storedPages?.[page]?.paragraphs?.length ?? "none"}`,
      `| activeBbox=${JSON.stringify(activeBbox)}`,
      `| containerWidth=${containerWidth}`,
      `| pageWidth=${storedPages?.[page]?.width}`,
    );

    if (activeBbox) {
      // Clear any leftover window spans from a previous fallback pass.
      for (const sp of activeWindowSpansRef.current) {
        sp.classList.remove("nasoma-window");
      }
      activeWindowSpansRef.current = [];

      // Trigger a React re-render that places the overlay div.
      setParaOverlay({ pageIdx: page, bbox: activeBbox });
    } else {
      // No bbox — clear overlay and use the reading-window fallback.
      setParaOverlay(null);

      const winStart = Math.max(0,              wordEntryIdx - WINDOW_BEFORE);
      const winEnd   = Math.min(entries.length, wordEntryIdx + WINDOW_AFTER + 1);
      const newWindowSpans: HTMLElement[] = [];

      for (let i = winStart; i < winEnd; i++) {
        const sp = entries[i]?.span;
        if (sp) {
          sp.classList.add("nasoma-window");
          newWindowSpans.push(sp);
        }
      }
      activeWindowSpansRef.current = newWindowSpans;
    }

    // ── 3c. Apply word highlight ─────────────────────────────────────────
    const wordEntry = entries[wordEntryIdx];
    if (wordEntry) {
      wordEntry.span.classList.add("nasoma-word");
      activeWordSpanRef.current = wordEntry.span;

      // Keep the current word in view.  Use "nearest" so the container only
      // scrolls when the word is actually outside the visible area — firing
      // every ~400 ms with "center" would produce constant jittery animations.
      wordEntry.span.scrollIntoView({ behavior: "instant", block: "nearest" });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightPage, highlightParagraphIdx, currentWordInParagraph, paragraphWordBoundaries, storedPages, indexedCount]);

  // Clear stale highlights on page change
  //
  // Scrolling to the new page is handled by DocumentReader (which owns the
  // scroll container).

  useEffect(() => {
    if (highlightPage == null || highlightPage < 0) return;

    for (const sp of activeWindowSpansRef.current) {
      sp.classList.remove("nasoma-window");
    }
    activeWindowSpansRef.current = [];
    if (activeWordSpanRef.current) {
      activeWordSpanRef.current.classList.remove("nasoma-word");
      activeWordSpanRef.current = null;
    }
    setParaOverlay(null);
  }, [highlightPage]);

  // Render

  return (
    <div ref={containerRef} className="w-full">
      <style>{`
        .nasoma-window {
          background-color: rgba(99, 102, 241, 0.13);
          border-radius: 2px;
        }
        .nasoma-word {
          background-color: rgba(99, 102, 241, 0.82) !important;
          color: #fff !important;
          border-radius: 3px;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.35);
          transition: background-color 0.07s ease;
        }
      `}</style>

      <Document
        file={url}
        onLoadSuccess={(pdf) => {
          numPagesRef.current     = pdf.numPages;
          indexedCountRef.current = 0;
          wordEntriesRef.current  = new Array(pdf.numPages);
          setNumPages(pdf.numPages);
          // Notify parent that page wrapper divs are now in the DOM — safe
          // to scroll to the saved resume page.
          onDocumentLoaded?.(pdf.numPages);
        }}
        loading={<DocumentSkeleton width={containerWidth || 800} />}
        error={
          <div className="flex items-center justify-center h-64 text-destructive text-sm">
            Failed to load PDF.
          </div>
        }
      >
        <div className="flex flex-col items-center gap-6">
          {numPages > 0 &&
            Array.from({ length: numPages }, (_, i) => {
              const isActivated = renderedPages.has(i);
              return (
                <div
                  key={i + 1}
                  ref={(el) => { pageRefs.current[i] = el; }}
                  data-nasoma-page={i}
                  style={{ position: "relative" }}
                >
                  {isActivated ? (
                    <Page
                      pageNumber={i + 1}
                      width={containerWidth || 800}
                      renderMode="canvas"
                      renderTextLayer
                      renderAnnotationLayer
                      className="shadow-lg"
                      onRenderSuccess={() => {
                        requestAnimationFrame(() => indexPageWords(i));
                      }}
                    />
                  ) : (
                    /* Placeholder with correct dimensions so the scrollbar
                       accurately represents the full document length. */
                    <DocumentSkeleton width={containerWidth || 800} />
                  )}

                  {/* ── Paragraph bbox overlay ──────────────────────────────
                      Rendered as an absolutely-positioned div scaled from PDF
                      user-space coordinates to the canvas pixel dimensions.
                      pointer-events: none so text selection in the text layer
                      still works; z-index: 2 keeps it above the canvas but
                      the text layer and annotations remain interactive below. */}
                  {isActivated && paraOverlay?.pageIdx === i && (() => {
                    const pd = storedPages?.[i];
                    console.debug(
                      `[PDFViewer render overlay] page=${i}`,
                      `pd.width=${pd?.width} pd.height=${pd?.height}`,
                      `bbox=${JSON.stringify(paraOverlay.bbox)}`,
                      `containerWidth=${containerWidth}`,
                    );
                    if (!pd?.width || !pd?.height) return null;
                    const [bx0, by0, bx1, by1] = paraOverlay.bbox;
                    const w     = containerWidth || 800;
                    const scale = w / pd.width;
                    return (
                      <div
                        style={{
                          position:      "absolute",
                          left:          bx0 * scale,
                          top:           by0 * scale,
                          width:         (bx1 - bx0) * scale,
                          height:        (by1 - by0) * scale,
                          background:    "rgba(99, 102, 241, 0.25)",
                          border:        "2px solid rgba(99, 102, 241, 0.8)",
                          borderRadius:  "3px",
                          pointerEvents: "none",
                          zIndex:        10,
                          transition:    "top 0.15s ease, height 0.15s ease",
                          outline:       "1px dashed red",  // DEBUG: remove after testing
                        }}
                      />
                    );
                  })()}
                </div>
              );
            })}
        </div>
      </Document>
    </div>
  );
};

export default PDFViewer;
