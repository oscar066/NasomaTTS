"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DocumentReader() {
  const { documentId } = useParams();
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [wordWindow, setWordWindow] = useState([]);
  const [windowStart, setWindowStart] = useState(0);
  const [voice, setVoice] = useState("");
  const [voices, setVoices] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  // Get base API URL from environment variable or use default
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const initializeDocument = async () => {
      setLoading(true);
      setError("");

      try {
        // Try to get document from localStorage first
        const storedDocument = localStorage.getItem("currentDocument");
        if (storedDocument) {
          const parsedDoc = JSON.parse(storedDocument);
          if (parsedDoc.id === documentId) {
            setText(parsedDoc.content);
            setParagraphs(parsedDoc.content.split(/\n\s*\n/).filter(Boolean));
            await fetchVoices();

            // Auto-play if specified
            const shouldAutoplay = searchParams.get("autoplay") === "true";
            if (shouldAutoplay) {
              // Wait until voices are loaded
              setTimeout(() => {
                if (voices.length > 0) {
                  handlePlay();
                }
              }, 1000);
            }
            return;
          }
        }

        // If not in localStorage, fetch from server
        if (typeof documentId === "string") {
          await fetchDocument(documentId);
          await fetchVoices();
        }

        // Auto-play if specified
        const shouldAutoplay = searchParams.get("autoplay") === "true";
        if (shouldAutoplay && voices.length > 0) {
          setTimeout(() => {
            handlePlay();
          }, 1000);
        }
      } catch (error) {
        console.error("Error initializing document:", error);
        setError("Failed to load document. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      initializeDocument();
    }

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [documentId, searchParams]);

  interface DocumentResponse {
    text: string;
  }

  interface Document {
    id: string;
    content: string;
  }

  interface DocumentApiResponse {
    text: string;
  }

  const fetchDocument = async (id: string): Promise<void> => {
    try {
      const response = await axios.get<DocumentApiResponse>(
        `${API_BASE_URL}/documents/${id}`
      );
      const documentText = response.data.text;

      // Save to localStorage for future use
      localStorage.setItem(
        "currentDocument",
        JSON.stringify({ id, content: documentText } as Document)
      );

      setText(documentText);
      setParagraphs(documentText.split(/\n\s*\n/).filter(Boolean));
    } catch (error) {
      console.error("Error fetching document:", error);
      throw error;
    }
  };

  const fetchVoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/voices`);
      const availableVoices = response.data.voices;
      setVoices(availableVoices);

      if (availableVoices.length > 0) {
        setVoice(availableVoices[0]);
      } else {
        setError("No voices available. Text-to-speech may not be available.");
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
      setError("Failed to load voices. Text-to-speech may not work properly.");
    }
  };

  const handlePlay = () => {
    if (!text.trim() || !voice) {
      setError(
        !text.trim()
          ? "No text to read."
          : "Please select a voice before playing."
      );
      return;
    }

    setError("");
    setIsPlaying(true);

    const url = `${API_BASE_URL}/speak?voice=${encodeURIComponent(
      voice
    )}&text=${encodeURIComponent(text)}&speed=${speed}`;

    // Close any existing connection
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
          setCurrentParagraphIndex(data.paragraphIndex);
          setCurrentWordIndex(-1);
          setWordWindow([]);
          setWindowStart(0);
        }

        if (data.wordWindow) {
          setWordWindow(data.wordWindow);
          setWindowStart(data.windowStart);
          setCurrentWordIndex(data.currentWordIndex);
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
        setError("Error processing text-to-speech data.");
        handleStop();
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error("EventSource failed:", error);
      setError("Connection to text-to-speech service failed.");
      handleStop();
    };
  };

  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setIsPlaying(false);
    setCurrentParagraphIndex(-1);
    setCurrentWordIndex(-1);
    setWordWindow([]);
    setWindowStart(0);
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto my-10">
        <CardContent className="flex justify-center items-center h-40">
          <div className="text-lg">Loading document...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto my-4">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
          📖 Document Reader 🎤
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {text ? (
          <>
            <div className="text-left mx-auto my-5 p-4 bg-gray-100 rounded max-h-[400px] overflow-y-auto">
              {paragraphs.map((para, index) => (
                <div
                  key={index}
                  className={`relative my-4 p-2 leading-relaxed ${
                    index === currentParagraphIndex
                      ? "bg-blue-100 rounded transition-colors duration-300"
                      : ""
                  }`}
                >
                  <p className="m-0">{para}</p>
                  {index === currentParagraphIndex && wordWindow.length > 0 && (
                    <div className="mt-2 text-lg text-gray-800 bg-gray-200 p-2 rounded inline-block">
                      {wordWindow.map((word, i) => {
                        const globalIndex = windowStart + i;
                        return (
                          <span
                            key={i}
                            className={
                              globalIndex === currentWordIndex
                                ? "bg-yellow-300 font-bold"
                                : ""
                            }
                          >
                            {word}{" "}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <label htmlFor="voiceSelect" className="text-lg min-w-[100px]">
                  Voice:
                </label>
                <Select value={voice} onValueChange={setVoice}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <label htmlFor="speedSlider" className="text-lg min-w-[100px]">
                  Speed:
                </label>
                <Slider
                  id="speedSlider"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={[speed]}
                  onValueChange={(value) => setSpeed(value[0])}
                  className="w-[180px]"
                />
                <span>{speed.toFixed(1)}x</span>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  onClick={isPlaying ? handleStop : handlePlay}
                  disabled={!voice}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? "Stop" : "Play"}
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={!isPlaying}
                  className="flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Reset
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No document content available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
