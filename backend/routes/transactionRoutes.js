const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

router.get(
    "/activity/:transactionId",
    protect,
    transactionController.getTransactionActivity
);

// Process due recurring transactions on demand. GET /transactions used to do
// this inline; it now stays read-only and the worker handles it in the
// background, with this route available for an explicit flush.
router.post('/process-recurring', protect, transactionController.processRecurringNow);

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