const { CATEGORIES } = require('./categories');

describe('CATEGORIES — comprehensive coverage', () => {
  it('contains all expected expense categories', () => {
    const expenses = ['food', 'transport', 'shopping', 'entertainment', 'education', 'healthcare', 'housing'];
    for (const cat of expenses) {
      expect(CATEGORIES).toContain(cat);
    }
  });

  it('contains all expected income categories', () => {
    const income = ['pocket_money', 'salary', 'freelance', 'gift', 'investment'];
    for (const cat of income) {
      expect(CATEGORIES).toContain(cat);
    }
  });

  it('contains "other" as fallback', () => {
    expect(CATEGORIES).toContain('other');
  });

  it('total count is at least 13 (7 expense + 5 income + 1 other)', () => {
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(13);
  });

  it('pocket_money uses underscore (not hyphen or space)', () => {
    expect(CATEGORIES).toContain('pocket_money');
    expect(CATEGORIES).not.toContain('pocket-money');
    expect(CATEGORIES).not.toContain('pocket money');
  });

  it('no category contains uppercase letters', () => {
    for (const cat of CATEGORIES) {
      expect(cat).toBe(cat.toLowerCase());
    }
  });

  it('no category has leading or trailing whitespace', () => {
    for (const cat of CATEGORIES) {
      expect(cat.trim()).toBe(cat);
    }
  });
});
