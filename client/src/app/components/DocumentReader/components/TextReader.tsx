"use client";

import React, { useEffect, useRef, useMemo } from "react";

interface TextReaderProps {
  paragraphs: string[];
  /** Parallel to paragraphs — "heading" for chapter/section titles. */
  paragraphTypes?: ("heading" | "body")[];
  /** Cumulative word index across all paragraphs, from the SSE stream. -1 when idle. */
  absoluteWordIdx: number;
  overlayHeight: number;
  onSkipTo: (index: number) => void;
}

// ── Memoized heading paragraph ────────────────────────────────────────────────

const HeadingItem = React.memo(function HeadingItem({
  text,
  idx,
  onSkipTo,
}: {
  text: string;
  idx: number;
  onSkipTo: (i: number) => void;
}) {
  return (
    <div onClick={() => onSkipTo(idx + 1)} className="mt-10 mb-3 cursor-pointer group">
      <h2 className="text-lg font-bold text-foreground tracking-wide uppercase group-hover:text-primary transition-colors">
        {text}
      </h2>
      <div className="h-px bg-border mt-2" />
    </div>
  );
});

// ── Memoized body paragraph ───────────────────────────────────────────────────

const BodyItem = React.memo(function BodyItem({
  text,
  idx,
  isActive,
  activeWordInParagraph,
  onSkipTo,
  activeRef,
}: {
  text: string;
  idx: number;
  isActive: boolean;
  activeWordInParagraph: number;
  onSkipTo: (i: number) => void;
  activeRef: React.RefCallback<HTMLDivElement> | null;
}) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  return (
    <div
      ref={activeRef}
      onClick={() => onSkipTo(idx)}
      className={`
        px-5 py-3 rounded-2xl leading-relaxed text-base cursor-pointer
        transition-all duration-300 mb-1
        ${isActive
          ? "bg-primary/10 border-l-4 border-primary pl-4"
          : "border-l-4 border-transparent hover:bg-secondary/50"
        }
      `}
    >
      {isActive ? (
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
        <p className="text-foreground/75">{text}</p>
      )}
    </div>
  );
});

// ── TextReader ────────────────────────────────────────────────────────────────

const TextReader: React.FC<TextReaderProps> = ({
  paragraphs,
  paragraphTypes,
  absoluteWordIdx,
  overlayHeight,
  onSkipTo,
}) => {
  // Pre-compute word counts per paragraph once — headings contribute 0 words.
  const { cumulativeCounts } = useMemo(() => {
    const counts = paragraphs.map((p, i) =>
      paragraphTypes?.[i] === "heading" ? 0 : p.split(/\s+/).filter(Boolean).length
    );
    const cumulative: number[] = [];
    counts.forEach((wc, i) => cumulative.push((cumulative[i - 1] ?? 0) + wc));
    return { cumulativeCounts: cumulative };
  }, [paragraphs, paragraphTypes]);

  const activeParagraphIdx = useMemo(() =>
    absoluteWordIdx >= 0
      ? cumulativeCounts.findIndex((c) => absoluteWordIdx < c)
      : -1,
    [absoluteWordIdx, cumulativeCounts]
  );

  const wordOffset = activeParagraphIdx > 0 ? cumulativeCounts[activeParagraphIdx - 1] : 0;
  const activeWordInParagraph = activeParagraphIdx >= 0 ? absoluteWordIdx - wordOffset : -1;

  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeParagraphIdx >= 0 && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeParagraphIdx]);

  return (
    <div className="overflow-y-auto h-full px-4 sm:px-8 pt-6">
      <div className="max-w-2xl mx-auto" style={{ paddingBottom: `${overlayHeight}px` }}>
        {paragraphs.map((para, idx) => {
          const isHeading = paragraphTypes?.[idx] === "heading";
          const isActive  = idx === activeParagraphIdx;

          if (isHeading) {
            return <HeadingItem key={idx} text={para} idx={idx} onSkipTo={onSkipTo} />;
          }

          return (
            <BodyItem
              key={idx}
              text={para}
              idx={idx}
              isActive={isActive}
              activeWordInParagraph={isActive ? activeWordInParagraph : -1}
              onSkipTo={onSkipTo}
              activeRef={isActive ? (el) => { (activeRef as React.MutableRefObject<HTMLDivElement | null>).current = el; } : null}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TextReader;
