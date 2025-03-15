// hooks/useDocumentReader.ts

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useSearchParams } from "next/navigation";

export interface DocumentData {
  id: string;
  title: string;
  content: string;
}

export interface ReaderState {
  docName: string;
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
  const params = useParams();
  const documentId = params?.documentId as string;
  const searchParams = useSearchParams();
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
    try {
      const response = await axios.get<{ title: string; text: string }>(
        `${API_BASE_URL}/documents/${id}`
      );

      const documentTitle = response.data.title;
      const documentText = response.data.text;

      localStorage.setItem(
        "currentDocument",
        JSON.stringify({ id, title: documentTitle, content: documentText })
      );

      updateState({
        docName: documentTitle,
        text: documentText,
        paragraphs: documentText.split(/\n\s*\n/).filter(Boolean),
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      updateState({
        error: "Failed to load document. Please try again later.",
        loading: false,
      });
    }
  };

  const fetchVoices = async () => {
    try {
      const response = await axios.get<{ voices: string[] }>(
        `${API_BASE_URL}/voices`
      );

      const availableVoices = response.data.voices;

      updateState({
        voices: availableVoices,
        voice: availableVoices.length > 0 ? availableVoices[0] : "karen",
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

  // Function to handle autoplay
  const checkAndAutoplay = () => {
    const shouldAutoplay = searchParams.get("autoplay") === "true";
    if (shouldAutoplay && state.voices.length > 0 && !state.isPlaying) {
      setTimeout(handlePlay, 1000);
    }
  };

  // Effect to initialize document and voices
  useEffect(() => {
    const initializeDocument = async () => {
      updateState({ loading: true, error: "" });

      try {
        // 1. Check the localStorage first
        const storedDocument = localStorage.getItem("currentDocument");
        if (storedDocument) {
          const parsedDoc = JSON.parse(storedDocument);
          if (parsedDoc.id === documentId) {
            // use local storage data
            updateState({
              docName: parsedDoc.title,
              text: parsedDoc.content,
              paragraphs: parsedDoc.content.split(/\n\s*\n/).filter(Boolean),
            });
            await fetchVoices();
            updateState({ loading: false });
            checkAndAutoplay();
            return;
          }
        }

        // 2. If not in localStorage, fetch from server
        if (typeof documentId === "string") {
          await fetchDocument(documentId);
          await fetchVoices();
          checkAndAutoplay();
        } else {
          updateState({
            error: "No document ID provided.",
            loading: false,
          });
        }
      } catch (err) {
        console.error("Error initializing document:", err);
        updateState({
          error: "Failed to load document. Please try again later.",
          loading: false,
        });
      }
    };

    if (documentId) {
      initializeDocument();
    } else {
      updateState({
        error: "No document ID provided.",
        loading: false,
      });
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
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

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Check if EventSource is available (it's not in SSR)
    if (typeof EventSource === "undefined") {
      updateState({
        error: "Text-to-speech is not supported in your browser.",
        isPlaying: false,
      });
      return;
    }

    try {
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
    } catch (err) {
      console.error("Error creating EventSource:", err);
      updateState({
        error: "Failed to connect to text-to-speech service.",
        isPlaying: false,
      });
    }
  };

  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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
