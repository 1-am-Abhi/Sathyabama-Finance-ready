const router = require('express').Router();
const { getDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const orgScope = require('../middleware/orgScope');
const dbReady = require('../middleware/dbReady');

router.get('/', dbReady, protect, orgScope, getDashboard);

module.exports = router;
