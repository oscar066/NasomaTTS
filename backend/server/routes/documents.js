const express = require("express");
const Document = require("../models/document");
const { minioClient, BUCKET } = require("../services/minioClient");

const router = express.Router();

// GET /api/documents/:id — document metadata + text
router.get("/:id", async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json({ id: doc.id, title: doc.title, text: doc.content, fileKey: doc.fileKey });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/pdf — stream PDF from MinIO
router.get("/:id/pdf", async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc?.fileKey) {
      return res.status(404).json({ error: "No PDF stored for this document" });
    }
    const stream = await minioClient.getObject(BUCKET, doc.fileKey);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.title)}.pdf"`
    );
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
