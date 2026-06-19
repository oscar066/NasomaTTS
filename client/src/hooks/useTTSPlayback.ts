/**
 * useTTSPlayback — TTS stream management and playback controls.
 *
 * Single responsibility: open and manage the SSE word-timing stream, drive the
 * browser Web Speech API fallback, and expose play/stop/skip controls.
 *
 * Design notes
 * ────────────
 * - `deps` (document state + active voice) arrive as plain values from the
 *   caller.  A `depsRef` is synchronously updated on every render so that all
 *   internal callbacks always see the latest values without stale closures.
 * - `stateRef` mirrors playback state for the same reason — callbacks like
 *   `openStream`'s async loop and `playPage` need the current speed/isPlaying
 *   even after many re-renders since they started.
 * - `playPageRef` breaks the circular reference between `playPage` and the
 *   `onDone` callback it passes to `openStream`.
 * - Cleanup (abort + browser TTS cancel) is handled inside this hook so the
 *   caller does not need to touch `abortRef` directly.
 */

import { useState, useRef, useEffect } from "react";
import { speakStream, documentsApi, StoredPage } from "@/lib/api";
import { saveLocalProgress } from "@/lib/progress";
import { useDocumentsStore } from "@/store/documents";
import { prefs } from "@/lib/preferences";
import { preferencesApi } from "@/lib/api";

// ── Public types

/** Values this hook reads from the wider application state. */
export interface TTSPlaybackDeps {
  /** Document ID — used to persist reading progress. */
  docId: string;
  /** Bearer token — used to authenticate progress saves. */
  token: string | undefined;
  /** 0-based page to resume playback from on first play. */
  initialPage: number;
  storedPages: StoredPage[];
  text: string;
  paragraphs: string[];
  pdfUrl: string | null;
  voice: string;
  ttsAvailable: boolean;
}

export interface PlaybackState {
  speed: number;
  isPlaying: boolean;
  currentParagraphIndex: number;
  currentWordIndex: number;
  absoluteWordIdx: number;
  currentWord: string;
  wordWindow: string[];
  windowStart: number;
  currentTTSPage: number;
  error: string;
}

export interface TTSPlaybackResult {
  state: PlaybackState;
  handlePlay: () => void;
  handleStop: () => void;
  skipToParagraph: (index: number) => void;
  setSpeed: (speed: number) => void;
}

// ── Hook

