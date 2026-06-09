"use client";

/**
 * TextReader — plain-text document renderer with paragraph and word highlighting.
 *
 * Highlighting strategy
 * ─────────────────────
 * Both the active paragraph and the active word are derived from a single
 * `absoluteWordIdx` counter (the cumulative word index emitted by the SSE
 * stream).  This avoids any dependency on paragraph-index alignment between
 * the frontend split and the backend split — as long as both sides agree on
 * total word count the highlight is always correct.
 *
 * Visual hierarchy (Speechify-style)
 * ───────────────────────────────────
 *   1. Active paragraph  → distinct background tint + left accent border
 *   2. Current word      → solid filled pill inside the tinted paragraph
 *   3. Past words        → dimmed
 *   4. Inactive paragraphs → plain text
 */

import React, { useEffect, useRef } from "react";

interface TextReaderProps {
  paragraphs: string[];
  /** Cumulative word index across all paragraphs, from the SSE stream. -1 when idle. */
  absoluteWordIdx: number;
  overlayHeight: number;
  onSkipTo: (index: number) => void;
}

const TextReader: React.FC<TextReaderProps> = ({
  paragraphs,
  absoluteWordIdx,
  overlayHeight,
  onSkipTo,
}) => {
  // Pre-compute word arrays and cumulative word-count boundaries
  const paragraphWords = paragraphs.map((p) => p.split(/\s+/).filter(Boolean));

  const cumulativeCounts: number[] = [];
  paragraphWords.forEach((words, i) => {
    cumulativeCounts.push((cumulativeCounts[i - 1] ?? 0) + words.length);
  });

  // Derive active paragraph and word from absoluteWordIdx
  const activeParagraphIdx =
    absoluteWordIdx >= 0
      ? cumulativeCounts.findIndex((c) => absoluteWordIdx < c)
      : -1;

  const wordOffset =
    activeParagraphIdx > 0 ? cumulativeCounts[activeParagraphIdx - 1] : 0;

  const activeWordInParagraph =
    activeParagraphIdx >= 0 ? absoluteWordIdx - wordOffset : -1;

  // Auto-scroll the active paragraph into view
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeParagraphIdx >= 0 && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeParagraphIdx]);

  // Render
  return (
    <div className="overflow-y-auto h-full px-4 sm:px-8 pt-6">
      <div
        className="max-w-2xl mx-auto space-y-1"
        style={{ paddingBottom: `${overlayHeight}px` }}
      >
        {paragraphs.map((para, idx) => {
          const isActive = idx === activeParagraphIdx;
          const words    = paragraphWords[idx];

          return (
            <div
              key={idx}
              ref={isActive ? activeRef : null}
              onClick={() => onSkipTo(idx)}
              className={`
                px-5 py-3 rounded-2xl leading-relaxed text-base cursor-pointer
                transition-all duration-300
                ${isActive
                  ? "bg-primary/10 border-l-4 border-primary pl-4"
                  : "border-l-4 border-transparent hover:bg-secondary/50"
                }
              `}
            >
              {isActive ? (
                // Active paragraph — words always split into spans so there's
                // no layout jump when the first word event arrives.
                <p className="leading-9">
                  {words.map((word, wIdx) => {
                    const isCurrent = wIdx === activeWordInParagraph;
                    const isPast    = wIdx < activeWordInParagraph;
                    return (
                      <React.Fragment key={wIdx}>
                        <span
                          className={`
                            transition-all duration-75
                            ${isCurrent
                              ? "bg-primary text-white rounded-md px-1.5 py-0.5 font-semibold"
                              : isPast
                              ? "text-foreground/35"
                              : "text-foreground"
                            }
                          `}
                        >
                          {word}
                        </span>{" "}
                      </React.Fragment>
                    );
                  })}
                </p>
              ) : (
                <p className="text-foreground/75">{para}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TextReader;
