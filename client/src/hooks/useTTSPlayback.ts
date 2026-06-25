/**
 * useTTSPlayback — TTS stream management and playback controls.
 *
 * Single responsibility: open and manage the SSE word-timing stream, drive
 * audio playback (Kokoro WAV or browser Web Speech API fallback), and expose
 * play/stop/skip controls.
 *
 * Design notes
 * ────────────
 * - When Kokoro TTS is available (`ttsAvailable = true`) and a document has
 *   paragraph-level data, playback advances paragraph by paragraph rather than
 *   page by page.  Each paragraph's WAV is fetched from the backend and played
 *   via an HTMLAudioElement; the SSE stream runs in parallel to drive word
 *   highlighting.
 * - A client-side audio queue (`audioQueueRef`) caches blob URLs for already-
 *   fetched paragraphs.  After each paragraph starts playing, the next 5 are
 *   prefetched in the background so they are ready before the client needs them.
 * - `depsRef` and `stateRef` mirror their React counterparts so async callbacks
 *   always read the latest values without stale closures.
 * - `playParagraphRef` and `playPageRef` break circular references in onDone /
 *   onended callbacks that would otherwise capture stale function instances.
 * - All cleanup (abort, audio pause, blob URL revocation) is centralised in
 *   `handleStop` and the unmount effect.
 */

import { useState, useRef, useEffect } from "react";
import { speakStream, fetchParagraphAudio, documentsApi, StoredPage } from "@/lib/api";
import { saveLocalProgress } from "@/lib/progress";
import { useDocumentsStore } from "@/store/documents";
import { prefs } from "@/lib/preferences";
import { preferencesApi } from "@/lib/api";

// Kokoro (GPU) voice IDs — everything else is routed to the browser Web Speech API.
const KOKORO_VOICE_IDS = new Set([
  // American Female
  "sophia", "luna", "aria", "bella", "zara", "iris", "nina", "nova", "river", "sarah", "sky",
  // American Male
  "oscar", "echo", "eli", "thor", "liam", "max", "onyx", "rex",
  // British Female
  "alice", "emma", "isabella", "lily",
  // British Male
  "daniel", "fable", "george", "lewis",
]);
const isKokoroVoice = (id: string) => KOKORO_VOICE_IDS.has(id);

// ── Public types

export interface TTSPlaybackDeps {
  docId: string;
  token: string | undefined;
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

  const stateRef = useRef(state);
  stateRef.current = state;

  const depsRef = useRef(deps);
  depsRef.current = deps;

  const synthRef         = useRef<SpeechSynthesisUtterance | null>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const playPageRef      = useRef<((idx: number) => void) | null>(null);
  const playParagraphRef = useRef<((pageIdx: number, paraIdx: number) => void) | null>(null);

  // Client-side audio queue: `${pageIdx}:${paraIdx}` → blob URL
  const audioQueueRef = useRef<Map<string, string>>(new Map());
  // Keys currently being fetched (prevents duplicate in-flight requests)
  const fetchingRef   = useRef<Set<string>>(new Set());

  // Currently playing HTMLAudioElement
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Pre-created Audio element for the next paragraph (eliminates transition gap)
  const nextAudioRef    = useRef<{ audio: HTMLAudioElement; page: number; para: number; voice: string } | null>(null);

  const resumePageRef  = useRef(deps.initialPage ?? 0);
  const currentPageRef = useRef<number>(-1);

  useEffect(() => {
    const page = deps.initialPage ?? 0;
    resumePageRef.current = page;
    if (page > 0) update({ currentTTSPage: page });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.initialPage]);

  const update = (patch: Partial<PlaybackState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // ── Progress persistence

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
      if (currentAudioRef.current) {
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current.pause();
      }
      nextAudioRef.current = null;
      // Release all blob URLs to free memory
      audioQueueRef.current.forEach((url) => URL.revokeObjectURL(url));
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
                return true;
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
          if (value?.length) {
            const finished = processChunk(dec.decode(value, { stream: !done }));
            if (finished) return;
          }
          if (done) break;
        }

        if (buf.trim()) processChunk("");
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

  // ── Kokoro paragraph-level audio helpers

