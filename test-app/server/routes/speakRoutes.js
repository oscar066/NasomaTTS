// routes/speakRoutes.js

const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

// POST /api/speak
router.post('/', (req, res, next) => {
  const { text, voice } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  // Split the text into words (removing extra whitespace).
  const words = text.split(/\s+/).filter(Boolean);
  let index = 0;
  const selectedVoice = voice || 'Karen'; // Default voice if none specified

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Function to speak the next word and send a highlight update.
  const speakNextWord = () => {
    if (index >= words.length) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const word = words[index];
    const command = `say -v ${selectedVoice} -r 300 "${word}"`; // 300 WPM speed

    exec(command, (err) => {
      if (err) {
        console.error('Error with say command:', err);
        // You may choose to notify the client or log the error.
      }
      // Send update about the current word and its position.
      res.write(`data: ${JSON.stringify({ word, index: index + 1 })}\n\n`);
      index++;
      // Use a delay to allow for smooth word highlighting. You can fine-tune this value.
      setTimeout(speakNextWord, 300);
    });
  };

  speakNextWord();
});

module.exports = router;
