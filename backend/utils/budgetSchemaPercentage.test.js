const { budgetSchema, categorySchema } = require('./validationSchemas');

describe('Budget schema — percentage boundary tests', () => {
  const validCat = (percent) => ({ name: 'Test', amount: 100, percentage: percent });

  it('percentage 0 is accepted', () => {
    expect(categorySchema.safeParse(validCat(0)).success).toBe(true);
  });

  it('percentage 100 is accepted', () => {
    expect(categorySchema.safeParse(validCat(100)).success).toBe(true);
  });

  it('percentage 0.01 is accepted', () => {
    expect(categorySchema.safeParse(validCat(0.01)).success).toBe(true);
  });

  it('percentage 99.99 is accepted', () => {
    expect(categorySchema.safeParse(validCat(99.99)).success).toBe(true);
  });

  it('percentage -0.01 is rejected', () => {
    expect(categorySchema.safeParse(validCat(-0.01)).success).toBe(false);
  });

  it('percentage 100.01 is rejected', () => {
    expect(categorySchema.safeParse(validCat(100.01)).success).toBe(false);
  });

  describe('Budget category sum tolerance', () => {
    it('exactly 100% across 3 categories is accepted', () => {
      const cats = [
        { name: 'A', amount: 300, percentage: 30 },
        { name: 'B', amount: 500, percentage: 50 },
        { name: 'C', amount: 200, percentage: 20 },
      ];
      expect(budgetSchema.safeParse({ totalBudget: 1000, categories: cats }).success).toBe(true);
    });

    it('99.99% sum is rejected (> 0.01 tolerance)', () => {
      const cats = [
        { name: 'A', amount: 300, percentage: 30 },
        { name: 'B', amount: 500, percentage: 50 },
        { name: 'C', amount: 199, percentage: 19.99 },
      ];
      expect(budgetSchema.safeParse({ totalBudget: 999, categories: cats }).success).toBe(false);
    });
  });
});
