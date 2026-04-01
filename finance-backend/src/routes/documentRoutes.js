const express = require('express');
const router = express.Router();
const { createDocument, getDocuments, updateDocumentStatus, updateDocument } = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/', createDocument);
router.get('/', getDocuments);
router.put('/:id', updateDocument);
router.put('/:id/status', updateDocumentStatus);


module.exports = router;
