const express = require('express');
const router = express.Router();
const researchCenterController = require('../controllers/researchCenterController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', researchCenterController.getResearchCenters);

router.post(
    '/',
    authorize('ADMIN'),
    researchCenterController.createResearchCenter
);

module.exports = router;
