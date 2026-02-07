const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const budgetController = require('../controllers/budgetController');

// ==================== MIDDLEWARE ====================
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

// ==================== BUDGET ROUTES ====================

// Set/Update Budget
router.post('/', protect, sanitizeInput, budgetController.setBudget);

// Get Current Month Budget
router.get('/current', protect, budgetController.getCurrentBudget);

// Get Budget by Month
router.get('/:month', protect, budgetController.getBudgetByMonth);

// Get All Budgets
router.get('/', protect, budgetController.getAllBudgets);

// Copy Previous Budget
router.post('/copy-previous', protect, sanitizeInput, budgetController.copyPreviousBudget);

// Delete Budget
router.delete('/:id', protect, budgetController.deleteBudget);

// Update Budget
router.put('/:id', protect, sanitizeInput, budgetController.updateBudget);

// Get Budget Summary with Transaction Matching
router.get('/stats/summary', protect, budgetController.getBudgetSummary);

module.exports = router;
