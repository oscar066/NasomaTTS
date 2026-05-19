"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NasomaLogo from "../Logo/nasoma-logo";
import TTSOverlay from "./TTSOverlay";
import { useDocumentReader } from "@/hooks/useDocumentReader";

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-secondary/30 animate-pulse">
      <span className="text-sm">Loading PDF viewer…</span>
    </div>
  ),
});

// Height of the fixed TTS overlay — keep in sync with TTSOverlay
const OVERLAY_HEIGHT = 160;
// Height of the sticky header
const HEADER_HEIGHT = 56; // h-14

const DocumentReader: React.FC = () => {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    state: {
      docName,
      text,
      paragraphs,
      currentParagraphIndex,
      currentWordIndex,
      wordWindow,
      windowStart,
      voice,
      voices,
      isPlaying,
      speed,
      loading,
      error,
    },
    setVoice,
    setSpeed,
    handlePlay,
    handleStop,
    skipToParagraph,
  } = useDocumentReader();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <NasomaLogo size="md" showPulse />
        <p className="text-muted-foreground text-sm">Loading document…</p>
        <div className="w-56 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-primary to-purple-600 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky header — h-14 to match dashboard */}
      <header className="sticky top-0 z-20 h-14 flex items-center bg-background border-b border-border px-4 gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-1 flex-shrink-0"
          onClick={() => router.push("/dashboard")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="w-px h-5 bg-border flex-shrink-0" />

        <NasomaLogo size="sm" showPulse={isPlaying} />

        <div className="w-px h-5 bg-border flex-shrink-0" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h1 className="text-sm font-semibold text-foreground truncate">
            {docName || "Untitled Document"}
          </h1>
        </div>

        {isPlaying && (
          <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-primary font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Playing
          </div>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1">
        {text ? (
          <div
            ref={contentRef}
            className="overflow-y-auto px-4 sm:px-8 py-6"
            style={{ height: `calc(100vh - ${HEADER_HEIGHT}px - ${OVERLAY_HEIGHT}px)` }}
          >
            <div className="max-w-2xl mx-auto space-y-2">
              {paragraphs.map((para, idx) => {
                const isActive = idx === currentParagraphIndex;
                const words = para.split(/\s+/).filter(Boolean);

                return (
                  <div
                    key={idx}
                    onClick={() => skipToParagraph(idx)}
                    className={`
                      group px-4 py-3 rounded-xl leading-relaxed text-base cursor-pointer
                      transition-all duration-200 border
                      ${isActive
                        ? "bg-primary/5 border-primary/20 shadow-sm"
                        : "border-transparent hover:bg-secondary/60 hover:border-border"
                      }
                    `}
                  >
                    {isActive && wordWindow.length > 0 ? (
                      <p className="leading-8">
                        {words.map((word, wIdx) => {
                          const isCurrent = wIdx === currentWordIndex;
                          const isPast = wIdx < currentWordIndex;
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
                      <p className={isActive ? "text-foreground" : "text-foreground/90"}>
                        {para}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No document content loaded.</p>
          </div>
        )}
      </main>

      {/* TTS overlay */}
      <TTSOverlay
        isPlaying={isPlaying}
        currentParagraphIndex={currentParagraphIndex}
        totalParagraphs={paragraphs.length}
        currentWordIndex={currentWordIndex}
        wordWindow={wordWindow}
        windowStart={windowStart}
        voice={voice}
        voices={voices}
        speed={speed}
        onPlay={handlePlay}
        onStop={handleStop}
        onPrevParagraph={() => skipToParagraph(currentParagraphIndex - 1)}
        onNextParagraph={() => skipToParagraph(currentParagraphIndex + 1)}
        onVoiceChange={setVoice}
        onSpeedChange={setSpeed}
      />
    </div>
  );
};

export default DocumentReader;
