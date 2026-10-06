const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

router.get(
    "/activity/:transactionId",
    protect,
    transactionController.getTransactionActivity
);

// Get supported currency codes
router.get('/supported-currencies', transactionController.getSupportedCurrencies);

// Convert an amount between currencies (?from=INR&to=USD&amount=1000)
router.get('/convert', protect, transactionController.convertCurrency);

// Add transaction
router.post('/', protect, transactionController.addTransaction);

// Get all transactions
router.get('/', protect, transactionController.getAllTransactions);

// Undo transaction ✅ IMPORTANT
router.post('/:id/undo', protect, transactionController.undoTransaction);

// Skip next occurrence
router.patch('/recurring/:id/skip', protect, transactionController.skipNextOccurrence);

// Update transaction
router.put('/:id', protect, transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', protect, transactionController.deleteTransaction);

module.exports = router;