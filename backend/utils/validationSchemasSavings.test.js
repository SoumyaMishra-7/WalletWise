const { savingsGoalSchema, addAmountSchema } = require('./validationSchemas');

describe('savingsGoalSchema', () => {
  const valid = {
    name: 'Emergency Fund',
    targetAmount: 5000,
    targetDate: '2027-01-01',
  };

  it('accepts valid savings goal', () => {
    expect(savingsGoalSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(savingsGoalSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects non-positive targetAmount', () => {
    expect(savingsGoalSchema.safeParse({ ...valid, targetAmount: 0 }).success).toBe(false);
    expect(savingsGoalSchema.safeParse({ ...valid, targetAmount: -100 }).success).toBe(false);
  });

  it('rejects negative currentAmount', () => {
    expect(savingsGoalSchema.safeParse({ ...valid, currentAmount: -1 }).success).toBe(false);
  });

  it('accepts valid priority values', () => {
    for (const priority of ['Low', 'Medium', 'High']) {
      expect(savingsGoalSchema.safeParse({ ...valid, priority }).success).toBe(true);
    }
  });

  it('rejects invalid priority value', () => {
    expect(savingsGoalSchema.safeParse({ ...valid, priority: 'Critical' }).success).toBe(false);
  });

  it('description over 500 chars is rejected', () => {
    expect(savingsGoalSchema.safeParse({ ...valid, description: 'x'.repeat(501) }).success).toBe(false);
  });
});

describe('addAmountSchema', () => {
  it('accepts positive amount', () => {
    expect(addAmountSchema.safeParse({ amount: 100 }).success).toBe(true);
  });

  it('rejects zero amount', () => {
    expect(addAmountSchema.safeParse({ amount: 0 }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(addAmountSchema.safeParse({ amount: -50 }).success).toBe(false);
  });
});
