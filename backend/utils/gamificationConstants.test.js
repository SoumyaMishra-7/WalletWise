const { XP_AWARDS, LEVELS, BADGES } = require('./gamificationConstants');

describe('XP_AWARDS (backend)', () => {
  it('TRANSACTION is 10', () => {
    expect(XP_AWARDS.TRANSACTION).toBe(10);
  });

  it('BUDGET_MET is 50', () => {
    expect(XP_AWARDS.BUDGET_MET).toBe(50);
  });

  it('STREAK_BONUS_MULTIPLIER is 5', () => {
    expect(XP_AWARDS.STREAK_BONUS_MULTIPLIER).toBe(5);
  });

  it('all values are positive integers', () => {
    for (const v of Object.values(XP_AWARDS)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe('LEVELS (backend)', () => {
  it('has 7 levels', () => {
    expect(LEVELS).toHaveLength(7);
  });

  it('levels are in ascending XP order', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].requiredXP).toBeGreaterThan(LEVELS[i - 1].requiredXP);
    }
  });

  it('level 1 starts at 0 XP', () => {
    expect(LEVELS[0].requiredXP).toBe(0);
  });

  it('max level is 7 with title Financial Guru', () => {
    const max = LEVELS[LEVELS.length - 1];
    expect(max.level).toBe(7);
    expect(max.title).toBe('Financial Guru');
  });
});

describe('BADGES (backend)', () => {
  it('has 4 badges', () => {
    expect(BADGES).toHaveLength(4);
  });

  it('each badge has condition property', () => {
    for (const b of BADGES) {
      expect(b).toHaveProperty('condition');
    }
  });

  it('STREAK_3 condition has value 3', () => {
    const streak3 = BADGES.find((b) => b.id === 'STREAK_3');
    expect(streak3?.condition?.value).toBe(3);
  });

  it('STREAK_7 condition has value 7', () => {
    const streak7 = BADGES.find((b) => b.id === 'STREAK_7');
    expect(streak7?.condition?.value).toBe(7);
  });

  it('XP_500 condition milestone is 500', () => {
    const xp500 = BADGES.find((b) => b.id === 'XP_500');
    expect(xp500?.condition?.value).toBe(500);
  });
});
