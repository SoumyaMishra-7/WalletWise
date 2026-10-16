const {
  roundMoney,
  isValidMonth,
  getCurrentMonth,
  getPreviousMonth,
  getMonthRange,
  calculateRollover,
  getRolloverAmount,
  getAvailableBudget,
  getCategoryAvailable,
  calculateUtilization
} = require('../utils/budgetRollover');

describe('month helpers', () => {
  test('getPreviousMonth handles a normal month', () => {
    expect(getPreviousMonth('2026-10')).toBe('2026-09');
    expect(getPreviousMonth('2026-02')).toBe('2026-01');
  });

  test('getPreviousMonth crosses the year boundary (Jan -> previous Dec)', () => {
    expect(getPreviousMonth('2027-01')).toBe('2026-12');
  });

  test('getPreviousMonth rejects invalid input', () => {
    expect(() => getPreviousMonth('2026-13')).toThrow(RangeError);
    expect(() => getPreviousMonth('2026-00')).toThrow(RangeError);
    expect(() => getPreviousMonth('26-01')).toThrow(RangeError);
    expect(() => getPreviousMonth(undefined)).toThrow(RangeError);
  });

  test('isValidMonth is strict about the month number', () => {
    expect(isValidMonth('2026-12')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
    expect(isValidMonth(null)).toBe(false);
  });

  test('getCurrentMonth uses UTC', () => {
    expect(getCurrentMonth(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
    expect(getCurrentMonth(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01');
  });

  test('getMonthRange returns a half-open UTC range, including December', () => {
    const feb = getMonthRange('2028-02'); // leap year
    expect(feb.start.toISOString()).toBe('2028-02-01T00:00:00.000Z');
    expect(feb.end.toISOString()).toBe('2028-03-01T00:00:00.000Z');

    const dec = getMonthRange('2026-12');
    expect(dec.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(dec.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('roundMoney', () => {
  test('removes floating point noise and -0', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(-0.0001)).toBe(0);
    expect(Object.is(roundMoney(-0.0001), 0)).toBe(true);
    expect(roundMoney('abc')).toBe(0);
  });
});

describe('calculateRollover', () => {
  const previousBudget = {
    categories: [
      { name: 'Food', amount: 3000 },
      { name: 'Transport', amount: 1000 },
      { name: 'Shopping', amount: 500 }
    ]
  };
  const newCategories = [{ name: 'Food' }, { name: 'Transport' }, { name: 'Shopping' }];
  const spent = { food: 2550, transport: 1200, shopping: 500 };

  test('positive mode carries unused money and ignores overspend', () => {
    const result = calculateRollover({ previousBudget, categories: newCategories, spentByCategory: spent, mode: 'positive' });
    expect(result.categories).toEqual([
      { name: 'Food', rolloverAmount: 450 },
      { name: 'Transport', rolloverAmount: 0 }, // overspent by 200 -> ignored
      { name: 'Shopping', rolloverAmount: 0 }   // exactly on budget
    ]);
    expect(result.total).toBe(450);
  });

  test('both mode also carries overspending as a negative amount', () => {
    const result = calculateRollover({ previousBudget, categories: newCategories, spentByCategory: spent, mode: 'both' });
    expect(result.categories.map((c) => c.rolloverAmount)).toEqual([450, -200, 0]);
    expect(result.total).toBe(250);
  });

  test('unknown mode falls back to positive', () => {
    const result = calculateRollover({ previousBudget, categories: newCategories, spentByCategory: spent, mode: 'nonsense' });
    expect(result.total).toBe(450);
  });

  test('category with no spending carries its whole budget', () => {
    const result = calculateRollover({ previousBudget, categories: newCategories, spentByCategory: {}, mode: 'positive' });
    expect(result.total).toBe(4500);
  });

  test('accepts a Map for spentByCategory', () => {
    const result = calculateRollover({
      previousBudget,
      categories: newCategories,
      spentByCategory: new Map([['food', 1000]]),
      mode: 'positive'
    });
    expect(result.categories[0].rolloverAmount).toBe(2000);
  });

  test('matches category names case-insensitively', () => {
    const result = calculateRollover({
      previousBudget: { categories: [{ name: 'FOOD', amount: 100 }] },
      categories: [{ name: 'food' }],
      spentByCategory: { food: 40 },
      mode: 'positive'
    });
    expect(result.total).toBe(60);
  });

  test('previous rollover compounds into the next leftover', () => {
    const result = calculateRollover({
      previousBudget: { categories: [{ name: 'Food', amount: 1000, rolloverAmount: 200 }] },
      categories: [{ name: 'Food' }],
      spentByCategory: { food: 900 },
      mode: 'positive'
    });
    expect(result.total).toBe(300); // (1000 + 200) - 900
  });

  test('categories removed from the new budget are dropped; total matches the sum', () => {
    const result = calculateRollover({
      previousBudget,
      categories: [{ name: 'Food' }],
      spentByCategory: spent,
      mode: 'positive'
    });
    expect(result.categories).toEqual([{ name: 'Food', rolloverAmount: 450 }]);
    expect(result.total).toBe(450);
  });

  test('new categories that did not exist last month get 0', () => {
    const result = calculateRollover({
      previousBudget,
      categories: [{ name: 'Food' }, { name: 'Healthcare' }],
      spentByCategory: spent,
      mode: 'both'
    });
    expect(result.categories[1]).toEqual({ name: 'Healthcare', rolloverAmount: 0 });
  });

  test('duplicate category names never count the same money twice', () => {
    const result = calculateRollover({
      previousBudget: { categories: [{ name: 'Food', amount: 100 }] },
      categories: [{ name: 'Food' }, { name: 'food' }],
      spentByCategory: {},
      mode: 'positive'
    });
    expect(result.categories.map((c) => c.rolloverAmount)).toEqual([100, 0]);
    expect(result.total).toBe(100);
  });

  test('missing previous budget or categories produce zero rollover', () => {
    expect(calculateRollover({ previousBudget: null, categories: newCategories, spentByCategory: {} }).total).toBe(0);
    expect(calculateRollover({ previousBudget, categories: undefined, spentByCategory: {} })).toEqual({ total: 0, categories: [] });
  });

  test('keeps cent precision', () => {
    const result = calculateRollover({
      previousBudget: { categories: [{ name: 'Food', amount: 100.1 }] },
      categories: [{ name: 'Food' }],
      spentByCategory: { food: 0.2 },
      mode: 'positive'
    });
    expect(result.total).toBe(99.9);
  });
});

describe('available budget helpers', () => {
  test('rollover disabled => exactly the base budget (backwards compatible)', () => {
    const budget = { totalBudget: 5000.123, rolloverEnabled: false, rolloverAmount: 999 };
    expect(getRolloverAmount(budget)).toBe(0);
    expect(getAvailableBudget(budget)).toBe(5000.123);
  });

  test('legacy documents without rollover fields still work', () => {
    expect(getAvailableBudget({ totalBudget: 4000 })).toBe(4000);
    expect(getCategoryAvailable({ rolloverEnabled: undefined }, { amount: 100 })).toBe(100);
  });

  test('positive and negative rollover are added to the base', () => {
    expect(getAvailableBudget({ totalBudget: 5000, rolloverEnabled: true, rolloverAmount: 450 })).toBe(5450);
    expect(getAvailableBudget({ totalBudget: 5000, rolloverEnabled: true, rolloverAmount: -200 })).toBe(4800);
  });

  test('null budget is safe', () => {
    expect(getAvailableBudget(null)).toBe(0);
  });

  test('category available adds the category rollover only when enabled', () => {
    const on = { rolloverEnabled: true };
    expect(getCategoryAvailable(on, { amount: 1000, rolloverAmount: 50 })).toBe(1050);
    expect(getCategoryAvailable({ rolloverEnabled: false }, { amount: 1000, rolloverAmount: 50 })).toBe(1000);
  });
});

describe('calculateUtilization', () => {
  test('normal and capped values', () => {
    expect(calculateUtilization(500, 1000)).toBe(50);
    expect(calculateUtilization(1500, 1000)).toBe(100);
  });

  test('80% threshold uses the rollover-adjusted amount', () => {
    // 4400 spent: 88% of a 5000 base, but only 80% of 5500 once 500 is carried over
    expect(calculateUtilization(4400, 5000)).toBeCloseTo(88);
    expect(calculateUtilization(4400, 5500)).toBeCloseTo(80);
  });

  test('zero or negative available budget counts as fully used once money is spent', () => {
    expect(calculateUtilization(10, 0)).toBe(100);
    expect(calculateUtilization(10, -50)).toBe(100);
    expect(calculateUtilization(0, 0)).toBe(0);
  });
});
