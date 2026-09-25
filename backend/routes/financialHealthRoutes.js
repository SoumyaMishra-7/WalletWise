const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const {
    getFinancialHealth
} = require('../controllers/financialHealthController');

router.get('/', protect, getFinancialHealth);

module.exports = router;