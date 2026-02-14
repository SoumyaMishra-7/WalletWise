const mongoose = require('mongoose');
const { CATEGORIES } = require('../constants/categories');

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
  }
}, {
  timestamps: true
});

// Create compound index for user and month
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

// Method to get formatted budget
budgetSchema.methods.toJSON = function() {
  const budget = this.toObject();
  budget.id = budget._id;
  delete budget._id;
  delete budget.__v;
  return budget;
};

// Static method to get current month budget
budgetSchema.statics.getCurrentBudget = async function(userId) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return await this.findOne({ userId, month: currentMonth, isActive: true });
};

// Static method to copy previous month's budget
budgetSchema.statics.copyPreviousMonth = async function(userId) {
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
    isActive: true
  });
  
  return await newBudget.save();
};

module.exports = mongoose.model('Budget', budgetSchema);