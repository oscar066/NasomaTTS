const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { exec } = require("child_process");
const fs = require("fs");
const morgan = require("morgan");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));
app.use(helmet());

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDFs are allowed"), false);
    }
    cb(null, true);
  },
});

// 📝 Upload and extract text from PDF
app.post("/upload", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    fs.unlinkSync(req.file.path); // Remove file after processing
    res.json({ text: pdfData.text });
  } catch (error) {
    res.status(500).json({ error: "Error extracting text from PDF" });
  }
});

// 🎤 Get available voices
app.get("/voices", (req, res) => {
  exec("say -v '?'", (error, stdout) => {
    if (error) return res.status(500).json({ error: "Failed to fetch voices" });

    const voices = stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [name] = line.split(" ");
        return name;
      });

    res.json({ voices });
  });
});

// 🔊 Speak and highlight words
app.post("/speak", (req, res) => {
  const { text, voice } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  const words = text.split(" ");
  let index = 0;

  res.setHeader("Content-Type", "text/event-stream"); // Enable streaming
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  function speakNextWord() {
    if (index >= words.length) {
      res.write('data: {"done": true}\n\n');
      return res.end();
    }

    const word = words[index++];
    const selectedVoice = voice || "Karen"; // Default to Karen
    const command = `say -v ${selectedVoice} -r 300 "${word}"`; // Set speed to 300 WPM

    exec(command, () => {
      res.write(`data: ${JSON.stringify({ word, index })}\n\n`); // Send word updates
      setTimeout(speakNextWord, 300); // Adjust timing for smoother highlighting
    });
  }

  speakNextWord();
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));
