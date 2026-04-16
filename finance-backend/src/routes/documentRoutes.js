const express = require('express');
const router = express.Router();
const { createDocument, getDocuments, updateDocumentStatus, updateDocument } = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', authorize('FACULTY', 'ADMIN'), createDocument);
router.get('/', getDocuments);
router.put('/:id', authorize('FACULTY'), updateDocument);
router.put('/:id/status', authorize('ADMIN'), updateDocumentStatus);

module.exports = router;

