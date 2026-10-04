const { CATEGORIES } = require('./categories');

describe('CATEGORIES constants', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });

  it('all categories are lowercase strings', () => {
    for (const cat of CATEGORIES) {
      expect(typeof cat).toBe('string');
      expect(cat).toBe(cat.toLowerCase());
    }
  });

  it('no duplicate categories', () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
  });

  it('includes expense categories', () => {
    const expenses = ['food', 'transport', 'shopping', 'entertainment'];
    for (const e of expenses) {
      expect(CATEGORIES).toContain(e);
    }
  });

  it('includes income categories', () => {
    const income = ['salary', 'freelance', 'investment'];
    for (const i of income) {
      expect(CATEGORIES).toContain(i);
    }
  });

  it('includes "other" as fallback', () => {
    expect(CATEGORIES).toContain('other');
  });

  it('contains at least 15 categories', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(15);
  });

  it('no category has whitespace', () => {
    for (const cat of CATEGORIES) {
      expect(cat.trim()).toBe(cat);
    }
  });
});
