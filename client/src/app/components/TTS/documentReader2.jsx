"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Upload } from "lucide-react";

export default function DocumentReader() {
  const { documentId } = useParams();
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [paragraphs, setParagraphs] = useState([]);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [wordWindow, setWordWindow] = useState([]);
  const [windowStart, setWindowStart] = useState(0);
  const [voice, setVoice] = useState("");
  const [voices, setVoices] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (documentId) {
      fetchDocument(documentId);
    }
    fetchVoices();
  }, [documentId]);

  const fetchDocument = async (id) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/documents/${id}`
      );
      setText(response.data.text);
      setParagraphs(response.data.text.split(/\n\s*\n/).filter(Boolean));
    } catch (error) {
      console.error("Error fetching document text:", error);
    }
  };

  const fetchVoices = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/voices");
      setVoices(response.data.voices);
      setVoice(response.data.voices[0] || "");
    } catch (error) {
      console.error("Error fetching voices:", error);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/pdf/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setText(response.data.content);
      setParagraphs(response.data.content.split(/\n\s*\n/).filter(Boolean));
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
    }
  };

  const handlePlay = () => {
    if (!text.trim()) return;

    setIsPlaying(true);
    const url = `http://localhost:5000/api/speak?voice=${encodeURIComponent(
      voice
    )}&text=${encodeURIComponent(text)}&speed=${speed}`;
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
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error("EventSource failed:", error);
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

  return (
    <Card className="max-w-4xl mx-auto my-10">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
          📖 Document Text-to-Speech 🎤
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!documentId && !text && (
          <div className="flex items-center gap-4 mb-8">
            <Input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
            />
            <Button onClick={handleUpload} className="flex items-center gap-2">
              <Upload size={16} />
              Extract Text
            </Button>
          </div>
        )}

        {text && (
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
                  className="flex items-center gap-2"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? "Stop" : "Play"}
                </Button>
                <Button
                  onClick={handleStop}
                  className="flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Reset
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
