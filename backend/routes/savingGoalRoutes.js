const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const savingGoalController = require('../controllers/savingGoalController');

// Create Savings Goal
router.post('/', protect, savingGoalController.createGoal);

// Get all savings goals
router.get('/', protect, savingGoalController.getAllGoals);

// Add amount to savings goal
router.patch('/:id/add', protect, savingGoalController.addAmount);

// 🟢 NEW CODE: Delete savings goal
router.delete('/:id', protect, savingGoalController.deleteGoal);

module.exports = router;
