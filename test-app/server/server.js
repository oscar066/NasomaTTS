// server.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Import route modules
const pdfRoutes = require('./routes/pdfRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const speakRoutes = require('./routes/speakRoutes');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(helmet());

// Mount routes under an API namespace
app.use('/api/pdf', pdfRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/speak', speakRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.statusCode || 500)
    .json({ error: err.message || 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
