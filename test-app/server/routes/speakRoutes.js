// routes/speakRoutes.js

const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

// GET /api/speak
router.get('/', (req, res, next) => {
  const { text, voice } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  // Split the text into paragraphs by looking for one or more blank lines.
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  let index = 0;
  const selectedVoice = voice || 'Karen'; // Default voice if none specified
  const wpm = 300; // Speaking rate

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Function to speak a paragraph and chain to the next when finished.
  const speakNextParagraph = () => {
    if (index >= paragraphs.length) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const paragraph = paragraphs[index];

    // Immediately send an update to highlight the current paragraph.
    res.write(
      `data: ${JSON.stringify({ paragraph, index: index + 1 })}\n\n`
    );

    // Escape double quotes to avoid shell issues.
    const sanitizedParagraph = paragraph.replace(/"/g, '\\"');

    // Construct the say command. Note that exec waits until the command finishes.
    const command = `say -v ${selectedVoice} -r ${wpm} "${sanitizedParagraph}"`;

    // Execute the command and only once it completes, move on to the next paragraph.
    exec(command, (err) => {
      if (err) {
        console.error('Error with say command:', err);
        // Optionally, you can send an error update here.
      }
      index++;
      // Call recursively only after the current paragraph is fully spoken.
      speakNextParagraph();
    });
  };

  speakNextParagraph();
});

module.exports = router;