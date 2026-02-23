const { z } = require('zod');

// ==================== BUDGET SCHEMAS ====================

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional()
});

const budgetSchema = z.object({
  totalBudget: z.number().positive('Total budget must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
  categories: z.array(categorySchema).min(1, 'At least one category is required')
}).refine(data => {
  const totalPercentage = data.categories.reduce((sum, cat) => sum + cat.percentage, 0);
  return Math.abs(totalPercentage - 100) <= 0.01;
}, { message: 'Category percentages must sum to 100%', path: ['categories'] });

const updateBudgetSchema = z.object({
  totalBudget: z.number().positive('Total budget must be positive').optional(),
  categories: z.array(categorySchema).min(1).optional()
}).refine(data => {
  if (data.categories) {
    const totalPercentage = data.categories.reduce((sum, cat) => sum + cat.percentage, 0);
    return Math.abs(totalPercentage - 100) <= 0.01;
  }
  return true;
}, { message: 'Category percentages must sum to 100%', path: ['categories'] });

// ==================== SAVINGS GOAL SCHEMAS ====================

const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(100, 'Goal name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().min(0, 'Current amount cannot be negative').optional().default(0),
  targetDate: z.string().or(z.date()).transform(val => new Date(val)),
  category: z.string().max(50).optional().default('Other'),
  priority: z.enum(['Low', 'Medium', 'High']).optional().default('Medium'),
  monthlyContribution: z.number().min(0).optional().default(0)
});

const addAmountSchema = z.object({
  amount: z.number().positive('Amount must be positive')
});

// ==================== TRANSACTION SCHEMAS ====================

const transactionSchema = z.object({
  type: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['income', 'expense'], { errorMap: () => ({ message: 'Type must be income or expense' }) })
  ),
  amount: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? value : Number(trimmed);
      }
      return value;
    },
    z.number().finite().positive('Amount must be positive')
  ),
  category: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.string().min(1, 'Category is required').max(50, 'Category name too long')
  ),
  description: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().max(200, 'Description too long').optional().default('')
  ),
  paymentMethod: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['cash', 'card', 'upi', 'online']).optional().default('cash')
  ),
  mood: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['happy', 'stressed', 'bored', 'sad', 'calm', 'neutral']).optional().default('neutral')
  ),
  date: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return value;
  }, z.date().optional())
});

// ==================== USER/AUTH SCHEMAS ====================

const userRegisterSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required').max(50),
  fullName: z.string().min(2, 'Full name is required').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),
  department: z.string().max(100).optional(),
  year: z.string().max(20).optional()
});

const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const userUpdateSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phoneNumber: z.string().optional(),
  department: z.string().max(100).optional(),
  year: z.string().max(20).optional(),
  // Profile Settings
  currency: z.string().optional(),
  dateFormat: z.string().optional(),
  language: z.string().optional(),
  // Financial Settings
  incomeFrequency: z.string().optional(),
  incomeSources: z.string().optional(),
  priorities: z.string().optional(),
  riskTolerance: z.string().optional()
});

const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

const resendOtpSchema = z.object({
  email: z.string().email('Invalid email format')
});

const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format')
});

const forgotPasswordVerifySchema = z.object({
  email: z.string().email('Invalid email format'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Invalid reset token').optional(),
  email: z.string().email('Invalid email format').optional(),
  otp: z.string().length(6, 'OTP must be 6 digits').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters').max(128)
}).superRefine((data, ctx) => {
  const hasToken = Boolean(data.token);
  const hasOtpFlow = Boolean(data.email && data.otp);

  if (!hasToken && !hasOtpFlow) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either reset token or email+OTP',
      path: ['token']
    });
  }

  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirmPassword']
    });
  }
});

module.exports = {
  // Budget
  budgetSchema,
  updateBudgetSchema,
  categorySchema,
  // Savings Goal
  savingsGoalSchema,
  addAmountSchema,
  // Transaction
  transactionSchema,
  // User/Auth
  userRegisterSchema,
  userLoginSchema,
  userUpdateSchema,
  verifyEmailSchema,
  resendOtpSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  resetPasswordSchema
};
