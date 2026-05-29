import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { documentsApi, voicesApi, speakStream, pdfProxyUrl, Voice, StoredPage } from "@/lib/api";
import { useSession } from "next-auth/react";
import type { PageData } from "@/app/components/DocumentReader/components/PDFViewer";

export interface ReaderState {
  docName: string;
  text: string;
  pdfUrl: string | null;
  /** Per-page text extracted server-side at upload (PyMuPDF). Primary TTS source for PDFs. */
  storedPages: StoredPage[];
  paragraphs: string[];
  currentParagraphIndex: number;
  currentWordIndex: number;
  /** Absolute word index across all paragraphs in the current page — used for PDF highlight. */
  absoluteWordIdx: number;
  /** Total words on this page (PyMuPDF count) — used to proportionally map to pdf.js positions. */
  totalWordsOnPage: number;
  wordWindow: string[];
  windowStart: number;
  voice: string;
  voices: Voice[];
  ttsAvailable: boolean;
  isPlaying: boolean;
  speed: number;
  loading: boolean;
  error: string;
  /** Word position data extracted by pdf.js — used for visual highlight overlay. */
  pageData: PageData[];
  currentTTSPage: number;
}

/**
 * Map the current TTS position to an index into pageData[page].words.
 *
 * TTS text comes from PyMuPDF; word positions come from pdf.js. The two
 * engines may produce slightly different word counts for the same page, so
 * we use a proportional mapping:
 *
 *   pdfJsIdx = round( (absoluteWordIdx / totalWordsOnPage) * pdfjsWordCount )
 *
 * This keeps the highlight in the right area even when counts diverge by a
 * few percent (typical for real-world PDFs).
 */
function computeHighlightWordIdx(state: ReaderState): number {
  if (state.currentTTSPage < 0 || state.absoluteWordIdx < 0) return -1;
  const page = state.pageData[state.currentTTSPage];
  if (!page || page.words.length === 0) return -1;

  const total = state.totalWordsOnPage;
  if (total <= 0) return -1;

  const fraction = state.absoluteWordIdx / total;
  return Math.min(Math.round(fraction * page.words.length), page.words.length - 1);
}

