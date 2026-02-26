const express = require('express');
const { protect } = require('../middleware/auth');
const investmentController = require('../controllers/investmentController');

const router = express.Router();

// Apply auth middleware to all investment routes
router.use(protect);

router.get('/portfolio', investmentController.getPortfolio);
router.get('/market', investmentController.getMarketData);
router.post('/buy', investmentController.buyStock);
router.post('/sell', investmentController.sellStock);

module.exports = router;
