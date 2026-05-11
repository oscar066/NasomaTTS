// routes/pdfRoutes.js

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const { minioClient, BUCKET, ensureBucket } = require("../services/minioClient");

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
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const tempPath = req.file.path;

  try {
    const dataBuffer = fs.readFileSync(tempPath);
    const pdfData = await pdfParse(dataBuffer);

    await ensureBucket();
    const safeTitle = req.file.originalname.replace(/\s+/g, "_");
    const fileKey = `${Date.now()}-${safeTitle}`;
    await minioClient.fPutObject(BUCKET, fileKey, tempPath, {
      "Content-Type": "application/pdf",
    });

    fs.unlink(tempPath, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    res.json({
      message: "PDF parsed and uploaded successfully",
      fileKey,
      title: req.file.originalname,
      content: pdfData.text,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    fs.unlink(tempPath, () => {});
    next(new Error("Error processing PDF"));
  }
});

module.exports = router;