export const useDocumentReader = () => {
  const params = useParams();
  const documentId = params?.documentId as string;
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [state, setState] = useState<ReaderState>({
    docName: "",
    text: "",
    pdfUrl: null,
    storedPages: [],
    paragraphs: [],
    currentParagraphIndex: -1,
    currentWordIndex: -1,
    absoluteWordIdx: -1,
    totalWordsOnPage: 0,
    wordWindow: [],
    windowStart: 0,
    voice: "",
    voices: [],
    ttsAvailable: false,
    isPlaying: false,
    speed: 1,
    loading: true,
    error: "",
    pageData: [],
    currentTTSPage: -1,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const playPageRef = useRef<((idx: number) => void) | null>(null);

  const update = (patch: Partial<ReaderState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // ── Voice loading ─────────────────────────────────────────────────────────

  const getBrowserVoices = (): Voice[] => {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    const bv = window.speechSynthesis.getVoices();
    return bv.length > 0
      ? bv.map((v) => ({ id: v.voiceURI, label: v.name }))
      : [{ id: "browser-default", label: "Browser TTS" }];
  };

  const fetchVoices = async () => {
    try {
      const { voices, tts_available } = await voicesApi.list();
      if (tts_available && voices.length > 0) {
        update({ voices, voice: voices[0].id, ttsAvailable: true, error: "" });
        return;
      }
    } catch {
      // fall through to browser TTS
    }

    const loadBrowser = () => {
      const bv = getBrowserVoices();
      update({ voices: bv, voice: bv[0]?.id ?? "", ttsAvailable: false, error: "" });
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length > 0) {
        loadBrowser();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          loadBrowser();
          window.speechSynthesis.onvoiceschanged = null;
        };
        setTimeout(loadBrowser, 1000);
      }
    } else {
      update({ error: "No TTS available in this browser." });
    }
  };

  // ── Document loading ──────────────────────────────────────────────────────

  // Stop all playback when the component unmounts (navigation away).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!documentId) {
      update({ error: "No document ID provided.", loading: false });
      return;
    }

    const init = async () => {
      update({ loading: true, error: "" });
      try {
        const cached = localStorage.getItem("currentDocument");
        if (cached) {
          const parsed = JSON.parse(cached);
          // Only use the cache when the ID matches AND, for PDF documents,
          // the pages field is already stored.  An old cache entry without
          // pages will trigger a fresh fetch so storedPages is populated.
          // "pdf_url" key missing entirely = old cache entry (pre-PDF feature); safe to use.
          // "pdf_url" key present but null = MinIO upload failed at ingest time; force re-fetch
          //   so the viewer picks up a valid URL if the document was re-uploaded since.
          const pdfUrlMissing = !("pdf_url" in parsed);
          const cacheValid =
            parsed.id === documentId &&
            (pdfUrlMissing || parsed.pdf_url !== null) &&
            (!parsed.pdf_url || Array.isArray(parsed.pages));
          if (cacheValid) {
            update({
              docName: parsed.title,
              text: parsed.content,
              pdfUrl: parsed.pdf_url ? pdfProxyUrl(documentId) : null,
              storedPages: parsed.pages ?? [],
              paragraphs: parsed.content.split(/\n\s*\n/).filter(Boolean),
            });
            await fetchVoices();
            update({ loading: false });
            return;
          }
        }

        const doc = await documentsApi.get(documentId, session?.accessToken);
        localStorage.setItem(
          "currentDocument",
          JSON.stringify({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            pdf_url: doc.pdf_url,
            pages: doc.pages ?? null,
          })
        );
        update({
          docName: doc.title,
          text: doc.content,
          pdfUrl: doc.pdf_url ? pdfProxyUrl(documentId) : null,
          storedPages: doc.pages ?? [],
          paragraphs: doc.content.split(/\n\s*\n/).filter(Boolean),
        });
        await fetchVoices();
      } catch (err: any) {
        update({ error: err.message || "Failed to load document." });
      } finally {
        update({ loading: false });
      }
    };

    init();
    return () => abortRef.current?.abort();
  }, [documentId]);

  useEffect(() => {
    if (
      searchParams.get("autoplay") === "true" &&
      state.voices.length > 0 &&
      !state.isPlaying &&
      state.text
    ) {
      const t = setTimeout(handlePlay, 1000);
      return () => clearTimeout(t);
    }
  }, [state.voices, state.text]);

  // ── SSE stream via fetch POST ─────────────────────────────────────────────

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
        const dec = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += dec.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                (onDone ?? handleStop)();
                return;
              }
              if (data.newParagraph) {
                update({
                  currentParagraphIndex: paragraphOffset + data.paragraphIndex,
                  currentWordIndex: -1,
                  absoluteWordIdx: data.absoluteWordIndex ?? -1,
                  totalWordsOnPage: data.totalWords ?? 0,
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
                  totalWordsOnPage: data.totalWords ?? 0,
                });
              }
            } catch {}
          }
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          update({ error: "Connection to TTS service failed." });
          handleStop();
        }
      }
    })();
  };

  // ── Browser audio fallback ────────────────────────────────────────────────

  const startBrowserAudio = (text: string, voiceURI: string, speed: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    if (voiceURI !== "browser-default") {
      const match = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
      if (match) utterance.voice = match;
    }
    utterance.onend = () => handleStop();
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // ── PDF page-by-page TTS ──────────────────────────────────────────────────

  const playPage = (startIdx: number) => {
    const { storedPages, voice, speed, ttsAvailable, text } = stateRef.current;

    // ── No stored pages (legacy document) ────────────────────────────────
    // Documents uploaded before per-page server extraction was added don't
    // have storedPages.  Fall back to reading the full document text as a
    // single TTS stream so playback still works; the highlight overlay will
    // show on page 0 only, which is the best we can do without page boundaries.
    if (storedPages.length === 0) {
      if (!text.trim()) { handleStop(); return; }
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

    // ── Stored pages: page-by-page synthesis ─────────────────────────────
    // Advance past blank pages.
    let idx = startIdx;
    while (idx < storedPages.length && !storedPages[idx].text.trim()) {
      idx++;
    }

    if (idx >= storedPages.length) {
      handleStop();
      return;
    }

    const pageText = storedPages[idx].text;

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

    openStream(pageText, voice, speed, 0, () => playPageRef.current?.(idx + 1));

    if (!ttsAvailable) startBrowserAudio(pageText, voice, speed);
  };

  playPageRef.current = playPage;

  // ── Controls ──────────────────────────────────────────────────────────────

  const handlePlay = () => {
    if (!state.voice) { update({ error: "Please select a voice before playing." }); return; }

    if (state.pdfUrl) {
      const hasStored = state.storedPages.length > 0;
      const hasIndexed = state.pageData.length > 0;
      const hasText   = !!state.text.trim();

      // Require at least one text source before starting.
      if (!hasStored && !hasIndexed && !hasText) {
        update({ error: "PDF is still loading — please wait a moment." });
        return;
      }
      playPage(0);
      return;
    }

    if (!state.text.trim()) { update({ error: "No text to read." }); return; }
    update({ error: "", isPlaying: true });
    openStream(state.text, state.voice, state.speed);
    if (!state.ttsAvailable) startBrowserAudio(state.text, state.voice, state.speed);
  };

  const handleStop = () => {
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
    const { pdfUrl, storedPages, pageData, isPlaying, voice, ttsAvailable, speed, paragraphs } =
      stateRef.current;

    if (pdfUrl) {
      const limit = storedPages.length > 0 ? storedPages.length : pageData.length;
      const clamped = Math.max(0, Math.min(limit - 1, index));
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
    highlightWordIdx: computeHighlightWordIdx(state),
    setVoice: (voice: string) => update({ voice }),
    setSpeed: (speed: number) => update({ speed }),
    setPageData: (pages: PageData[]) => update({ pageData: pages }),
    handlePlay,
    handleStop,
    skipToParagraph,
  };
};
