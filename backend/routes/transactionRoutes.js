const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { transactionSchema } = require('../utils/validationSchemas');

// Import the controller object
const transactionController = require('../controllers/transactionController');

// Add transaction 
router.post('/', protect, validate(transactionSchema), transactionController.addTransaction);

// Get all transactions
router.get('/', protect, transactionController.getAllTransactions);

// Update transaction
router.put('/:id', protect, validate(transactionSchema), transactionController.updateTransaction);

// Delete transaction
router.delete('/:id', protect, transactionController.deleteTransaction);

module.exports = router;

