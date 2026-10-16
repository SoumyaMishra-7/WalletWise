const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

router.get(
    "/activity/:transactionId",
    protect,
    transactionController.getTransactionActivity
);

// Add transaction
router.post('/', protect, transactionController.addTransaction);

// Get all transactions
router.get('/', protect, transactionController.getAllTransactions);

// Export transactions (must be before /:id routes)
router.get('/export/csv', protect, transactionController.exportTransactionsCsv);
router.get('/export/pdf', protect, transactionController.exportTransactionsPdf);

// Undo transaction ✅ IMPORTANT
router.post('/:id/undo', protect, transactionController.undoTransaction);

// Skip next occurrence
router.patch('/recurring/:id/skip', protect, transactionController.skipNextOccurrence);

// Update transaction
router.put('/:id', protect, transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', protect, transactionController.deleteTransaction);

module.exports = router;