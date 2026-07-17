const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const orgScope = require('../middleware/orgScope');
const upload = require('../middleware/upload');
// Hardened multipart parser (absolute uploads dir, per-request mkdir, size limit)
// used for the installment fund-request form, plus the financial-body sanitiser —
// the SAME middleware as the canonical /fund-requests route.
const { upload: proofUpload, persistUploads } = require('../middleware/uploadMiddleware');
const { sanitizeFinancialInput } = require('../middleware/inputSanitizer');

// Controllers
const projectController = require('../controllers/projectController');
const fundRequestController = require('../controllers/fundRequestController');
const eventRequestController = require('../controllers/eventRequestController');
const odRequestController = require('../controllers/odRequestController');
const equipmentRequestController = require('../controllers/equipmentRequestController');
const documentController = require('../controllers/documentController');
const facultyRequestController = require('../controllers/facultyRequestController');
const profileController = require('../controllers/profileController');

// All routes here require FACULTY role
router.use(protect);
router.use(orgScope);
router.use(authorize('FACULTY'));

// --- Projects ---
router.get('/projects', projectController.getProjects);
router.post('/projects', projectController.createProject);
router.put('/projects/:id', projectController.updateProject);
router.get('/projects/stats', projectController.getFacultyStats);

// --- Fund Requests ---
// The frontend submits this as multipart/form-data with an optional "bill" file.
// Without multer, Express 5 leaves req.body undefined for multipart, so the
// controller's destructure threw a 500. Parse the multipart body (and capture the
// bill) + sanitise financial fields, exactly like the canonical /fund-requests.
router.get('/fund-requests', fundRequestController.getFundRequests);
router.post('/fund-requests', proofUpload.single('bill'), persistUploads, sanitizeFinancialInput, fundRequestController.createFundRequest);
router.put('/fund-requests/:id', fundRequestController.updateFundRequest);
router.get('/fund-requests/:id', fundRequestController.getFundRequest);

// --- Event Requests ---
router.get('/event-requests', eventRequestController.getEventRequests);
router.post('/event-requests', eventRequestController.createEventRequest);
router.put('/event-requests/:id/status', eventRequestController.updateEventRequestStatus);

// --- OD Requests ---
router.get('/od-requests', odRequestController.getODRequests);
router.post('/od-requests', odRequestController.createODRequest);
router.put('/od-requests/:id/status', odRequestController.updateODRequestStatus);

// --- Equipment Requests ---
router.get('/equipment-requests', equipmentRequestController.getEquipmentRequests);
router.post('/equipment-requests', equipmentRequestController.createEquipmentRequest);

// --- Documents ---
router.get('/documents', documentController.getDocuments);
router.post('/documents', documentController.createDocument);
router.put('/documents/:id', documentController.updateDocument);

// --- General Faculty Request (The one with multi-part form) ---
router.post('/request', upload.fields([
    { name: 'bill', maxCount: 1 }, 
    { name: 'proposal', maxCount: 1 }
]), facultyRequestController.createRequest);

// --- Profile ---
router.put('/profile/update', profileController.updateProfile);

module.exports = router;
