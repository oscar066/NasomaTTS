// routes/pdfRoutes.js

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/authenticate"); 

const router = express.Router();

// Configure multer for PDF uploads.
const upload = multer({
  dest: path.join(__dirname, "../uploads"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDFs are allowed"), false);
    }
    cb(null, true);
  },
});

// POST /api/pdf/upload

router.post("/upload", upload.single("pdf"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);

    // Clean up the file after processing
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });

    res.json({
      message: "PDF Document parsed saved successfully",
      filePath: `/uploads/${req.file.filename}`,
      title: req.file.originalname,
      content: pdfData.text,
    });
    
  } catch (error) {
    next(new Error("Error extracting text from PDF"));
  }
});

module.exports = router;
