const { budgetSchema, categorySchema } = require('./validationSchemas');

describe('categorySchema', () => {
  const validCat = { name: 'Food', amount: 500, percentage: 30 };

  it('accepts valid category', () => {
    expect(categorySchema.safeParse(validCat).success).toBe(true);
  });

  it('rejects empty category name', () => {
    expect(categorySchema.safeParse({ ...validCat, name: '' }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(categorySchema.safeParse({ ...validCat, amount: -10 }).success).toBe(false);
  });

  it('rejects percentage above 100', () => {
    expect(categorySchema.safeParse({ ...validCat, percentage: 101 }).success).toBe(false);
  });

  it('accepts valid hex color', () => {
    expect(categorySchema.safeParse({ ...validCat, color: '#FF5733' }).success).toBe(true);
  });

  it('rejects invalid hex color', () => {
    expect(categorySchema.safeParse({ ...validCat, color: 'red' }).success).toBe(false);
  });
});

describe('budgetSchema', () => {
  const validBudget = {
    totalBudget: 1000,
    categories: [
      { name: 'Food', amount: 400, percentage: 40 },
      { name: 'Transport', amount: 300, percentage: 30 },
      { name: 'Other', amount: 300, percentage: 30 },
    ]
  };

  it('accepts valid budget with 100% categories', () => {
    expect(budgetSchema.safeParse(validBudget).success).toBe(true);
  });

  it('rejects zero or negative totalBudget', () => {
    expect(budgetSchema.safeParse({ ...validBudget, totalBudget: 0 }).success).toBe(false);
    expect(budgetSchema.safeParse({ ...validBudget, totalBudget: -100 }).success).toBe(false);
  });

  it('rejects empty categories array', () => {
    expect(budgetSchema.safeParse({ ...validBudget, categories: [] }).success).toBe(false);
  });

  it('rejects when percentages do not sum to 100', () => {
    const badCats = [
      { name: 'Food', amount: 400, percentage: 40 },
      { name: 'Transport', amount: 300, percentage: 30 },
    ]; // sum = 70, not 100
    expect(budgetSchema.safeParse({ ...validBudget, categories: badCats }).success).toBe(false);
  });
});
