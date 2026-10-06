'use strict';

const {
  budgetSchema,
  savingsGoalSchema,
  transactionSchema,
  userRegisterSchema,
  userLoginSchema,
} = require('../utils/validationSchemas');

// ---- budgetSchema ----
describe('budgetSchema', () => {
  const validCategories = [
    { name: 'Food', amount: 500, percentage: 50 },
    { name: 'Transport', amount: 500, percentage: 50 },
  ];

  it('accepts valid budget data', () => {
    const result = budgetSchema.safeParse({ totalBudget: 1000, categories: validCategories });
    expect(result.success).toBe(true);
  });

  it('rejects zero totalBudget', () => {
    const result = budgetSchema.safeParse({ totalBudget: 0, categories: validCategories });
    expect(result.success).toBe(false);
  });

  it('rejects negative totalBudget', () => {
    const result = budgetSchema.safeParse({ totalBudget: -100, categories: validCategories });
    expect(result.success).toBe(false);
  });

  it('rejects empty categories array', () => {
    const result = budgetSchema.safeParse({ totalBudget: 1000, categories: [] });
    expect(result.success).toBe(false);
  });

  it('rejects when percentages do not sum to 100', () => {
    const cats = [{ name: 'Food', amount: 1000, percentage: 80 }];
    const result = budgetSchema.safeParse({ totalBudget: 1000, categories: cats });
    expect(result.success).toBe(false);
  });

  it('accepts valid YYYY-MM month format', () => {
    const result = budgetSchema.safeParse({ totalBudget: 1000, categories: validCategories, month: '2024-01' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid month format', () => {
    const result = budgetSchema.safeParse({ totalBudget: 1000, categories: validCategories, month: 'Jan 2024' });
    expect(result.success).toBe(false);
  });

  it('rejects category with negative amount', () => {
    const cats = [
      { name: 'Food', amount: -100, percentage: 100 },
    ];
    const result = budgetSchema.safeParse({ totalBudget: 1000, categories: cats });
    expect(result.success).toBe(false);
  });
});

// ---- savingsGoalSchema ----
describe('savingsGoalSchema', () => {
  const validGoal = {
    name: 'Emergency Fund',
    targetAmount: 10000,
    targetDate: '2025-12-31',
  };

  it('accepts valid savings goal', () => {
    const result = savingsGoalSchema.safeParse(validGoal);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = savingsGoalSchema.safeParse({ ...validGoal, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative targetAmount', () => {
    expect(savingsGoalSchema.safeParse({ ...validGoal, targetAmount: 0 }).success).toBe(false);
    expect(savingsGoalSchema.safeParse({ ...validGoal, targetAmount: -100 }).success).toBe(false);
  });

  it('rejects negative currentAmount', () => {
    const result = savingsGoalSchema.safeParse({ ...validGoal, currentAmount: -50 });
    expect(result.success).toBe(false);
  });

  it('accepts valid priority values', () => {
    ['Low', 'Medium', 'High'].forEach(priority => {
      expect(savingsGoalSchema.safeParse({ ...validGoal, priority }).success).toBe(true);
    });
  });

  it('rejects invalid priority value', () => {
    const result = savingsGoalSchema.safeParse({ ...validGoal, priority: 'Critical' });
    expect(result.success).toBe(false);
  });
});

// ---- transactionSchema ----
describe('transactionSchema', () => {
  const validTx = {
    type: 'expense',
    amount: 100,
    category: 'food',
  };

  it('accepts valid transaction', () => {
    const result = transactionSchema.safeParse(validTx);
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = transactionSchema.safeParse({ ...validTx, type: 'transfer' });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative amount', () => {
    expect(transactionSchema.safeParse({ ...validTx, amount: 0 }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...validTx, amount: -50 }).success).toBe(false);
  });

  it('accepts income type', () => {
    const result = transactionSchema.safeParse({ ...validTx, type: 'income', category: 'salary' });
    expect(result.success).toBe(true);
  });
});

// ---- userLoginSchema ----
describe('userLoginSchema', () => {
  it('accepts valid login data', () => {
    const result = userLoginSchema.safeParse({ email: 'user@example.com', password: 'Password1!' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = userLoginSchema.safeParse({ email: 'notanemail', password: 'Password1!' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = userLoginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
