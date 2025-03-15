// hooks/useDocumentReader.ts

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useSearchParams } from "next/navigation";

export interface DocumentData {
  id: string;
  content: string;
}

export interface ReaderState {
  text: string;
  paragraphs: string[];
  currentParagraphIndex: number;
  currentWordIndex: number;
  wordWindow: string[];
  windowStart: number;
  voice: string;
  voices: string[];
  isPlaying: boolean;
  speed: number;
  loading: boolean;
  error: string;
}

export const useDocumentReader = (): {
  state: ReaderState;
  setVoice: (voice: string) => void;
  setSpeed: (speed: number) => void;
  handlePlay: () => void;
  handleStop: () => void;
} => {
  const { documentId } = useParams();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ReaderState>({
    text: "",
    paragraphs: [],
    currentParagraphIndex: -1,
    currentWordIndex: -1,
    wordWindow: [],
    windowStart: 0,
    voice: "",
    voices: [],
    isPlaying: false,
    speed: 1,
    loading: true,
    error: "",
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Helper to update state fields
  const updateState = (updates: Partial<ReaderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const fetchDocument = async (id: string): Promise<void> => {
    const response = await axios.get<{ text: string }>(
      `${API_BASE_URL}/documents/${id}`
    );
    const documentText = response.data.text;

    localStorage.setItem(
      "currentDocument",
      JSON.stringify({ id, content: documentText })
    );
    updateState({
      text: documentText,
      paragraphs: documentText.split(/\n\s*\n/).filter(Boolean),
    });
  };

  const fetchVoices = async () => {
    try {
      const response = await axios.get<{ voices: string[] }>(
        `${API_BASE_URL}/voices`
      );
      const availableVoices = response.data.voices;
      updateState({
        voices: availableVoices,
        voice: availableVoices.length > 0 ? availableVoices[0] : "",
        error:
          availableVoices.length === 0
            ? "No voices available. Text-to-speech may not be available."
            : "",
      });
    } catch (error) {
      console.error("Error fetching voices:", error);
      updateState({
        error: "Failed to load voices. Text-to-speech may not work properly.",
      });
    }
  };

  // Effect to initialize document and voices
  useEffect(() => {
    const initializeDocument = async () => {
      updateState({ loading: true, error: "" });
      try {
        const storedDocument = localStorage.getItem("currentDocument");
        if (storedDocument) {
          const parsedDoc = JSON.parse(storedDocument);
          if (parsedDoc.id === documentId) {
            updateState({
              text: parsedDoc.content,
              paragraphs: parsedDoc.content.split(/\n\s*\n/).filter(Boolean),
            });
            await fetchVoices();
            const shouldAutoplay = searchParams.get("autoplay") === "true";
            if (shouldAutoplay && state.voices.length > 0) {
              setTimeout(handlePlay, 1000);
            }
            return;
          }
        }
        if (typeof documentId === "string") {
          await fetchDocument(documentId);
          await fetchVoices();
        }
        const shouldAutoplay = searchParams.get("autoplay") === "true";
        if (shouldAutoplay && state.voices.length > 0) {
          setTimeout(handlePlay, 1000);
        }
      } catch (err) {
        console.error("Error initializing document:", err);
        updateState({
          error: "Failed to load document. Please try again later.",
        });
      } finally {
        updateState({ loading: false });
      }
    };

    if (documentId) {
      initializeDocument();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, searchParams]);

  const handlePlay = () => {
    if (!state.text.trim() || !state.voice) {
      updateState({
        error: !state.text.trim()
          ? "No text to read."
          : "Please select a voice before playing.",
      });
      return;
    }

    updateState({ error: "", isPlaying: true });
    const url = `${API_BASE_URL}/speak?voice=${encodeURIComponent(
      state.voice
    )}&text=${encodeURIComponent(state.text)}&speed=${state.speed}`;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource(url);
    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.done) {
          handleStop();
          return;
        }
        if (data.newParagraph) {
          updateState({
            currentParagraphIndex: data.paragraphIndex,
            currentWordIndex: -1,
            wordWindow: [],
            windowStart: 0,
          });
        }
        if (data.wordWindow) {
          updateState({
            wordWindow: data.wordWindow,
            windowStart: data.windowStart,
            currentWordIndex: data.currentWordIndex,
          });
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
        updateState({ error: "Error processing text-to-speech data." });
        handleStop();
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error("EventSource failed:", error);
      updateState({ error: "Connection to text-to-speech service failed." });
      handleStop();
    };
  };

  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    updateState({
      isPlaying: false,
      currentParagraphIndex: -1,
      currentWordIndex: -1,
      wordWindow: [],
      windowStart: 0,
    });
  };

  return {
    state,
    setVoice: (voice: string) => updateState({ voice }),
    setSpeed: (speed: number) => updateState({ speed }),
    handlePlay,
    handleStop,
  };
};