export const useTTSPlayback = (deps: TTSPlaybackDeps): TTSPlaybackResult => {
  const [state, setState] = useState<PlaybackState>({
    speed: prefs.getSpeed(),
    isPlaying: false,
    currentParagraphIndex: -1,
    currentWordIndex: -1,
    absoluteWordIdx: -1,
    currentWord: "",
    wordWindow: [],
    windowStart: 0,
    currentTTSPage: -1,
    error: "",
  });

  // Always-current refs — updated synchronously each render so async
  // callbacks and deferred timers never observe stale values.
  const stateRef = useRef(state);
  stateRef.current = state;

  const depsRef = useRef(deps);
  depsRef.current = deps;

  const synthRef    = useRef<SpeechSynthesisUtterance | null>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const playPageRef = useRef<((idx: number) => void) | null>(null);

  /**
   * The page to start/resume from.  Initialised from `deps.initialPage` and
   * updated whenever the user stops playback mid-document so the next play
   * resumes from the same spot.
   */
  const resumePageRef = useRef(deps.initialPage ?? 0);

  /**
   * Tracks the page that is *actively being played* — written synchronously
   * by `playPage` the instant a page starts, so `handleStop` can always read
   * the true current page without depending on React state (which lags one
   * render behind).
   */
  const currentPageRef = useRef<number>(-1);

  // When the document loads (initialPage arrives after async fetch), sync the
  // resume pointer and pre-scroll the PDF viewer to the saved page.
  useEffect(() => {
    const page = deps.initialPage ?? 0;
    resumePageRef.current = page;
    // Setting currentTTSPage causes PDFViewer to scroll to the saved page
    // even before the user presses play.
    if (page > 0) update({ currentTTSPage: page });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.initialPage]);

  const update = (patch: Partial<PlaybackState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // Progress persistence 

  /**
   * Save the current page to both localStorage (instant) and the backend
   * (cross-device sync, fire-and-forget).  Never throws.
   */
  const persistProgress = (page: number) => {
    const { docId, token } = depsRef.current;
    if (!docId) return;
    saveLocalProgress(docId, page);
    useDocumentsStore.getState().updateDocument(docId, { current_page: page });
    if (token) {
      documentsApi.saveProgress(docId, page, token).catch(() => {});
    }
  };

  // ── Cleanup on unmount

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── SSE stream via fetch POST

  const openStream = (
    text: string,
    voice: string,
    speed: number,
    paragraphOffset = 0,
    onDone?: () => void
  ) => {
    if (!text.trim()) { (onDone ?? handleStop)(); return; }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const wpm = Math.round(150 * speed);

    (async () => {
      try {
        const res = await speakStream(text, voice, wpm, ac.signal);
        if (!res.ok || !res.body) {
          update({ error: "TTS request failed." });
          handleStop();
          return;
        }

        const reader = res.body.getReader();
        const dec    = new TextDecoder();
        let buf      = "";
        let doneSignalled = false;

        const processChunk = (chunk: string) => {
          buf += chunk;
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                doneSignalled = true;
                (onDone ?? handleStop)();
                return true; // signal caller to stop
              }
              if (data.newParagraph) {
                update({
                  currentParagraphIndex: paragraphOffset + data.paragraphIndex,
                  currentWordIndex: -1,
                  absoluteWordIdx: data.absoluteWordIndex ?? -1,
                  wordWindow: [],
                  windowStart: 0,
                });
              }
              if (data.wordWindow != null) {
                update({
                  wordWindow: data.wordWindow,
                  windowStart: data.windowStart,
                  currentWordIndex: data.currentWordIndex,
                  absoluteWordIdx: data.absoluteWordIndex ?? -1,
                  currentWord: data.currentWord ?? "",
                });
              }
            } catch { /* malformed SSE frame — skip */ }
          }
          return false;
        };

        while (true) {
          const { done, value } = await reader.read();

          // Process any bytes that arrived alongside the close signal —
          // the Fetch streaming API sometimes delivers the final chunk
          // in the same read() call that sets done:true.
          if (value?.length) {
            const finished = processChunk(dec.decode(value, { stream: !done }));
            if (finished) return;
          }

          if (done) break;
        }

        // Flush any remaining buffered bytes (e.g. a partial SSE frame that
        // arrived just before the connection closed).
        if (buf.trim()) processChunk("");

        // The stream closed without an explicit data.done event — treat it as
        // done so playback advances to the next page instead of stopping cold.
        if (!doneSignalled) {
          (onDone ?? handleStop)();
        }
      } catch (e: unknown) {
        if ((e as { name?: string })?.name !== "AbortError") {
          update({ error: "Connection to TTS service failed." });
          handleStop();
        }
      }
    })();
  };

  // ── Browser Web Speech API fallback

  /**
   * `onEnd` overrides the default `handleStop` callback so callers can supply
   * their own "what to do when audio finishes" logic — e.g. page-advance in
   * playPage — without triggering a full stop that would abort the SSE stream.
   */
  const startBrowserAudio = (
    text: string,
    voiceURI: string,
    speed: number,
    onEnd?: () => void,
  ) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance  = new SpeechSynthesisUtterance(text);
    utterance.rate   = speed;
    if (voiceURI !== "browser-default") {
      const match = window.speechSynthesis
        .getVoices()
        .find((v) => v.voiceURI === voiceURI);
      if (match) utterance.voice = match;
    }
    utterance.onend  = onEnd ?? handleStop;
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // ── PDF page-by-page TTS

  const playPage = (startIdx: number) => {
    const { storedPages, voice, ttsAvailable, text } = depsRef.current;
    const { speed } = stateRef.current;

    // Legacy documents (no storedPages) — fall back to reading full text.
    if (storedPages.length === 0) {
      if (!text.trim()) { handleStop(); return; }
      currentPageRef.current = 0;
      update({
        currentTTSPage: 0,
        currentParagraphIndex: -1,
        currentWordIndex: -1,
        absoluteWordIdx: -1,
        wordWindow: [],
        windowStart: 0,
        isPlaying: true,
        error: "",
      });
      openStream(text, voice, speed, 0);
      if (!ttsAvailable) startBrowserAudio(text, voice, speed);
      return;
    }

    // Advance past blank pages.
    let idx = startIdx;
    while (idx < storedPages.length && !storedPages[idx].text.trim()) {
      idx++;
    }
    if (idx >= storedPages.length) {
      // All pages read — mark document as 100 % complete.
      persistProgress(storedPages.length);
      handleStop();
      return;
    }

    // Use paragraph-structured text when available so the SSE paragraphIndex
    // events align exactly with storedPages[idx].paragraphs.
    const pageData = storedPages[idx];
    const pageText = pageData.paragraphs?.length
      ? pageData.paragraphs.map((p) => p.text).join("\n\n")
      : pageData.text;

    // Write synchronously so handleStop always knows which page is active,
    // even before the React state update (setState) has re-rendered.
    currentPageRef.current = idx;

    update({
      currentTTSPage: idx,
      currentParagraphIndex: -1,
      currentWordIndex: -1,
      absoluteWordIdx: -1,
      wordWindow: [],
      windowStart: 0,
      isPlaying: true,
      error: "",
    });

    // Save progress each time a new page starts playing.
    persistProgress(idx);

    if (ttsAvailable) {
      // Server TTS: SSE stream provides both audio and word-timing events.
      // Let the stream's done-signal drive page advancement.
      openStream(pageText, voice, speed, 0, () => playPageRef.current?.(idx + 1));
    } else {
      // Browser TTS fallback: SSE stream provides only word-timing events
      // (no audio); the browser utterance handles audio.  Wire page-advance
      // to the utterance's `onend` so it fires when audio actually finishes.
      // Pass a no-op onDone to SSE so an early stream-close doesn't trigger
      // handleStop() and abort the utterance mid-sentence.
      openStream(pageText, voice, speed, 0, () => {});
      startBrowserAudio(pageText, voice, speed, () => playPageRef.current?.(idx + 1));
    }
  };

  // Keep the ref current so the onDone callback in openStream always calls
  // the latest version of playPage (avoids stale closure on page advance).
  playPageRef.current = playPage;

  // ── Playback controls

  const handlePlay = () => {
    const { voice }                         = depsRef.current;
    const { pdfUrl, storedPages, text, ttsAvailable } = depsRef.current;
    const { speed }                         = stateRef.current;

    if (!voice) {
      update({ error: "Please select a voice before playing." });
      return;
    }

    if (pdfUrl) {
      if (!storedPages.length && !text.trim()) {
        update({ error: "PDF is still loading — please wait a moment." });
        return;
      }
      // Resume from the last saved page (or 0 for a fresh start).
      playPage(resumePageRef.current);
      return;
    }

    if (!text.trim()) { update({ error: "No text to read." }); return; }
    update({ error: "", isPlaying: true });
    openStream(text, voice, speed);
    if (!ttsAvailable) startBrowserAudio(text, voice, speed);
  };

  const handleStop = () => {
    // currentPageRef is written synchronously by playPage so it is always
    // up-to-date regardless of whether React has re-rendered yet.
    const page = currentPageRef.current;
    if (page >= 0) {
      resumePageRef.current = page;
      persistProgress(page);
    }
    currentPageRef.current = -1;

    abortRef.current?.abort();
    abortRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    synthRef.current = null;
    update({
      isPlaying: false,
      currentParagraphIndex: -1,
      currentWordIndex: -1,
      absoluteWordIdx: -1,
      wordWindow: [],
      windowStart: 0,
      currentTTSPage: -1,
    });
  };

  const skipToParagraph = (index: number) => {
    const { pdfUrl, storedPages, ttsAvailable, paragraphs, voice } = depsRef.current;
    const { isPlaying, speed } = stateRef.current;

    if (pdfUrl) {
      const clamped = Math.max(0, Math.min(storedPages.length - 1, index));
      if (isPlaying) playPageRef.current?.(clamped);
      else update({ currentTTSPage: clamped });
      return;
    }

    if (index < 0 || index >= paragraphs.length) return;

    abortRef.current?.abort();

    if (isPlaying && voice) {
      const textFromIndex = paragraphs.slice(index).join("\n\n");
      openStream(textFromIndex, voice, speed, index);
      if (!ttsAvailable) {
        if (typeof window !== "undefined") window.speechSynthesis.cancel();
        startBrowserAudio(textFromIndex, voice, speed);
      }
    }

    update({
      currentParagraphIndex: index,
      currentWordIndex: -1,
      absoluteWordIdx: -1,
      wordWindow: [],
      windowStart: 0,
    });
  };

  return {
    state,
    handlePlay,
    handleStop,
    skipToParagraph,
    setSpeed: (speed: number) => {
      prefs.setSpeed(speed);
      update({ speed });
      const { token } = depsRef.current;
      if (token) preferencesApi.save(null, speed, token).catch(() => {});
    },
  };
};
