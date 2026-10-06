const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// Multer config for CSV uploads (in-memory, 5 MB limit, CSV only)
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

router.get(
    "/activity/:transactionId",
    protect,
    transactionController.getTransactionActivity
);

// Import transactions from a CSV bank statement (?preview=true for dry-run)
router.post('/import', protect, csvUpload.single('file'), transactionController.importTransactionsFromCSV);

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