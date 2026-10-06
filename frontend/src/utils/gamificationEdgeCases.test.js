import { XP_AWARDS, LEVELS, BADGES, calculateLevel } from './gamificationConstants';

describe('calculateLevel — edge cases', () => {
  test('handles undefined XP', () => {
    expect(() => calculateLevel(undefined)).not.toThrow();
  });

  test('handles negative XP', () => {
    const result = calculateLevel(-100);
    expect(result.level).toBeGreaterThanOrEqual(1);
  });

  test('handles very large XP', () => {
    const result = calculateLevel(999999);
    expect(result.level).toBeLessThanOrEqual(LEVELS.length);
  });

  test('returns level with a title string', () => {
    const result = calculateLevel(500);
    expect(typeof result.title).toBe('string');
    expect(result.title.length).toBeGreaterThan(0);
  });

  test('returns level with a numeric level field', () => {
    const result = calculateLevel(100);
    expect(Number.isInteger(result.level)).toBe(true);
  });
});

describe('XP_AWARDS — consistency checks', () => {
  test('BUDGET_MET XP is a multiple of TRANSACTION XP', () => {
    // BUDGET_MET = 50, TRANSACTION = 10 → ratio = 5
    expect(XP_AWARDS.BUDGET_MET % XP_AWARDS.TRANSACTION).toBe(0);
  });

  test('all XP award keys have the same type (number)', () => {
    Object.values(XP_AWARDS).forEach(val => {
      expect(typeof val).toBe('number');
    });
  });
});

describe('BADGES — content integrity', () => {
  test('all badge icons are emoji strings', () => {
    BADGES.forEach(badge => {
      expect(typeof badge.icon).toBe('string');
      expect(badge.icon.length).toBeGreaterThan(0);
    });
  });

  test('all badge names are non-empty strings', () => {
    BADGES.forEach(badge => {
      expect(typeof badge.name).toBe('string');
      expect(badge.name.trim().length).toBeGreaterThan(0);
    });
  });

  test('all badge descriptions are non-empty strings', () => {
    BADGES.forEach(badge => {
      expect(typeof badge.description).toBe('string');
      expect(badge.description.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('LEVELS — structure integrity', () => {
  test('requiredXP for level 1 is 0', () => {
    const level1 = LEVELS.find(l => l.level === 1);
    expect(level1.requiredXP).toBe(0);
  });

  test('each level requires more XP than the previous', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].requiredXP).toBeGreaterThan(LEVELS[i - 1].requiredXP);
    }
  });
});
