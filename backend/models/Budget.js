const mongoose = require('mongoose');
const { CATEGORIES } = require('../constants/categories');
const {
  ROLLOVER_MODE_VALUES,
  DEFAULT_ROLLOVER_MODE,
  isValidMonth,
  getCurrentMonth,
  getPreviousMonth,
  getMonthRange,
  calculateRollover
} = require('../utils/budgetRollover');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  totalBudget: {
    type: Number,
    required: [true, 'Total budget amount is required'],
    min: [1, 'Budget amount must be greater than 0']
  },

  categories: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    categoryType: {
      type: String,
      required: false,
      enum: CATEGORIES
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    color: {
      type: String,
      default: '#667eea'
    },
    // Amount carried into this category from last month (may be negative in 'both' mode)
    rolloverAmount: {
      type: Number,
      default: 0
    }
  }],

  month: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format']
  },
  
  isActive: {
    type: Boolean,
    default: true
  },

  // ---- Rollover (opt-in, off by default so existing budgets are unchanged) ----
  rolloverEnabled: {
    type: Boolean,
    default: false
  },
  // 'positive' = carry only unused money, 'both' = also carry overspending
  rolloverMode: {
    type: String,
    enum: ROLLOVER_MODE_VALUES,
    default: DEFAULT_ROLLOVER_MODE
  },
  // Sum of the category rollovers (the value that is added to totalBudget)
  rolloverAmount: {
    type: Number,
    default: 0
  },
  // Idempotency marker: the source month (YYYY-MM) the rollover was calculated from
  rolloverAppliedFrom: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Create compound index for user and month
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

// Method to get formatted budget
budgetSchema.methods.toJSON = function () {
  const budget = this.toObject();
  budget.id = budget._id;
  delete budget._id;
  delete budget.__v;
  return budget;
};

// Clear any calculated rollover (used when settings or categories change)
budgetSchema.methods.resetRollover = function () {
  this.rolloverAmount = 0;
  this.rolloverAppliedFrom = null;
  this.categories.forEach((category) => {
    category.rolloverAmount = 0;
  });
};

/**
 * Apply last month's leftover (or overspend) to this budget.
 *
 * Safe to call as often as you like:
 *  - the result is ASSIGNED, never incremented, so it can never be applied twice;
 *  - `rolloverAppliedFrom` short-circuits repeat calls;
 *  - the write is a conditional update, so two concurrent requests cannot both win;
 *  - months that have not started yet are skipped (the source month is not closed).
 *
 * Returns the up-to-date budget document (use the return value, not the argument).
 */
budgetSchema.statics.applyRollover = async function (budget, { now = new Date() } = {}) {
  if (!budget || !budget.rolloverEnabled || !isValidMonth(budget.month)) {
    return budget;
  }
  // A future month's source month is still running - wait until it has closed.
  if (budget.month > getCurrentMonth(now)) {
    return budget;
  }

  const sourceMonth = getPreviousMonth(budget.month); // handles Jan -> previous Dec
  if (budget.rolloverAppliedFrom === sourceMonth) {
    return budget; // already applied
  }

  const previousBudget = await this.findOne({
    userId: budget.userId,
    month: sourceMonth,
    isActive: true
  });
  if (!previousBudget) {
    return budget; // nothing to carry; retry later in case it is created retroactively
  }

  const Transaction = require('./Transactions'); // lazy: avoids circular requires
  const { start, end } = getMonthRange(sourceMonth);
  const spentRows = await Transaction.aggregate([
    { $match: { userId: budget.userId, type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', spent: { $sum: '$amount' } } }
  ]);
  // Lower-case in JS (same matching rule as the budget summary) and merge any case variants
  const spentByCategory = new Map();
  spentRows.forEach((row) => {
    const key = String(row._id || '').toLowerCase();
    spentByCategory.set(key, (spentByCategory.get(key) || 0) + (row.spent || 0));
  });

  const { total, categories } = calculateRollover({
    previousBudget,
    categories: budget.categories,
    spentByCategory,
    mode: budget.rolloverMode
  });

  const updatedCategories = budget.categories.map((category, index) => ({
    ...category.toObject(),
    rolloverAmount: categories[index].rolloverAmount
  }));

  const updated = await this.findOneAndUpdate(
    { _id: budget._id, rolloverEnabled: true, rolloverAppliedFrom: { $ne: sourceMonth } },
    { $set: { rolloverAmount: total, rolloverAppliedFrom: sourceMonth, categories: updatedCategories } },
    { new: true }
  );

  // null => a concurrent request already applied it (or the budget was removed)
  return updated || (await this.findById(budget._id)) || budget;
};

// Static method to get current month budget
budgetSchema.statics.getCurrentBudget = async function (userId) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return await this.findOne({ userId, month: currentMonth, isActive: true });
};

// Static method to copy previous month's budget
budgetSchema.statics.copyPreviousMonth = async function (userId) {
  const currentDate = new Date();
  const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    .toISOString().slice(0, 7);

  const previousBudget = await this.findOne({
    userId,
    month: previousMonth,
    isActive: true
  });

  if (!previousBudget) {
    return null;
  }

  const currentMonth = currentDate.toISOString().slice(0, 7);

  // Check if current month budget already exists
  const existingBudget = await this.findOne({
    userId,
    month: currentMonth,
    isActive: true
  });

  if (existingBudget) {
    throw new Error('Budget for current month already exists');
  }

  // Create new budget for current month
  const newBudget = new this({
    userId: previousBudget.userId,
    totalBudget: previousBudget.totalBudget,
    categories: previousBudget.categories.map(cat => ({
      name: cat.name,
      categoryType: cat.categoryType,
      amount: cat.amount,
      percentage: cat.percentage,
      color: cat.color
    })),
    month: currentMonth,
    isActive: true,
    rolloverEnabled: previousBudget.rolloverEnabled,
    rolloverMode: previousBudget.rolloverMode
  });

  await newBudget.save();
  return await this.applyRollover(newBudget);
};

module.exports = mongoose.model('Budget', budgetSchema);