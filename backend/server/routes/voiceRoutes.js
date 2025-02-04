// routes/voiceRoutes.js
const express = require("express");
const { execFile } = require("child_process");

const router = express.Router();

// GET /api/voices

router.get("/", (req, res, next) => {
  execFile("say", ["-v", "?"], (error, stdout, stderr) => {
    if (error) {
      console.error("Error fetching voices:", error);
      return next(new Error("Failed to fetch voices"));
    }
    if (stderr) {
      console.error("stderr:", stderr);
    }
    // Parse output lines and extract the voice names.
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

module.exports = router;
