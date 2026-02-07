const express = require('express');
const router = express.Router();
const Budget = require('../models/Budget');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { budgetSchema, updateBudgetSchema } = require('../utils/validationSchemas');

// ==================== BUDGET ROUTES ====================

// Set/Update Budget
router.post('/', protect, validate(budgetSchema), async (req, res) => {
  try {
    console.log('\n💰 SET BUDGET REQUEST');
    console.log('User ID:', req.userId);
    console.log('Request body:', req.body);

    const { totalBudget, categories, month } = req.body;

    // Validation
    if (!totalBudget || totalBudget <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid total budget amount is required'
      });
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one category is required'
      });
    }

    // Validate categories
    let totalPercentage = 0;
    let totalAmount = 0;

    for (const category of categories) {
      if (!category.name || !category.amount || !category.percentage) {
        return res.status(400).json({
          success: false,
          message: 'Each category must have name, amount, and percentage'
        });
      }

      if (category.percentage < 0 || category.percentage > 100) {
        return res.status(400).json({
          success: false,
          message: `Percentage for ${category.name} must be between 0 and 100`
        });
      }

      if (category.amount < 0) {
        return res.status(400).json({
          success: false,
          message: `Amount for ${category.name} cannot be negative`
        });
      }

      totalPercentage += category.percentage;
      totalAmount += category.amount;
    }

    // Check if percentages sum to 100
    if (Math.abs(totalPercentage - 100) > 0.01) { // Allow small floating point differences
      return res.status(400).json({
        success: false,
        message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`
      });
    }

    // Check if total amount matches sum of categories
    if (Math.abs(totalAmount - totalBudget) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Sum of category amounts (${totalAmount}) must equal total budget (${totalBudget})`
      });
    }

    // Determine month (use current month if not provided)
    const budgetMonth = month || new Date().toISOString().slice(0, 7);

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(budgetMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Month must be in YYYY-MM format'
      });
    }

    // Check if budget for this month already exists
    let budget = await Budget.findOne({
      userId: req.userId,
      month: budgetMonth,
      isActive: true
    });

    if (budget) {
      // Update existing budget
      budget.totalBudget = totalBudget;
      budget.categories = categories;
      budget.updatedAt = new Date();
    } else {
      // Create new budget
      budget = new Budget({
        userId: req.userId,
        totalBudget,
        categories,
        month: budgetMonth,
        isActive: true
      });
    }

    await budget.save();
    console.log('✅ Budget saved successfully:', budget._id);

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Budget set successfully! 🎉',
      notification: {
        type: 'success',
        title: 'Budget Set',
        message: `Your monthly budget of ₹${totalBudget.toLocaleString()} has been set successfully.`,
        timestamp: new Date().toISOString()
      },
      budget: {
        id: budget._id,
        totalBudget: budget.totalBudget,
        categories: budget.categories,
        month: budget.month,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Set budget error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Budget for this month already exists'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to set budget. Please try again.'
    });
  }
});

// Get Current Budget
router.get('/current', protect, async (req, res) => {
  try {
    console.log('\n📊 GET CURRENT BUDGET REQUEST');
    console.log('User ID:', req.userId);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const budget = await Budget.findOne({
      userId: req.userId,
      month: currentMonth,
      isActive: true
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'No budget set for current month',
        hasBudget: false,
        notification: {
          type: 'info',
          title: 'No Budget Found',
          message: 'You have not set a budget for this month. Click "Set Budget" to create one.',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      hasBudget: true,
      message: 'Budget found for current month',
      budget: {
        id: budget._id,
        totalBudget: budget.totalBudget,
        categories: budget.categories,
        month: budget.month,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
      }
    });

  } catch (error) {
    console.error('Get current budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget'
    });
  }
});

