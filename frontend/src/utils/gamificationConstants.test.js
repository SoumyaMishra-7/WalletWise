import { XP_AWARDS, LEVELS, BADGES, calculateLevel } from './gamificationConstants';

describe('XP_AWARDS', () => {
  it('TRANSACTION award is 10 XP', () => {
    expect(XP_AWARDS.TRANSACTION).toBe(10);
  });

  it('BUDGET_MET award is 50 XP', () => {
    expect(XP_AWARDS.BUDGET_MET).toBe(50);
  });

  it('STREAK_BONUS_MULTIPLIER is 5', () => {
    expect(XP_AWARDS.STREAK_BONUS_MULTIPLIER).toBe(5);
  });

  it('all XP values are positive integers', () => {
    for (const value of Object.values(XP_AWARDS)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe('LEVELS', () => {
  it('has exactly 7 levels', () => {
    expect(LEVELS).toHaveLength(7);
  });

  it('first level starts at 0 XP', () => {
    expect(LEVELS[0].requiredXP).toBe(0);
    expect(LEVELS[0].level).toBe(1);
  });

  it('max level is 7', () => {
    expect(LEVELS[LEVELS.length - 1].level).toBe(7);
  });

  it('levels are in ascending XP order', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].requiredXP).toBeGreaterThan(LEVELS[i - 1].requiredXP);
    }
  });

  it('each level has level, requiredXP, and title', () => {
    for (const level of LEVELS) {
      expect(level).toHaveProperty('level');
      expect(level).toHaveProperty('requiredXP');
      expect(level).toHaveProperty('title');
    }
  });
});

describe('BADGES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(BADGES)).toBe(true);
    expect(BADGES.length).toBeGreaterThan(0);
  });

  it('each badge has id, name, description, and icon', () => {
    for (const badge of BADGES) {
      expect(badge).toHaveProperty('id');
      expect(badge).toHaveProperty('name');
      expect(badge).toHaveProperty('description');
      expect(badge).toHaveProperty('icon');
    }
  });

  it('has FIRST_TRANSACTION badge', () => {
    expect(BADGES.some((b) => b.id === 'FIRST_TRANSACTION')).toBe(true);
  });
});

describe('calculateLevel', () => {
  it('returns level 1 for 0 XP', () => {
    expect(calculateLevel(0).level).toBe(1);
  });

  it('returns level 2 for 100 XP', () => {
    expect(calculateLevel(100).level).toBe(2);
  });

  it('returns level 7 for max XP (2500+)', () => {
    expect(calculateLevel(3000).level).toBe(7);
  });

  it('returns progress 100 at max level', () => {
    expect(calculateLevel(3000).progress).toBe(100);
  });

  it('returns correct title for level 1', () => {
    expect(calculateLevel(0).title).toBe('Budget Beginner');
  });

  it('returns correct title for level 5', () => {
    expect(calculateLevel(1000).title).toBe('Wealth Wizard');
  });

  it('returns correct nextLevelXP for level 1', () => {
    expect(calculateLevel(0).nextLevelXP).toBe(100);
  });
});
