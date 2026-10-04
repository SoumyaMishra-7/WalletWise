const { transactionSchema } = require('./validationSchemas');

describe('transactionSchema — comprehensive validation', () => {
  const valid = {
    type: 'expense',
    amount: 50.00,
    category: 'food',
    description: 'Lunch',
    date: new Date().toISOString(),
  };

  it('accepts valid expense transaction', () => {
    expect(transactionSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts income type', () => {
    expect(transactionSchema.safeParse({ ...valid, type: 'income' }).success).toBe(true);
  });

  it('normalizes type to lowercase (EXPENSE → expense)', () => {
    const result = transactionSchema.safeParse({ ...valid, type: 'EXPENSE' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('expense');
  });

  it('rejects invalid type', () => {
    expect(transactionSchema.safeParse({ ...valid, type: 'transfer' }).success).toBe(false);
  });

  it('rejects zero amount', () => {
    expect(transactionSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(transactionSchema.safeParse({ ...valid, amount: -10 }).success).toBe(false);
  });

  it('accepts string amount that parses to number', () => {
    expect(transactionSchema.safeParse({ ...valid, amount: '25.50' }).success).toBe(true);
  });

  it('rejects empty category', () => {
    expect(transactionSchema.safeParse({ ...valid, category: '' }).success).toBe(false);
  });

  it('accepts valid payment methods', () => {
    for (const method of ['cash', 'card', 'upi', 'online']) {
      expect(transactionSchema.safeParse({ ...valid, paymentMethod: method }).success).toBe(true);
    }
  });

  it('rejects invalid payment method', () => {
    expect(transactionSchema.safeParse({ ...valid, paymentMethod: 'bitcoin' }).success).toBe(false);
  });

  it('description over 200 chars is rejected', () => {
    expect(transactionSchema.safeParse({ ...valid, description: 'x'.repeat(201) }).success).toBe(false);
  });
});
