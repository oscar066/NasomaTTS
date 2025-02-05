// src/components/TTS/DocumentReader.jsx

"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "next/navigation";

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

  // Fetch document text if a documentId is present.

  useEffect(() => {
    if (documentId) {
      axios
        .get(`http://localhost:5000/api/documents/${documentId}`)
        .then((response) => {
          setText(response.data.text);
          setParagraphs(response.data.text.split(/\n\s*\n/).filter(Boolean));
        })
        .catch((error) => {
          console.error("Error fetching document text:", error);
        });
    }
  }, [documentId]);

  // Fetch available voices on mount.
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/voices")
      .then((response) => {
        setVoices(response.data.voices);
        setVoice("Karen"); // default voice; adjust if needed
      })
      .catch((error) => {
        console.error("Error fetching voices:", error);
      });
  }, []);

  // Handle file upload if no documentId is provided.
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF file");

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/pdf/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setText(response.data.text);
      setParagraphs(response.data.text.split(/\n\s*\n/).filter(Boolean));
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      alert("Error extracting text from PDF");
    }
  };

  const handleSpeak = () => {
    if (!text.trim()) return alert("No text available for speech");

    // Build the SSE URL with query parameters.
    const url = `http://localhost:5000/api/speak?voice=${encodeURIComponent(
      voice
    )}&text=${encodeURIComponent(text)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.done) {
          setCurrentParagraphIndex(-1);
          setCurrentWordIndex(-1);
          setWordWindow([]);
          setWindowStart(0);
          eventSource.close();
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

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      eventSource.close();
    };
  };

  return (
    <div className="max-w-3xl mx-auto my-10 p-5 bg-white rounded-lg shadow-md text-center">
      <h2 className="mb-5 text-2xl font-semibold">
        📖 Document Text-to-Speech 🎤
      </h2>

      {/* Show upload section if no document text exists */}
      {!documentId && !text && (
        <div className="flex justify-center items-center gap-2.5 mb-8">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="p-2 text-base border border-gray-300 rounded"
          />
          <button
            onClick={handleUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors duration-300"
          >
            Extract Text
          </button>
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

          <div className="mt-5 flex justify-center items-center gap-4 flex-wrap">
            <label htmlFor="voiceSelect" className="text-lg">
              Choose Voice:
            </label>
            <select
              id="voiceSelect"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="p-2 text-base rounded border border-gray-300"
            >
              {voices.map((v, index) => (
                <option key={index} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button
              onClick={handleSpeak}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors duration-300"
            >
              🔊 Speak
            </button>
          </div>
        </>
      )}
    </div>
  );
}
