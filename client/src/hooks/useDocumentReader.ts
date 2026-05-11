import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { documentsApi, voicesApi, speakUrl, Voice } from "@/lib/api";
import { useSession } from "next-auth/react";

export interface ReaderState {
  docName: string;
  text: string;
  paragraphs: string[];
  currentParagraphIndex: number;
  currentWordIndex: number;
  wordWindow: string[];
  windowStart: number;
  voice: string;
  voices: Voice[];
  ttsAvailable: boolean;
  isPlaying: boolean;
  speed: number;
  loading: boolean;
  error: string;
}

export const useDocumentReader = () => {
  const params = useParams();
  const documentId = params?.documentId as string;
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [state, setState] = useState<ReaderState>({
    docName: "",
    text: "",
    paragraphs: [],
    currentParagraphIndex: -1,
    currentWordIndex: -1,
    wordWindow: [],
    windowStart: 0,
    voice: "",
    voices: [],
    ttsAvailable: false,
    isPlaying: false,
    speed: 1,
    loading: true,
    error: "",
  });

  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const update = (patch: Partial<ReaderState>) =>
    setState((prev) => ({ ...prev, ...patch }));

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
      // fall through to browser fallback
    }

    // NeuTTS unavailable — use browser speechSynthesis
    const loadBrowser = () => {
      const bv = getBrowserVoices();
      update({
        voices: bv,
        voice: bv[0]?.id ?? "",
        ttsAvailable: false,
        error: "",
      });
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      // getVoices() may be empty until the voiceschanged event fires
      if (window.speechSynthesis.getVoices().length > 0) {
        loadBrowser();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          loadBrowser();
          window.speechSynthesis.onvoiceschanged = null;
        };
        // Fallback if event never fires
        setTimeout(loadBrowser, 1000);
      }
    } else {
      update({ error: "No TTS available in this browser." });
    }
  };

  useEffect(() => {
    if (!documentId) {
      update({ error: "No document ID provided.", loading: false });
      return;
    }

    const init = async () => {
      update({ loading: true, error: "" });

      try {
        // Check localStorage cache first
        const cached = localStorage.getItem("currentDocument");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.id === documentId) {
            update({
              docName: parsed.title,
              text: parsed.content,
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
          JSON.stringify({ id: doc.id, title: doc.title, content: doc.content })
        );
        update({
          docName: doc.title,
          text: doc.content,
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

    return () => eventSourceRef.current?.close();
  }, [documentId]);

  // Auto-play when voices are ready and the URL says so
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

  const startSseStream = (text: string, voice: string, speed: number, paragraphOffset = 0) => {
    eventSourceRef.current?.close();
    const wpm = Math.round(150 * speed);
    const url = speakUrl(text, voice, wpm);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.done) { handleStop(); return; }
        if (data.newParagraph) {
          update({
            currentParagraphIndex: paragraphOffset + data.paragraphIndex,
            currentWordIndex: -1,
            wordWindow: [],
            windowStart: 0,
          });
        }
        if (data.wordWindow) {
          update({
            wordWindow: data.wordWindow,
            windowStart: data.windowStart,
            currentWordIndex: data.currentWordIndex,
          });
        }
      } catch {
        update({ error: "Error processing TTS data." });
        handleStop();
      }
    };

    es.onerror = () => {
      update({ error: "Connection to TTS service failed." });
      handleStop();
    };
  };

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

  const handlePlay = () => {
    if (!state.text.trim()) { update({ error: "No text to read." }); return; }
    if (!state.voice) { update({ error: "Please select a voice before playing." }); return; }

    update({ error: "", isPlaying: true });

    if (state.ttsAvailable) {
      startSseStream(state.text, state.voice, state.speed);
    } else {
      // Browser TTS: SSE for word highlighting + Web Speech API for audio
      startSseStream(state.text, state.voice, state.speed);
      startBrowserAudio(state.text, state.voice, state.speed);
    }
  };

  const handleStop = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    synthRef.current = null;
    update({
      isPlaying: false,
      currentParagraphIndex: -1,
      currentWordIndex: -1,
      wordWindow: [],
      windowStart: 0,
    });
  };

  const skipToParagraph = (index: number) => {
    setState((prev) => {
      if (index < 0 || index >= prev.paragraphs.length) return prev;

      eventSourceRef.current?.close();
      eventSourceRef.current = null;

      if (prev.isPlaying && prev.voice) {
        const textFromIndex = prev.paragraphs.slice(index).join("\n\n");
        startSseStream(textFromIndex, prev.voice, prev.speed, index);
        if (!prev.ttsAvailable) startBrowserAudio(textFromIndex, prev.voice, prev.speed);
      }

      return {
        ...prev,
        currentParagraphIndex: index,
        currentWordIndex: -1,
        wordWindow: [],
        windowStart: 0,
      };
    });
  };

  return {
    state,
    setVoice: (voice: string) => update({ voice }),
    setSpeed: (speed: number) => update({ speed }),
    handlePlay,
    handleStop,
    skipToParagraph,
  };
};
