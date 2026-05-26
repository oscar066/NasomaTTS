"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Skeleton } from "@/components/ui/skeleton";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// ── Position cache (sessionStorage) ─────────────────────────────────────────
// Word positions are expensive to extract from pdf.js. Cache them for the
// duration of the browser session so reopening the same doc is instant.

const CACHE_PREFIX = "pdv_pos:";

function loadPositionCache(url: string, numPages: number): PageData[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + url);
    if (!raw) return null;
    const parsed: PageData[] = JSON.parse(raw);
    // Invalidate if page count changed (e.g. different document behind same URL).
    if (!Array.isArray(parsed) || parsed.length !== numPages) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePositionCache(url: string, data: PageData[]): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + url, JSON.stringify(data));
  } catch {
    // sessionStorage full or unavailable — silently skip.
  }
}

// All positions stored as fractions (0–1) of page dimensions — scale-independent.
export interface WordPosition {
  x: number; // fraction of page width, from left
  y: number; // fraction of page height, from top
  w: number;
  h: number;
}

export interface PageData {
  /** Flat list of word positions extracted by pdf.js — used for the highlight overlay. */
  words: WordPosition[];
}

interface PDFViewerProps {
  url: string;
  onPagesReady?: (pages: PageData[]) => void;
  highlightPage?: number;    // 0-indexed page to show the highlight on
  highlightWordIdx?: number; // index into pages[highlightPage].words
}

// ── Document skeleton ────────────────────────────────────────────────────────

const LINE_WIDTHS = [
  "100%", "96%", "91%", "100%", "88%", "45%",
  "100%", "94%", "98%", "100%", "83%", "62%",
  "100%", "97%", "90%", "100%", "86%", "55%",
  "100%", "95%", "92%", "100%", "78%", "38%",
];

