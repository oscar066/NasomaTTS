const express = require('express');
const Document = require('../models/document');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();

// GET /api/pdf/documents
router.get('/documents', async (req, res, next) => {
    try {
        const documents = await Document.find({ author: req.user.id });
        res.json(documents);
    } catch (err) {
        next(new Error('Error fetching documents'));
    }
});

module.exports = router;