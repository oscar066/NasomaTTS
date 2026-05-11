"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import NasomaLogo from "../Logo/nasoma-logo";
import TTSOverlay from "./TTSOverlay";
import { useDocumentReader } from "@/hooks/useDocumentReader";

// Load the PDF viewer client-side only (it uses browser APIs)
const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-100">
      <div className="animate-pulse text-sm">Loading PDF viewer…</div>
    </div>
  ),
});

const OVERLAY_HEIGHT = 160; // px — keep in sync with TTSOverlay height

const DocumentReader: React.FC = () => {
  const router = useRouter();
  const {
    state: {
      docName,
      text,
      paragraphs,
      pdfUrl,
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <NasomaLogo size="md" showPulse />
        <p className="text-gray-500 text-sm">Loading document…</p>
        <Progress value={45} className="w-56" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Minimal sticky header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => router.push("/dashboard")}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <NasomaLogo size="sm" showPulse={isPlaying} />
          <h1 className="text-base font-semibold text-gray-800 truncate flex-1">
            {docName || "Untitled Document"}
          </h1>
        </div>
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

      {/* Main content — PDF viewer or text fallback */}
      <main className="flex-1">
        {pdfUrl ? (
          <PDFViewer url={pdfUrl} bottomOffset={OVERLAY_HEIGHT} />
        ) : text ? (
          // Text-only fallback (documents without a stored PDF)
          <div
            className="overflow-y-auto px-6 py-6"
            style={{ height: `calc(100vh - 52px - ${OVERLAY_HEIGHT}px)` }}
          >
            <div className="max-w-3xl mx-auto space-y-4">
              {paragraphs.map((para, idx) => (
                <div
                  key={idx}
                  onClick={() => skipToParagraph(idx)}
                  className={`p-4 rounded-lg leading-relaxed text-base cursor-pointer transition-colors ${
                    idx === currentParagraphIndex
                      ? "bg-blue-50 border-l-4 border-blue-400"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {idx === currentParagraphIndex && wordWindow.length > 0 ? (
                    <p>
                      {para.split(/\s+/).filter(Boolean).map((word, wIdx) => (
                        <React.Fragment key={wIdx}>
                          <span
                            className={
                              wIdx === currentWordIndex
                                ? "bg-yellow-300 rounded px-0.5 font-semibold"
                                : wIdx < currentWordIndex
                                ? "text-gray-400"
                                : ""
                            }
                          >
                            {word}
                          </span>{" "}
                        </React.Fragment>
                      ))}
                    </p>
                  ) : (
                    <p>{para}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
            <AlertCircle className="h-8 w-8" />
            <p>No document loaded</p>
          </div>
        )}
      </main>

      {/* Speechify-style TTS overlay */}
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
