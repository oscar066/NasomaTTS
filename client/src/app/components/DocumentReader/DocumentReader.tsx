"use client";

import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NasomaLogo from "../Logo/nasoma-logo";
import TTSOverlay            from "./components/TTSOverlay";
import DocumentReaderHeader  from "./components/DocumentReaderHeader";
import TextReader            from "./components/TextReader";
import AIActionsSidebar      from "./components/AIActionsSidebar";
import { useDocumentReader } from "@/hooks/useDocumentReader";
import { documentsApi }      from "@/lib/api";
import { useDocumentsStore } from "@/store/documents";
import { useSession }        from "next-auth/react";

const PDFViewer = dynamic(() => import("./components/PDFViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-11/12" />
          <div className="h-3 bg-muted rounded w-4/5" />
        </div>
      ))}
    </div>
  ),
});

const OVERLAY_HEIGHT = 180;
const HEADER_HEIGHT  = 56;

const DocumentReader: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const userPlan = session?.user?.plan ?? "free";
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const { updateDocument } = useDocumentsStore();

  const {
    docId,
    token,
    state: {
      docName,
      text,
      pdfUrl,
      storedPages,
      paragraphs,
      paragraphTypes,
      currentParagraphIndex,
      currentWordIndex,
      absoluteWordIdx,
      wordWindow,
      windowStart,
      voice,
      voices,
      isPlaying,
      speed,
      totalWordCount,
      ttsAvailable,
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

  // Set to true once PDFViewer signals its page wrapper divs are in the DOM.
  // We can't scroll to a page before that because querySelector returns null.
  // Reset whenever the PDF URL changes so navigating between documents
  // re-triggers the initial scroll.
  const [pdfLoaded, setPdfLoaded] = useState(false);
  useEffect(() => { setPdfLoaded(false); }, [pdfUrl]);

  const scrollToTTSPage = useCallback((page: number) => {
    if (!pdfScrollRef.current || page < 0) return;
    const pageEl = pdfScrollRef.current.querySelector<HTMLElement>(
      `[data-nasoma-page="${page}"]`
    );
    pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Scroll to the active TTS page on page advance, initial load, and play.
  useEffect(() => {
    scrollToTTSPage(currentTTSPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTTSPage, pdfLoaded, isPlaying, scrollToTTSPage]);

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
      <div className="min-h-screen flex flex-col bg-background">
        {/* Fake header */}
        <div className="h-14 border-b border-border bg-background flex items-center px-4 gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1 max-w-xs h-4 rounded bg-muted animate-pulse" />
          <div className="ml-auto flex items-center gap-2">
            <div className="w-16 h-7 rounded-lg bg-muted animate-pulse" />
            <div className="w-20 h-7 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>

        {/* Fake content */}
        <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-48 gap-5 overflow-hidden">
          {/* Page label */}
          <div className="w-24 h-3 rounded bg-muted animate-pulse" />

          {/* Document page skeleton */}
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-8 space-y-4 shadow-sm">
            <div className="h-3 bg-muted rounded animate-pulse w-1/3 mb-6" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-muted rounded animate-pulse w-full" />
                <div className="h-3 bg-muted rounded animate-pulse w-11/12" />
                <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
              </div>
            ))}
            <div className="pt-4 space-y-2">
              <div className="h-3 bg-muted rounded animate-pulse w-full" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
            </div>
          </div>
        </div>

        {/* Fake playback bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur px-6 py-4 flex flex-col gap-3">
          <div className="w-full h-1 rounded-full bg-muted animate-pulse" />
          <div className="flex items-center justify-center gap-4">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
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
        onRename={async (newTitle) => {
          await documentsApi.rename(docId, newTitle, token ?? "");
          updateDocument(docId, { title: newTitle });
        }}
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
                onDocumentLoaded={() => setPdfLoaded(true)}
                highlightPage={currentTTSPage}
                highlightParagraphIdx={currentParagraphIndex}
                currentWordInParagraph={currentWordIndex}
                paragraphWordBoundaries={paragraphWordBoundaries}
                storedPages={storedPages}
              />
            </div>
          </div>
        ) : text ? (
          <TextReader
            paragraphs={paragraphs}
            paragraphTypes={paragraphTypes}
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

      <AIActionsSidebar
        onOpenChange={setAiPanelOpen}
        userPlan={userPlan}
        documentId={docId}
        token={token ?? ""}
      />

      <TTSOverlay
        isPlaying={isPlaying}
        aiPanelOpen={aiPanelOpen}
        userPlan={userPlan}
        currentParagraphIndex={overlayParagraphIndex}
        totalParagraphs={overlayTotalParagraphs}
        currentWordIndex={currentWordIndex}
        wordWindow={wordWindow}
        windowStart={windowStart}
        voice={voice}
        voices={voices}
        speed={speed}
        totalWordCount={totalWordCount}
        ttsAvailable={ttsAvailable}
        skipUnit={isPdfMode ? "page" : "paragraph"}
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
