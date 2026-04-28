const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');
const orgScope = require('../middleware/orgScope');

// All audit routes require authentication and organization scoping
router.use(protect);
router.use(orgScope);

// Timeline for specific requests (Faculty/Finance view)
router.get('/timeline/:requestId', auditController.getAuditTimeline);

// Enterprise/Auditor routes
router.get('/logs/export', authorize('ADMIN', 'AUDITOR'), auditController.exportAuditLogs);
router.get('/verify/:id', authorize('ADMIN', 'AUDITOR'), auditController.verifyAuditLog);
router.get('/top-projects', authorize('ADMIN', 'AUDITOR', 'FINANCE_OFFICER'), auditController.topSpendProjects);

// Budget Intelligence routes
router.get('/budget/:projectId/forecast', authorize('ADMIN', 'FINANCE_OFFICER', 'AUDITOR'), auditController.budgetForecast);
router.get('/budget/:projectId/alerts', authorize('ADMIN', 'FINANCE_OFFICER', 'AUDITOR'), auditController.budgetAlerts);
router.get('/anomalies/:projectId', authorize('ADMIN', 'FINANCE_OFFICER', 'AUDITOR'), auditController.anomalyDetection);

module.exports = router;
