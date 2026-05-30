"use client";

/**
 * TextReader — plain-text document renderer with paragraph and word highlighting.
 *
 * Single responsibility: display a scrollable list of paragraphs and highlight
 * the currently spoken word within the active paragraph.
 *
 * Highlighting strategy
 * ─────────────────────
 * When a paragraph is active (`idx === currentParagraphIndex`) and the TTS
 * stream has started emitting word events (`wordWindow.length > 0`), each word
 * in that paragraph is rendered as an individual `<span>` coloured by state:
 *   - current word → primary accent + bold
 *   - past words   → muted (already read)
 *   - future words → normal foreground
 *
 * Clicking any paragraph calls `onSkipTo` so playback jumps to that position.
 */

import React from "react";

interface TextReaderProps {
  paragraphs: string[];
  currentParagraphIndex: number;
  currentWordIndex: number;
  wordWindow: string[];
  /**
   * Bottom padding applied to the scroll container so content is never
   * hidden behind the floating TTS overlay card.
   */
  overlayHeight: number;
  /** Called when the user clicks a paragraph to seek to it. */
  onSkipTo: (index: number) => void;
}

const TextReader: React.FC<TextReaderProps> = ({
  paragraphs,
  currentParagraphIndex,
  currentWordIndex,
  wordWindow,
  overlayHeight,
  onSkipTo,
}) => (
  <div className="overflow-y-auto h-full px-4 sm:px-8 pt-6">
    <div
      className="max-w-2xl mx-auto space-y-2"
      style={{ paddingBottom: `${overlayHeight}px` }}
    >
      {paragraphs.map((para, idx) => {
        const isActive = idx === currentParagraphIndex;
        const words    = para.split(/\s+/).filter(Boolean);

        return (
          <div
            key={idx}
            onClick={() => onSkipTo(idx)}
            className={`
              group px-4 py-3 rounded-xl leading-relaxed text-base cursor-pointer
              transition-all duration-200 border
              ${isActive
                ? "bg-primary/5 border-primary/20 shadow-sm"
                : "border-transparent hover:bg-secondary/60 hover:border-border"
              }
            `}
          >
            {/* Word-level highlight while this paragraph is being read */}
            {isActive && wordWindow.length > 0 ? (
              <p className="leading-8">
                {words.map((word, wIdx) => {
                  const isCurrent = wIdx === currentWordIndex;
                  const isPast    = wIdx < currentWordIndex;
                  return (
                    <React.Fragment key={wIdx}>
                      <span
                        className={`
                          transition-all duration-75 rounded px-0.5
                          ${isCurrent
                            ? "bg-primary/20 text-primary font-semibold"
                            : isPast
                            ? "text-muted-foreground"
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
              /* Plain paragraph when inactive or before playback starts */
              <p className={isActive ? "text-foreground" : "text-foreground/90"}>
                {para}
              </p>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default TextReader;
