"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NasomaLogo from "../Logo/nasoma-logo";
import TTSOverlay            from "./components/TTSOverlay";
import DocumentReaderHeader  from "./components/DocumentReaderHeader";
import TextReader            from "./components/TextReader";
import AIActionsSidebar      from "./components/AIActionsSidebar";
import { useDocumentReader } from "@/hooks/useDocumentReader";

const PDFViewer = dynamic(() => import("./components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm">Loading PDF viewer…</span>
    </div>
  ),
});

const OVERLAY_HEIGHT = 180;
const HEADER_HEIGHT  = 56;

const DocumentReader: React.FC = () => {
  const router = useRouter();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const {
    state: {
      docName,
      text,
      pdfUrl,
      storedPages,
      paragraphs,
      currentParagraphIndex,
      currentWordIndex,
      absoluteWordIdx,
      wordWindow,
      windowStart,
      voice,
      voices,
      isPlaying,
      speed,
      loading,
      error,
      currentTTSPage,
    },
    setVoice,
    setSpeed,
    handlePlay,
    handleStop,
    skipToParagraph,
  } = useDocumentReader();

  const pdfScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pdfScrollRef.current || currentTTSPage < 0) return;
    const pageEl = pdfScrollRef.current.querySelector<HTMLElement>(
      `[data-nasoma-page="${currentTTSPage}"]`
    );
    pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentTTSPage]);

  // Must be above any early return to keep hook call order stable
  const paragraphWordBoundaries = useMemo(() => {
    const page = storedPages[currentTTSPage >= 0 ? currentTTSPage : 0];
    if (!page?.paragraphs?.length) return [];
    let total = 0;
    return page.paragraphs.map((p) => {
      total += p.text.split(/\s+/).filter(Boolean).length;
      return total;
    });
  }, [storedPages, currentTTSPage]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <NasomaLogo size="md" showPulse />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading document…</p>
      </div>
    );
  }

  const isPdfMode              = !!pdfUrl;
  const overlayParagraphIndex  = isPdfMode ? currentTTSPage     : currentParagraphIndex;
  const overlayTotalParagraphs = isPdfMode ? storedPages.length : paragraphs.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Sticky header ── */}
      <DocumentReaderHeader
        docName={docName}
        isPlaying={isPlaying}
        currentPage={overlayParagraphIndex}
        totalPages={overlayTotalParagraphs}
        onBack={() => { handleStop(); router.push("/dashboard"); }}
      />

      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <main
        className="flex-1 overflow-hidden transition-[margin] duration-300 ease-in-out"
        style={{
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          marginLeft: aiPanelOpen ? "min(448px, 100vw)" : 0,
        }}
      >
        {pdfUrl ? (
          <div ref={pdfScrollRef} className="overflow-y-auto bg-muted/20 h-full">
            <div className="max-w-4xl mx-auto px-6 py-6" style={{ paddingBottom: `${OVERLAY_HEIGHT}px` }}>
              <PDFViewer
                url={pdfUrl}
                highlightPage={currentTTSPage}
                highlightParagraphIdx={currentParagraphIndex}
                currentWordInParagraph={currentWordIndex}
                paragraphWordBoundaries={paragraphWordBoundaries}
              />
            </div>
          </div>
        ) : text ? (
          <TextReader
            paragraphs={paragraphs}
            absoluteWordIdx={absoluteWordIdx}
            overlayHeight={OVERLAY_HEIGHT}
            onSkipTo={skipToParagraph}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">No document content loaded.</p>
          </div>
        )}
      </main>

      <AIActionsSidebar onOpenChange={setAiPanelOpen} />

      <TTSOverlay
        isPlaying={isPlaying}
        aiPanelOpen={aiPanelOpen}
        currentParagraphIndex={overlayParagraphIndex}
        totalParagraphs={overlayTotalParagraphs}
        currentWordIndex={currentWordIndex}
        wordWindow={wordWindow}
        windowStart={windowStart}
        voice={voice}
        voices={voices}
        speed={speed}
        onPlay={handlePlay}
        onStop={handleStop}
        onPrevParagraph={() => skipToParagraph(overlayParagraphIndex - 1)}
        onNextParagraph={() => skipToParagraph(overlayParagraphIndex + 1)}
        onVoiceChange={setVoice}
        onSpeedChange={setSpeed}
      />

    </div>
  );
};

export default DocumentReader;
