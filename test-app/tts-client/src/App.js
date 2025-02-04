import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [paragraphs, setParagraphs] = useState([]);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [wordWindow, setWordWindow] = useState([]);
  const [windowStart, setWindowStart] = useState(0);
  const [voice, setVoice] = useState("");
  const [voices, setVoices] = useState([]);

  // Fetch available voices from the server on mount.
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/voices")
      .then((response) => {
        setVoices(response.data.voices);
        setVoice("Karen"); // Default voice
      })
      .catch((error) => {
        console.error("Error fetching voices:", error);
      });
  }, []);

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
      // Split text into paragraphs using blank lines.
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

        // When done, reset states and close connection.
        if (data.done) {
          setCurrentParagraphIndex(-1);
          setCurrentWordIndex(-1);
          setWordWindow([]);
          setWindowStart(0);
          eventSource.close();
          return;
        }

        // New paragraph event.
        if (data.newParagraph) {
          setCurrentParagraphIndex(data.paragraphIndex);
          setCurrentWordIndex(-1);
          setWordWindow([]);
          setWindowStart(0);
        }

        // Update sliding window & word index when provided.
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
    <div className="container">
      <h2 className="title">📖 PDF Text-to-Speech 🎤</h2>

      <div className="upload-section">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="file-input"
        />
        <button onClick={handleUpload} className="button">
          Extract Text
        </button>
      </div>

      {text && (
        <>
          <div className="text-display">
            {paragraphs.map((para, index) => (
              <div
                key={index}
                className={`paragraph-wrapper ${
                  index === currentParagraphIndex ? "active" : ""
                }`}
              >
                <p className="paragraph">{para}</p>
                {/* Display sliding word window overlay for active paragraph */}
                {index === currentParagraphIndex && wordWindow.length > 0 && (
                  <div className="word-overlay">
                    {wordWindow.map((word, i) => {
                      // Calculate the global index for this word.
                      const globalIndex = windowStart + i;
                      return (
                        <span
                          key={i}
                          className={
                            globalIndex === currentWordIndex ? "highlight" : ""
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

          <div className="controls">
            <label htmlFor="voiceSelect" className="label">
              Choose Voice:
            </label>
            <select
              id="voiceSelect"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="select"
            >
              {voices.map((v, index) => (
                <option key={index} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button onClick={handleSpeak} className="button speak-button">
              🔊 Speak
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
