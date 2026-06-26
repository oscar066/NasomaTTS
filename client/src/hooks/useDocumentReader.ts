/**
 * useDocumentReader — thin orchestrator hook.
 *
 * Composes three focused hooks into the single interface consumed by the
 * DocumentReader component:
 *
 *   useVoices        — voice catalogue (API + browser TTS fallback)
 *   useDocumentLoad  — document fetching and localStorage caching
 *   useTTSPlayback   — SSE stream, browser audio fallback, play/stop/skip
 *
 * The public return type is intentionally kept identical to the old monolithic
 * hook so nothing outside this file needs to change.
 *
 * Voices and the document are loaded in parallel (independent concerns) rather
 * than sequentially as they were in the old implementation.
 */

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Voice, StoredPage } from "@/lib/api";
import { useVoices }       from "./useVoices";
import { useDocumentLoad } from "./useDocumentLoad";
import { useTTSPlayback }  from "./useTTSPlayback";

// ── Re-exported for consumers that imported ReaderState from this module ─────

export interface ReaderState {
  docName: string;
  text: string;
  pdfUrl: string | null;

  /** Per-page text extracted server-side at upload (PyMuPDF). Primary TTS source for PDFs. */
  storedPages: StoredPage[];
  paragraphs: string[];
  paragraphTypes: ("heading" | "body")[];
  currentParagraphIndex: number;
  currentWordIndex: number;

  /**
   * Cumulative word index within the current TTS page as emitted by the SSE
   * stream.  Passed to PDFViewer as `highlightWordIdx`.
   */
  absoluteWordIdx: number;

  /** The exact word string currently being spoken — used for fuzzy drift correction. */
  currentWord: string;
  wordWindow: string[];
  windowStart: number;
  voice: string;
  voices: Voice[];
  ttsAvailable: boolean;
  isPlaying: boolean;
  speed: number;
  totalWordCount: number | null;
  loading: boolean;
  error: string;
  currentTTSPage: number;
}

// Hook

export const useDocumentReader = () => {
  const searchParams = useSearchParams();

  const doc      = useDocumentLoad();
  const voices   = useVoices(doc.token);
  const playback = useTTSPlayback({
    docId:        doc.documentId,
    token:        doc.token,
    initialPage:  doc.initialPage,
    storedPages:  doc.storedPages,
    text:         doc.text,
    paragraphs:   doc.paragraphs,
    pdfUrl:       doc.pdfUrl,
    voice:        voices.voice,
    ttsAvailable: voices.ttsAvailable,
  });

  // Load voices once on mount. Pass token when available so server prefs load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { voices.fetchVoices(doc.token); }, [doc.token]);

  // Autoplay when both the document and the voice list are ready.
  useEffect(() => {
    if (
      searchParams.get("autoplay") === "true" &&
      voices.voices.length > 0 &&
      !playback.state.isPlaying &&
      doc.text
    ) {
      const t = setTimeout(playback.handlePlay, 1000);
      return () => clearTimeout(t);
    }
  // Intentionally omit playback.handlePlay — it changes every render but we
  // only want to re-evaluate when voices/text become available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voices.voices, doc.text]);

  // Assemble the unified state object

  const state: ReaderState = {
    // Document
    docName:        doc.docName,
    text:           doc.text,
    pdfUrl:         doc.pdfUrl,
    storedPages:     doc.storedPages,
    paragraphs:      doc.paragraphs,
    paragraphTypes:  doc.paragraphTypes,
    totalWordCount:  doc.totalWordCount,
    loading:        doc.loading,
    // Merge errors: document load errors take precedence; TTS errors shown after
    error:      doc.error || playback.state.error,

    // Voices
    voice:        voices.voice,
    voices:       voices.voices,
    ttsAvailable: voices.ttsAvailable,

    // Playback (spread to keep the shape flat)
    speed:                  playback.state.speed,
    isPlaying:              playback.state.isPlaying,
    currentParagraphIndex:  playback.state.currentParagraphIndex,
    currentWordIndex:       playback.state.currentWordIndex,
    absoluteWordIdx:        playback.state.absoluteWordIdx,
    currentWord:            playback.state.currentWord,
    wordWindow:             playback.state.wordWindow,
    windowStart:            playback.state.windowStart,
    currentTTSPage:         playback.state.currentTTSPage,
  };

  return {
    state,
    docId:           doc.documentId,
    token:           doc.token,
    highlightWordIdx: playback.state.absoluteWordIdx,
    setVoice:        voices.setVoice,
    setSpeed:        playback.setSpeed,
    handlePlay:      playback.handlePlay,
    handleStop:      playback.handleStop,
    skipToParagraph: playback.skipToParagraph,
  };
};
