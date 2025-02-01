import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [paragraphs, setParagraphs] = useState([]);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);
  const [voice, setVoice] = useState("");
  const [voices, setVoices] = useState([]);

  // Fetch available voices on component mount
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/voices")
      .then((response) => {
        setVoices(response.data.voices);
        setVoice("Karen"); // Default voice set to Karen
      })
      .catch((error) => {
        console.error("Error fetching voices:", error);
      });
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a PDF file");
      return;
    }
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/pdf/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setText(response.data.text);
      // Split text into paragraphs using one or more blank lines as the delimiter
      setParagraphs(response.data.text.split(/\n\s*\n/).filter(Boolean));
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      alert("Error extracting text from PDF");
    }
  };

  const handleSpeak = () => {
    if (!text.trim()) {
      alert("No text available for speech");
      return;
    }
    // Build the URL with query parameters for text and voice
    const url = `http://localhost:5000/api/speak?voice=${encodeURIComponent(
      voice
    )}&text=${encodeURIComponent(text)}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.done) {
          setCurrentParagraphIndex(-1); // Reset highlight when done
          eventSource.close();
        } else {
          setCurrentParagraphIndex(data.index - 1); // Use 0-indexed position
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
      <h2 className="title">📖 PDF Text-to-Speech with Paragraph Highlighting 🎤</h2>

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
              <p
                key={index}
                className={`paragraph ${
                  index === currentParagraphIndex ? "highlight" : ""
                }`}
              >
                {para}
              </p>
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