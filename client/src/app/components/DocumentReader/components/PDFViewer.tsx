"use client";

/**
 * PDFViewer — renders a PDF and highlights the currently spoken word directly
 * inside the pdf.js text layer, Speechify-style.
 *
 * How it works
 * ────────────
 * react-pdf renders each page as two layers stacked on top of each other:
 *   1. A <canvas> with the visual raster of the page.
 *   2. A transparent `.react-pdf__Page__textContent` div containing real
 *      <span> elements for every text item — exactly positioned to match the
 *      canvas.  These spans are what make PDF text selectable.
 *
 * After each page's text layer is in the DOM (`onRenderSuccess` + retry loop),
 * we walk the DIRECT CHILD spans of the text layer and split any that contain
 * multiple words into individual word-level <span>s.  The result is stored in
 * `wordEntriesRef` as `{ span, text }[]` per page.
 *
 * Why direct children only + idempotency guard?
 * We mutate the original spans by replacing their text content with child
 * <span>s.  React strict-mode double-invokes effects, and container resizes
 * re-fire onRenderSuccess, both of which would re-run indexPageWords on the
 * same text layer.  A second run would call `span.textContent = ""` on the
 * already-split spans, destroying all word sub-spans and leaving only one
 * entry per original span — the "first word of each sentence" symptom.
 * Stamping `data-nasoma-indexed="1"` on the text layer element makes every
 * subsequent call a no-op while still allowing fresh indexing when the
 * element is recreated (URL change, page resize beyond react-pdf's threshold).
 *
 * Retry mechanism
 * A single `requestAnimationFrame` is occasionally not enough — react-pdf
 * populates the text layer asynchronously and the DOM may still be empty when
 * the rAF fires on slow renders.  We retry up to `INDEX_MAX_ATTEMPTS` times
 * with `INDEX_RETRY_MS` between attempts so no words are missed.
 *
 * Fuzzy word matching
 * The parent passes `highlightWord` (the exact string currently being spoken).
 * When the span at `highlightWordIdx` doesn't match that string we search
 * ±`FUZZY_RADIUS` positions for the closest textual match.  This corrects the
 * cumulative drift that occurs when PyMuPDF's word tokenisation differs from
 * pdf.js's.
 *
 * Highlight application
 * When `highlightWordIdx` (or `highlightWord`) changes we:
 *   1. Remove the `nasoma-highlight` class from the previously active span.
 *   2. Resolve the target span (direct index → fuzzy fallback).
 *   3. Add `nasoma-highlight` and scroll smoothly into view.
 *
 * This avoids all fractional coordinate maths and works correctly at any zoom
 * level because we are styling the actual DOM elements already laid out by the
 * browser.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
// AnnotationLayer.css and TextLayer.css are imported in globals.css so they
// are guaranteed to be present before this dynamically-loaded component mounts.
import { Skeleton } from "@/components/ui/skeleton";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum number of retries when waiting for the text layer DOM. */
const INDEX_MAX_ATTEMPTS = 12;

/** Milliseconds between indexing retry attempts. */
const INDEX_RETRY_MS = 60;

/** Search radius (in word positions) for fuzzy word matching. */
const FUZZY_RADIUS = 25;

// ── Public types ─────────────────────────────────────────────────────────────

/**
 * Minimal per-page metadata exposed to the parent.
 * Kept intentionally thin — the viewer owns word-span state internally.
 */
export interface PageData {
  /** Number of word spans indexed on this page by the viewer. */
  wordCount: number;
}

interface PDFViewerProps {
  url: string;
  /** Called once all pages have had their text layers indexed. */
  onPagesReady?: (pages: PageData[]) => void;
  /** 0-based page index that is currently being spoken. */
  highlightPage?: number;
  /** Word index within that page to highlight (maps to the entry array). */
  highlightWordIdx?: number;
  /**
   * The exact word string currently being spoken.
   * Used for text-based drift correction when the span at `highlightWordIdx`
   * doesn't match this string.
   */
  highlightWord?: string;
}

/** Internal word entry: a reference to the DOM span and its normalised text. */
interface WordEntry {
  span: HTMLElement;
  /** Lowercased, trimmed text of the word — used for fuzzy matching. */
  text: string;
}

// ── Document loading skeleton ────────────────────────────────────────────────

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

// ── PDFViewer ────────────────────────────────────────────────────────────────

