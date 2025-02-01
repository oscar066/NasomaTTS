import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [voice, setVoice] = useState("");
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/voices").then((response) => {
      setVoices(response.data.voices);
      setVoice("Karen"); // Default voice set to Karen
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
      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setText(response.data.text);
      setWords(response.data.text.split(" ")); // Split text into words
    } catch (error) {
      alert("Error extracting text from PDF");
    }
  };

  const handleSpeak = async () => {
    if (!text.trim()) return alert("No text available for speech");

    const eventSource = new EventSource("http://localhost:5000/speak");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.done) {
        setCurrentWordIndex(-1); // Reset highlight when done
        eventSource.close();
      } else {
        setCurrentWordIndex(data.index);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    axios.post("http://localhost:5000/speak", { text, voice });
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>📖 PDF Text-to-Speech with Highlighting 🎤</h2>

      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload}>Extract Text</button>

      {text && (
        <>
          <div style={{ width: "60%", margin: "20px auto", fontSize: "18px", lineHeight: "1.5" }}>
            {words.map((word, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: index === currentWordIndex ? "yellow" : "transparent",
                  padding: "2px",
                  borderRadius: "5px"
                }}
              >
                {word}{" "}
              </span>
            ))}
          </div>

          <label>Choose Voice:</label>
          <select value={voice} onChange={(e) => setVoice(e.target.value)}>
            {voices.map((v, index) => (
              <option key={index} value={v}>{v}</option>
            ))}
          </select>

          <button onClick={handleSpeak}>🔊 Speak</button>
        </>
      )}
    </div>
  );
}

export default App;