const DocumentSkeleton: React.FC<{ width: number }> = ({ width }) => {
  const height = Math.round(width * (11 / 8.5));
  const pad = Math.round(width * 0.09);

  const lineSlotPx = 20;
  const paragraphBonusPx = 16;
  const linesPerParagraph = 6;
  const bodyHeight = height - pad * 2 - pad * 0.6 * 2;
  const slotWithBonus = linesPerParagraph * lineSlotPx + paragraphBonusPx;
  const numParagraphs = Math.max(2, Math.ceil(bodyHeight / slotWithBonus));
  const totalLines = numParagraphs * linesPerParagraph;

  return (
    <div
      className="bg-background rounded-lg shadow-lg overflow-hidden"
      style={{ width, height }}
    >
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
}) => {
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(800);
  const [pageData, setPageData] = useState<PageData[]>([]);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Extraction progress — all refs so async callbacks never go stale.
  const numPagesRef = useRef(0);
  const pagesLoadedRef = useRef(0);
  const pageDataRef = useRef<PageData[]>([]);
  // Guard: track which page indices have already been extracted so a
  // container-resize re-render of <Page> doesn't re-run extraction.
  const extractedPagesRef = useRef<Set<number>>(new Set());

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // Reset all extraction state whenever the PDF URL changes.
  useEffect(() => {
    extractedPagesRef.current = new Set();
    numPagesRef.current = 0;
    pagesLoadedRef.current = 0;
    pageDataRef.current = [];
    setPageData([]);
    setNumPages(0);
  }, [url]);

  // Called by each <Page onLoadSuccess> — react-pdf has already loaded this
  // page proxy, so getTextContent() reads from the worker cache rather than
  // opening new byte-stream readers (which is what caused the AbortErrors).
  // Extract only word positions for the highlight overlay.
  // TTS text now comes from server-stored pages (PyMuPDF), so we no longer
  // need to re-extract paragraphs or full text here.
  const extractPageData = async (page: any, pageIndex: number) => {
    if (extractedPagesRef.current.has(pageIndex)) return;
    extractedPagesRef.current.add(pageIndex);

    let data: PageData = { words: [] };

    try {
      const nativeVp = page.getViewport({ scale: 1 });
      const nativeW = nativeVp.width;
      const nativeH = nativeVp.height;

      const textContent = await page.getTextContent({ disableCombineTextItems: true } as any);
      const words: WordPosition[] = [];

      for (const rawItem of textContent.items as any[]) {
        if (typeof rawItem.str !== "string" || !rawItem.str.trim()) continue;

        const { str, transform, width: pdfW, height: pdfItemH } = rawItem;
        const [, , , rawD, pdfX, pdfY] = transform as number[];
        const fontH = pdfItemH > 0 ? pdfItemH : Math.abs(rawD);
        if (fontH === 0) continue;

        const xFrac = pdfX / nativeW;
        const yFrac = 1 - (pdfY + fontH) / nativeH;
        const wFrac = pdfW / nativeW;
        const hFrac = fontH / nativeH;

        const tokens = str.split(/\s+/).filter(Boolean);
        const totalLen = str.length || 1;
        let cursor = 0;

        for (const token of tokens) {
          const idx = str.indexOf(token, cursor);
          words.push({
            x: xFrac + (idx / totalLen) * wFrac,
            y: yFrac,
            w: Math.max((token.length / totalLen) * wFrac, 0.001),
            h: hFrac,
          });
          cursor = idx + token.length;
        }
      }

      data = { words };
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error(`[PDFViewer] position extraction failed on page ${pageIndex + 1}:`, e);
      }
    }

    pageDataRef.current[pageIndex] = data;
    pagesLoadedRef.current += 1;

    if (pagesLoadedRef.current === numPagesRef.current) {
      const allPages = [...pageDataRef.current];
      setPageData(allPages);
      onPagesReady?.(allPages);
      // Persist positions so the next open of this document is instant.
      savePositionCache(url, allPages);
    }
  };

  // Scroll to the highlighted page when TTS advances.
  useEffect(() => {
    if (highlightPage == null || highlightPage < 0) return;
    const el = pageRefs.current[highlightPage];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightPage]);

  // Current word position for the highlight overlay.
  const highlightPos =
    highlightPage != null &&
    highlightPage >= 0 &&
    highlightWordIdx != null &&
    highlightWordIdx >= 0 &&
    pageData[highlightPage]?.words[highlightWordIdx]
      ? pageData[highlightPage].words[highlightWordIdx]
      : null;

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={url}
        onLoadSuccess={(pdf) => {
          numPagesRef.current = pdf.numPages;
          pagesLoadedRef.current = 0;
          extractedPagesRef.current = new Set();
          pageDataRef.current = new Array(pdf.numPages);
          setNumPages(pdf.numPages);

          // ── Cache hit: skip per-page extraction entirely ──────────────────
          const cached = loadPositionCache(url, pdf.numPages);
          if (cached) {
            // Mark every page as already extracted so extractPageData no-ops.
            for (let i = 0; i < pdf.numPages; i++) {
              extractedPagesRef.current.add(i);
              pageDataRef.current[i] = cached[i];
            }
            pagesLoadedRef.current = pdf.numPages;
            setPageData(cached);
            onPagesReady?.(cached);
          }
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
                className="relative"
              >
                <Page
                  pageNumber={i + 1}
                  width={containerWidth || 800}
                  renderTextLayer
                  renderAnnotationLayer
                  className="shadow-lg"
                  onLoadSuccess={(page) => extractPageData(page, i)}
                />

                {/* Highlight overlay — sits on top of the text layer */}
                {highlightPage === i && highlightPos && (
                  <div
                    className="absolute pointer-events-none rounded-sm z-10"
                    style={{
                      left: `${highlightPos.x * 100}%`,
                      top: `${highlightPos.y * 100}%`,
                      width: `${highlightPos.w * 100}%`,
                      height: `${highlightPos.h * 100}%`,
                      backgroundColor: "rgba(99, 102, 241, 0.35)",
                    }}
                  />
                )}
              </div>
            ))}
        </div>
      </Document>
    </div>
  );
};

export default PDFViewer;
