const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Get Dashboard Summary
router.get('/summary', protect, dashboardController.getDashboardSummary);

module.exports = router;