// Get Budget by Month
router.get('/:month', protect, async (req, res) => {
  try {
    const { month } = req.params;
    const userId = req.userId;

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Month must be in YYYY-MM format'
      });
    }

    const budget = await Budget.findOne({
      userId,
      month,
      isActive: true
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: `No budget found for ${month}`,
        hasBudget: false
      });
    }

    res.json({
      success: true,
      hasBudget: true,
      budget: budget
    });

  } catch (error) {
    console.error('Get budget by month error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget'
    });
  }
});

// Get All User Budgets
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.userId;
    const budgets = await Budget.find({
      userId,
      isActive: true
    }).sort({ month: -1 });

    res.json({
      success: true,
      count: budgets.length,
      budgets: budgets.map(budget => ({
        id: budget._id,
        totalBudget: budget.totalBudget,
        categories: budget.categories,
        month: budget.month,
        createdAt: budget.createdAt,
        updatedAt: budget.updatedAt
      }))
    });

  } catch (error) {
    console.error('Get all budgets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budgets'
    });
  }
});

// Copy Previous Month's Budget
router.post('/copy-previous', protect, async (req, res) => {
  try {
    console.log('\n📋 COPY PREVIOUS MONTH BUDGET REQUEST');
    console.log('User ID:', req.userId);

    const newBudget = await Budget.copyPreviousMonth(req.userId);

    if (!newBudget) {
      return res.status(404).json({
        success: false,
        message: 'No previous month budget found to copy'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Previous month budget copied successfully!',
      notification: {
        type: 'success',
        title: 'Budget Copied',
        message: `Budget of ₹${newBudget.totalBudget.toLocaleString()} has been copied from previous month.`,
        timestamp: new Date().toISOString()
      },
      budget: {
        id: newBudget._id,
        totalBudget: newBudget.totalBudget,
        categories: newBudget.categories,
        month: newBudget.month,
        createdAt: newBudget.createdAt
      }
    });

  } catch (error) {
    console.error('Copy previous budget error:', error);

    if (error.message === 'Budget for current month already exists') {
      return res.status(400).json({
        success: false,
        message: 'Budget for current month already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to copy previous month budget'
    });
  }
});

// Delete/Deactivate Budget
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const budget = await Budget.findOne({
      _id: id,
      userId
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Soft delete by setting isActive to false
    budget.isActive = false;
    await budget.save();

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });

  } catch (error) {
    console.error('Delete budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete budget'
    });
  }
});

// Update Budget
router.put('/:id', protect, validate(updateBudgetSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const budget = await Budget.findOne({
      _id: id,
      userId,
      isActive: true
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Validate if updating
    if (updates.categories) {
      const totalPercentage = updates.categories.reduce((sum, cat) => sum + cat.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`
        });
      }
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'userId' && key !== 'month') {
        budget[key] = updates[key];
      }
    });

    await budget.save();

    res.json({
      success: true,
      message: 'Budget updated successfully',
      notification: {
        type: 'success',
        title: 'Budget Updated',
        message: `Your budget has been updated successfully.`,
        timestamp: new Date().toISOString()
      },
      budget: budget
    });

  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget'
    });
  }
});

// Budget Summary/Statistics
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.userId;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const budget = await Budget.findOne({
      userId,
      month: currentMonth,
      isActive: true
    });

    if (!budget) {
      return res.json({
        success: true,
        hasBudget: false,
        message: 'No budget set for current month',
        summary: {
          totalBudget: 0,
          categories: [],
          spent: 0,
          remaining: 0,
          utilization: 0
        }
      });
    }

    // Note: You would need to integrate with transactions to get actual spending
    // For now, returning budget summary without actual spending data
    res.json({
      success: true,
      hasBudget: true,
      summary: {
        totalBudget: budget.totalBudget,
        categories: budget.categories.map(cat => ({
          name: cat.name,
          allocated: cat.amount,
          spent: 0, // Would come from transactions
          remaining: cat.amount,
          utilization: 0,
          color: cat.color
        })),
        spent: 0, // Would come from transactions
        remaining: budget.totalBudget,
        utilization: 0
      }
    });

  } catch (error) {
    console.error('Budget summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get budget summary'
    });
  }
});

module.exports = router;