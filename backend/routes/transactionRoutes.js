const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// Add transaction (both income and expense)
router.post('/', protect, transactionController.addTransaction);

// Get all transactions
router.get('/', protect, transactionController.getAllTransactions);

module.exports = router;