  /** Cumulative paragraph index across all preceding pages. */
  const getAbsoluteParaIdx = (storedPages: StoredPage[], pageIdx: number, paraIdx: number): number => {
    let abs = 0;
    for (let p = 0; p < pageIdx; p++) {
      abs += storedPages[p].paragraphs?.length ?? 1;
    }
    return abs + paraIdx;
  };

  /** Next N paragraph coordinates (page, para) after (pageIdx, paraIdx). */
  const getNextNParagraphs = (
    storedPages: StoredPage[],
    pageIdx: number,
    paraIdx: number,
    n: number
  ): Array<[number, number]> => {
    const result: Array<[number, number]> = [];
    let p = pageIdx, q = paraIdx + 1;
    while (result.length < n && p < storedPages.length) {
      const paras = storedPages[p].paragraphs ?? [];
      while (q < paras.length && result.length < n) {
        result.push([p, q]);
        q++;
      }
      p++;
      q = 0;
    }
    return result;
  };

  /**
   * Fetch WAV audio for a paragraph and cache it as a blob URL.
   * Returns the blob URL, or null if unavailable / aborted.
   */
  const fetchParaAudio = async (
    pageIdx: number,
    paraIdx: number,
    voice: string,
    signal?: AbortSignal
  ): Promise<string | null> => {
    const key = `${pageIdx}:${paraIdx}:${voice}`;
    if (audioQueueRef.current.has(key)) return audioQueueRef.current.get(key)!;

    const { docId, token } = depsRef.current;
    if (!docId || !token) return null;

    try {
      const res = await fetchParagraphAudio(docId, pageIdx, paraIdx, voice, token, signal);
      if (!res.ok || signal?.aborted) return null;
      // JSON fallback hint means Kokoro is unavailable
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("audio")) return null;
      const blob = await res.blob();
      if (signal?.aborted) return null;
      const url = URL.createObjectURL(blob);
      audioQueueRef.current.set(key, url);
      return url;
    } catch {
      return null;
    }
  };

  /** Fire-and-forget prefetch of the next 5 paragraphs. */
  const prefetchAhead = (pageIdx: number, paraIdx: number, voice: string) => {
    const { storedPages } = depsRef.current;
    const upcoming = getNextNParagraphs(storedPages, pageIdx, paraIdx, 5);
    for (const [p, q] of upcoming) {
      const key = `${p}:${q}:${voice}`;
      if (!audioQueueRef.current.has(key) && !fetchingRef.current.has(key)) {
        fetchingRef.current.add(key);
        fetchParaAudio(p, q, voice)
          .finally(() => fetchingRef.current.delete(key));
      }
    }
  };

  // ── Paragraph-level Kokoro playback

  const playParagraph = (pageIdx: number, paraIdx: number) => {
    const { storedPages, voice } = depsRef.current;
    const { speed } = stateRef.current;

    const paras = storedPages[pageIdx]?.paragraphs ?? [];

    // No more paragraphs in this page — advance to the next non-empty page.
    if (paraIdx >= paras.length) {
      let nextPage = pageIdx + 1;
      while (nextPage < storedPages.length && !(storedPages[nextPage].paragraphs?.length)) {
        nextPage++;
      }
      if (nextPage >= storedPages.length) {
        persistProgress(storedPages.length);
        handleStop();
        return;
      }
      currentPageRef.current = nextPage;
      persistProgress(nextPage);
      playParagraphRef.current?.(nextPage, 0);
      return;
    }

    const paraText = paras[paraIdx].text?.trim();
    if (!paraText) {
      playParagraphRef.current?.(pageIdx, paraIdx + 1);
      return;
    }

    const absoluteIdx = getAbsoluteParaIdx(storedPages, pageIdx, paraIdx);

    currentPageRef.current = pageIdx;
    update({
      currentTTSPage: pageIdx,
      currentParagraphIndex: paraIdx,   // within-page index — PDFViewer uses storedPages[page].paragraphs[pIdx]
      currentWordIndex: -1,
      absoluteWordIdx: -1,
      wordWindow: [],
      windowStart: 0,
      isPlaying: true,
      error: "",
    });

    // SSE drives word highlighting — pass no-op onDone so audio controls pacing.
    openStream(paraText, voice, speed, paraIdx, () => {});

    // Stop any previously playing element before starting the new one.
    if (currentAudioRef.current) {
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const ac = abortRef.current;

    const startAudio = (audio: HTMLAudioElement) => {
      if (ac?.signal?.aborted) return;
      audio.playbackRate = stateRef.current.speed;
      currentAudioRef.current = audio;

      audio.onended = () => {
        currentAudioRef.current = null;
        playParagraphRef.current?.(pageIdx, paraIdx + 1);
      };
      audio.onerror = () => {
        currentAudioRef.current = null;
        playParagraphRef.current?.(pageIdx, paraIdx + 1);
      };

      audio.play().catch(() => {});

      // Pre-create the next paragraph's Audio element so it's decoded and ready.
      const nextCoords = getNextNParagraphs(storedPages, pageIdx, paraIdx, 1);
      if (nextCoords.length > 0) {
        const [np, nq] = nextCoords[0];
        const makeNext = (url: string) => {
          if (ac?.signal?.aborted) return;
          const a = new Audio(url);
          a.playbackRate = stateRef.current.speed;
          nextAudioRef.current = { audio: a, page: np, para: nq, voice };
        };
        const cached = audioQueueRef.current.get(`${np}:${nq}:${voice}`);
        if (cached) makeNext(cached);
        else fetchParaAudio(np, nq, voice).then((url) => { if (url) makeNext(url); });
      }
    };

    // Use pre-created Audio element if it matches this paragraph+voice.
    const preloaded = nextAudioRef.current;
    nextAudioRef.current = null;

    if (preloaded?.page === pageIdx && preloaded?.para === paraIdx && preloaded?.voice === voice) {
      startAudio(preloaded.audio);
    } else {
      fetchParaAudio(pageIdx, paraIdx, voice, ac?.signal ?? undefined).then((audioUrl) => {
        if (!audioUrl) return;
        startAudio(new Audio(audioUrl));
      });
    }
  };

  playParagraphRef.current = playParagraph;

  // ── PDF page-by-page TTS (Kokoro paragraphs or browser fallback)

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
      if (!ttsAvailable || !isKokoroVoice(voice)) startBrowserAudio(text, voice, speed);
      return;
    }

    // Advance past blank pages.
    let idx = startIdx;
    while (idx < storedPages.length && !storedPages[idx].text.trim()) {
      idx++;
    }
    if (idx >= storedPages.length) {
      persistProgress(storedPages.length);
      handleStop();
      return;
    }

    // Kokoro path: play paragraph-by-paragraph with audio queue + look-ahead.
    if (ttsAvailable && isKokoroVoice(voice) && storedPages[idx].paragraphs?.length) {
      currentPageRef.current = idx;
      persistProgress(idx);
      playParagraphRef.current?.(idx, 0);
      return;
    }

    // Browser TTS fallback: play the full page as a single block.
    const pageData = storedPages[idx];
    const pageText = pageData.paragraphs?.length
      ? pageData.paragraphs.map((p) => p.text).join("\n\n")
      : pageData.text;

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

    persistProgress(idx);
    // SSE drives word highlighting only — browser utterance onEnd controls paging.
    openStream(pageText, voice, speed, 0, () => {});
    startBrowserAudio(pageText, voice, speed, () => playPageRef.current?.(idx + 1));
  };

  playPageRef.current = playPage;

  // ── Playback controls

  const handlePlay = () => {
    const { voice, pdfUrl, storedPages, text, ttsAvailable } = depsRef.current;
    const { speed } = stateRef.current;

    if (!voice) {
      update({ error: "Please select a voice before playing." });
      return;
    }

    if (pdfUrl) {
      if (!storedPages.length && !text.trim()) {
        update({ error: "PDF is still loading — please wait a moment." });
        return;
      }
      playPage(resumePageRef.current);
      return;
    }

    if (!text.trim()) { update({ error: "No text to read." }); return; }
    update({ error: "", isPlaying: true });
    openStream(text, voice, speed);
    if (!ttsAvailable || !isKokoroVoice(voice)) startBrowserAudio(text, voice, speed);
  };

  const handleStop = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    nextAudioRef.current = null;

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
      if (!ttsAvailable || !isKokoroVoice(voice)) {
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
      if (currentAudioRef.current) {
        currentAudioRef.current.playbackRate = speed;
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.audio.playbackRate = speed;
      }
      const { token } = depsRef.current;
      if (token) preferencesApi.save(null, speed, token).catch(() => {});
    },
  };
};
