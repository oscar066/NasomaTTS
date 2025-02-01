// routes/voiceRoutes.js
const express = require('express');
const { exec } = require('child_process');

const router = express.Router();

// GET /api/voices
router.get('/', (req, res, next) => {
  exec('say -v "?"', (error, stdout) => {
    if (error) {
      return next(new Error('Failed to fetch voices'));
    }
    // Parse output lines and extract the voice names.
    const voices = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name] = line.split(' ');
        return name;
      });
    res.json({ voices });
  });
});

module.exports = router;
