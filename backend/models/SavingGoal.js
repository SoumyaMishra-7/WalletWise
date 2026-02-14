const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Goal name is required'],
    trim: true,
    maxlength: [100, 'Goal name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [1, 'Target amount must be greater than 0']
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative']
  },
  targetDate: {
    type: Date,
    required: [true, 'Target date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Target date must be in the future'
    }
  },
  category: {
    type: String,
    enum: ['Emergency Fund', 'Travel', 'Education', 'Home', 'Vehicle', 'Retirement', 'Wedding', 'Health', 'Gift', 'Other'],
    default: 'Other'
  },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium'
  },
  monthlyContribution: {
    type: Number,
    default: 0,
    min: [0, 'Monthly contribution cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate progress before saving
savingsGoalSchema.pre('save', function(next) {
  if (this.targetAmount > 0) {
    this.progress = Math.min(100, (this.currentAmount / this.targetAmount) * 100);
  } else {
    this.progress = 0;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);