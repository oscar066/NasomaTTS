// routes/speakRoutes.js
const express = require("express");
const { execFile } = require("child_process");

const router = express.Router();

router.get("/", (req, res) => {
  const { text, voice } = req.query;
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  // Split the input text into paragraphs using one or more blank lines.
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  let paragraphIndex = 0;

  // Use the provided voice or fall back to a default.
  const selectedVoice = voice || "Karen";

  // Speaking settings.
  const wpm = 300;
  const wordsPerSecond = wpm / 60;
  const msPerWord = 1000 / wordsPerSecond;

  // Define sliding window parameters (for highlighting words).
  // Adjust to show more/less words in the sliding window.
  const windowSize = 5;

  // Set up Server-Sent Events (SSE) headers.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Listen for client disconnect.
  let clientConnected = true;
  req.on("close", () => {
    clientConnected = false;
  });

  /**
   * Send an SSE message with the current progress.
   *
   * @param {number} pIndex - The current paragraph index.
   * @param {string[]} words - Array of words in the paragraph.
   * @param {number} currentWordIndex - The index of the current word.
   * @param {boolean} isNewParagraph - Whether this is the start of a new paragraph.
   */

  const sendProgress = (
    pIndex,
    words,
    currentWordIndex,
    isNewParagraph = false
  ) => {
    // Calculate a sliding window range.
    const halfWindow = Math.floor(windowSize / 2);
    const windowStart = Math.max(0, currentWordIndex - halfWindow);
    const windowEnd = Math.min(words.length - 1, currentWordIndex + halfWindow);
    const wordWindow = words.slice(windowStart, windowEnd + 1);

    res.write(
      `data: ${JSON.stringify({
        paragraphIndex: pIndex,
        currentWordIndex,
        wordWindow,
        windowStart,
        fullParagraph: words.join(" "),
        newParagraph: isNewParagraph,
      })}\n\n`
    );
  };

  /**
   * Speak the next paragraph with word-by-word highlights.
   */
  const speakNextParagraph = () => {
    if (!clientConnected) return;

    // If finished processing all paragraphs, notify and close.
    if (paragraphIndex >= paragraphs.length) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const paragraph = paragraphs[paragraphIndex];
    // Split the paragraph into individual words.
    const words = paragraph.split(/\s+/).filter(Boolean);

    // Notify client of the new paragraph.
    sendProgress(paragraphIndex, words, -1, true);

    // Timer to simulate word-by-word progress.
    let wordIndex = 0;
    const wordTimer = setInterval(() => {
      if (!clientConnected) {
        clearInterval(wordTimer);
        return;
      }

      // When we have processed all words in the paragraph, clear the timer.
      if (wordIndex >= words.length) {
        clearInterval(wordTimer);
      } else {
        // Send current word progress with a sliding window highlight.
        sendProgress(paragraphIndex, words, wordIndex);
        wordIndex++;
      }
    }, msPerWord);

    // Use execFile to invoke the OS TTS command safely.
    // Note: The paragraph is passed directly to the command; if your content may include problematic characters,
    // additional sanitization might be needed.
    execFile(
      "say",
      ["-v", selectedVoice, "-r", wpm.toString(), paragraph],
      (err) => {
        if (err) {
          console.error("Error executing say command:", err);
          res.write(
            `data: ${JSON.stringify({
              error: "Error executing say command",
            })}\n\n`
          );
        }
        // Ensure the timer is cleared.
        clearInterval(wordTimer);
        paragraphIndex++;
        speakNextParagraph();
      }
    );
  };

  // Begin processing the paragraphs.
  speakNextParagraph();
});

module.exports = router;