const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  onPagesReady,
  highlightPage,
  highlightWordIdx,
  highlightWord,
}) => {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);

  // Refs to each page wrapper <div> — used for scroll-into-view on page change.
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Per-page flat arrays of `{ span, text }` entries built from the text layer.
   * Stored in a ref (not state) so highlight updates never trigger a re-render.
   */
  const wordEntriesRef = useRef<WordEntry[][]>([]);

  /**
   * The span that currently carries the `.nasoma-highlight` class.
   * Kept so we can remove it in O(1) without a DOM search.
   */
  const activeSpanRef = useRef<HTMLElement | null>(null);

  // Track how many pages have been indexed so we can fire onPagesReady once.
  const indexedCountRef = useRef(0);
  const numPagesRef = useRef(0);

  // ── Container resize observer ──────────────────────────────────────────────

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // ── Reset when URL changes ─────────────────────────────────────────────────

  useEffect(() => {
    wordEntriesRef.current = [];
    activeSpanRef.current = null;
    indexedCountRef.current = 0;
    numPagesRef.current = 0;
    setNumPages(0);
  }, [url]);

  // ── Text layer indexing ────────────────────────────────────────────────────

  /**
   * Walk the direct child `<span>`s of the text layer for `pageIndex`, split
   * any multi-word spans into individual word-level `<span>`s, and store the
   * result in `wordEntriesRef` as `WordEntry[]`.
   *
   * If the text layer is not yet in the DOM (async render), the function
   * schedules itself up to `INDEX_MAX_ATTEMPTS` times with `INDEX_RETRY_MS`
   * between attempts.  Once complete it stamps `data-nasoma-indexed="1"` on
   * the text layer element so any subsequent call is a no-op (idempotent).
   *
   * @param pageIndex - 0-based index of the page to index.
   * @param attempt   - How many times we have already tried (default 0).
   */
  const indexPageWords = useCallback(
    (pageIndex: number, attempt = 0) => {
      const pageEl = pageRefs.current[pageIndex];
      if (!pageEl) return;

      const textLayer = pageEl.querySelector(
        ".react-pdf__Page__textContent"
      ) as HTMLElement | null;

      // Text layer not yet in the DOM — retry after a short delay.
      if (!textLayer) {
        if (attempt < INDEX_MAX_ATTEMPTS) {
          setTimeout(() => indexPageWords(pageIndex, attempt + 1), INDEX_RETRY_MS);
        }
        return;
      }

      // ── Idempotency guard ──────────────────────────────────────────────────
      // React strict-mode double-invokes effects, and container resizes
      // retrigger onRenderSuccess — both cause indexPageWords to fire a second
      // time on the same text layer DOM element.  Without this guard the second
      // call executes `span.textContent = ""` which destroys the word sub-spans
      // written by the first pass, leaving one entry per original span and
      // producing the "only first word of each sentence highlighted" symptom.
      if (textLayer.dataset.nasomaIndexed === "1") return;

      // Snapshot direct child <span>s only — using `:scope > span` rather than
      // `children` to exclude any <br> / <div> elements some pdf.js builds add,
      // and to be explicit that we want only span elements.
      const originalSpans = Array.from(
        textLayer.querySelectorAll<HTMLElement>(":scope > span")
      );

      // Text layer is present but still empty — retry until populated.
      if (originalSpans.length === 0) {
        if (attempt < INDEX_MAX_ATTEMPTS) {
          setTimeout(() => indexPageWords(pageIndex, attempt + 1), INDEX_RETRY_MS);
        }
        return;
      }

      const entries: WordEntry[] = [];

      for (const span of originalSpans) {
        const rawText = span.textContent ?? "";
        if (!rawText.trim()) continue;

        // Split into alternating [word, whitespace, word, …] tokens.
        const tokens = rawText.split(/(\s+)/);
        const wordTokens = tokens.filter((t) => t.trim());

        if (wordTokens.length <= 1) {
          // Single-word span — reference it directly without DOM mutation.
          entries.push({ span, text: rawText.trim().toLowerCase() });
          continue;
        }

        // Multi-word span — replace content with one child <span> per word
        // and text nodes for whitespace so inline layout is preserved.
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

      // Mark this element so any re-invocation is a no-op.
      textLayer.dataset.nasomaIndexed = "1";
      wordEntriesRef.current[pageIndex] = entries;
      indexedCountRef.current += 1;

      // Visible in DevTools console — helps verify word counts match TTS stream.
      console.debug(
        `[PDFViewer] page ${pageIndex} indexed: ${entries.length} words` +
        ` from ${originalSpans.length} spans`
      );

      // Notify the parent once every page has been indexed.
      if (indexedCountRef.current === numPagesRef.current && onPagesReady) {
        const pages: PageData[] = Array.from(
          { length: numPagesRef.current },
          (_, i) => ({ wordCount: wordEntriesRef.current[i]?.length ?? 0 })
        );
        onPagesReady(pages);
      }
    },
    [onPagesReady]
  );

  // ── Highlight update ───────────────────────────────────────────────────────

  useEffect(() => {
    // Always remove the previous highlight first.
    if (activeSpanRef.current) {
      activeSpanRef.current.classList.remove("nasoma-highlight");
      activeSpanRef.current = null;
    }

    if (
      highlightPage == null || highlightPage < 0 ||
      highlightWordIdx == null || highlightWordIdx < 0
    ) return;

    const entries = wordEntriesRef.current[highlightPage];
    if (!entries || entries.length === 0) return;

    // ── Step 1: try the direct index ──────────────────────────────────────
    let targetIdx = Math.min(highlightWordIdx, entries.length - 1);

    // ── Step 2: fuzzy correction using the spoken word string ─────────────
    // If the entry at the direct index doesn't match the word the TTS engine
    // is currently reading, scan ±FUZZY_RADIUS positions for the best match.
    // This compensates for word-count divergence between PyMuPDF (backend) and
    // pdf.js (frontend) on complex PDFs (ligatures, hyphenated words, etc.).
    if (highlightWord) {
      const target = highlightWord.toLowerCase().replace(/[^a-z0-9]/g, "");
      const directText = entries[targetIdx]?.text.replace(/[^a-z0-9]/g, "") ?? "";

      if (directText !== target && target.length > 0) {
        const searchStart = Math.max(0, highlightWordIdx - FUZZY_RADIUS);
        const searchEnd   = Math.min(entries.length - 1, highlightWordIdx + FUZZY_RADIUS);

        let bestIdx   = targetIdx;
        let bestScore = 0;

        for (let i = searchStart; i <= searchEnd; i++) {
          const entryText = entries[i]?.text.replace(/[^a-z0-9]/g, "") ?? "";

          if (entryText === target) {
            // Exact match — accept immediately and stop searching.
            bestIdx = i;
            bestScore = 1;
            break;
          }

          // Partial overlap score: longer common prefix = higher score.
          if (entryText.length > 0 && target.length > 0) {
            const shorter = entryText.length < target.length ? entryText : target;
            const longer  = entryText.length < target.length ? target : entryText;
            if (longer.startsWith(shorter)) {
              const score = shorter.length / longer.length;
              if (score > bestScore) { bestScore = score; bestIdx = i; }
            }
          }
        }

        // Only apply the fuzzy result when confidence is high enough to avoid
        // jumping to the wrong word on a false partial match.
        if (bestScore >= 0.7) targetIdx = bestIdx;
      }
    }

    const entry = entries[targetIdx];
    if (!entry) return;

    entry.span.classList.add("nasoma-highlight");
    activeSpanRef.current = entry.span;

    // Scroll the highlighted word into the centre of the viewport.
    entry.span.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightPage, highlightWordIdx, highlightWord]);

  // ── Scroll to page when TTS advances to a new page ────────────────────────

  useEffect(() => {
    if (highlightPage == null || highlightPage < 0) return;
    // Only scroll to the page top when no word highlight is active yet
    // (i.e. at the very beginning of a new page transition).
    if (activeSpanRef.current) return;
    pageRefs.current[highlightPage]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightPage]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="w-full">
      {/*
        Highlight style injected inline so it co-locates with the component.
        A translucent indigo background + soft glow ring stays visible on both
        light and dark backgrounds without hiding the underlying text.
      */}
      <style>{`
        .nasoma-highlight {
          background-color: rgba(99, 102, 241, 0.28);
          border-radius: 3px;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.22);
          transition: background-color 0.07s ease;
        }
      `}</style>

      <Document
        file={url}
        onLoadSuccess={(pdf) => {
          numPagesRef.current = pdf.numPages;
          indexedCountRef.current = 0;
          wordEntriesRef.current = new Array(pdf.numPages);
          setNumPages(pdf.numPages);
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
            Array.from({ length: numPages }, (_, i) => (
              <div
                key={i + 1}
                ref={(el) => { pageRefs.current[i] = el; }}
              >
                <Page
                  pageNumber={i + 1}
                  width={containerWidth || 800}
                  renderMode="canvas"
                  renderTextLayer
                  renderAnnotationLayer
                  className="shadow-lg"
                  onRenderSuccess={() => {
                    // One rAF gives react-pdf time to insert the text layer DOM,
                    // then `indexPageWords` retries internally if still empty.
                    requestAnimationFrame(() => indexPageWords(i));
                  }}
                />
              </div>
            ))}
        </div>
      </Document>
    </div>
  );
};

export default PDFViewer;
