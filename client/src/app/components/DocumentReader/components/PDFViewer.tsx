"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Skeleton } from "@/components/ui/skeleton";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// All positions stored as fractions (0–1) of page dimensions — scale-independent.
export interface WordPosition {
  x: number; // fraction of page width, from left
  y: number; // fraction of page height, from top
  w: number;
  h: number;
}

export interface PageData {
  text: string;
  paragraphs: string[];
  paragraphWordCounts: number[];
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
  const extractedRef = useRef(false);
  // Reuse the PDFDocumentProxy that react-pdf already loaded — avoids a second fetch.
  const pdfDocRef = useRef<any>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setContainerWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // Extract word positions once the document and container width are both ready.
  useEffect(() => {
    if (!numPages || containerWidth <= 0 || extractedRef.current || !pdfDocRef.current) return;
    extractedRef.current = true;

    let cancelled = false;

    const extract = async () => {
      try {
        const pdf = pdfDocRef.current;
        const pages: PageData[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;

          const page = await pdf.getPage(pageNum);
          const nativeVp = page.getViewport({ scale: 1 });
          const nativeW = nativeVp.width;
          const nativeH = nativeVp.height;

          const textContent = await page.getTextContent();

          const words: WordPosition[] = [];
          const rawParts: string[] = [];

          for (const rawItem of textContent.items as any[]) {
            if (typeof rawItem.str !== "string") {
              if (rawItem.hasEOL) rawParts.push("\n");
              continue;
            }

            const { str, transform, width: pdfW, height: pdfItemH, hasEOL } = rawItem;

            if (!str.trim()) {
              if (hasEOL) rawParts.push("\n");
              continue;
            }

            rawParts.push(str);
            if (hasEOL) rawParts.push("\n");

            const [, , , rawD, pdfX, pdfY] = transform as number[];
            // Font height: prefer item.height; fall back to |transform[3]|
            const fontH = pdfItemH > 0 ? pdfItemH : Math.abs(rawD);
            if (fontH === 0) continue;

            // Convert PDF coordinates (origin bottom-left) to page fractions (origin top-left)
            const xFrac = pdfX / nativeW;
            const yFrac = 1 - (pdfY + fontH) / nativeH;
            const wFrac = pdfW / nativeW;
            const hFrac = fontH / nativeH;

            // Split text item into individual words with proportional x offsets
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

          const rawText = rawParts.join("").replace(/[ \t]{2,}/g, " ").trim();
          const paragraphs = rawText
            .split(/\n{2,}/)
            .map((p) => p.replace(/\n/g, " ").trim())
            .filter(Boolean);
          const paragraphWordCounts = paragraphs.map(
            (p) => p.split(/\s+/).filter(Boolean).length
          );

          pages.push({ text: rawText, paragraphs, paragraphWordCounts, words });
        }

        if (!cancelled) {
          setPageData(pages);
          onPagesReady?.(pages);
        }
      } catch (err) {
        console.error("[PDFViewer] text extraction failed:", err);
      }
    };

    extract();
    return () => { cancelled = true; };
  }, [numPages, containerWidth]);

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
          pdfDocRef.current = pdf;
          extractedRef.current = false;
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
                className="relative"
              >
                <Page
                  pageNumber={i + 1}
                  width={containerWidth || 800}
                  renderTextLayer
                  renderAnnotationLayer
                  className="shadow-lg"
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
