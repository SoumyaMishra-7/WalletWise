const { calculateLevel, evaluateBadges } = require('./gamificationEngine');

describe('calculateLevel (gamificationEngine)', () => {
  it('0 XP → level 1', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('100 XP → level 2', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('300 XP → level 3', () => {
    expect(calculateLevel(300)).toBe(3);
  });

  it('600 XP → level 4', () => {
    expect(calculateLevel(600)).toBe(4);
  });

  it('1000 XP → level 5', () => {
    expect(calculateLevel(1000)).toBe(5);
  });

  it('1500 XP → level 6', () => {
    expect(calculateLevel(1500)).toBe(6);
  });

  it('2500 XP → level 7 (max)', () => {
    expect(calculateLevel(2500)).toBe(7);
  });

  it('10000 XP → still level 7 (capped)', () => {
    expect(calculateLevel(10000)).toBe(7);
  });

  it('99 XP stays at level 1', () => {
    expect(calculateLevel(99)).toBe(1);
  });
});

describe('evaluateBadges', () => {
  it('awards FIRST_TRANSACTION badge on first transaction', () => {
    const user = { unlockedBadges: [], currentStreak: 0, totalXP: 0 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).toContain('FIRST_TRANSACTION');
  });

  it('does not re-award already unlocked badge', () => {
    const user = { unlockedBadges: ['FIRST_TRANSACTION'], currentStreak: 0, totalXP: 0 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).not.toContain('FIRST_TRANSACTION');
  });

  it('awards STREAK_3 when currentStreak >= 3', () => {
    const user = { unlockedBadges: [], currentStreak: 3, totalXP: 0 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).toContain('STREAK_3');
  });

  it('awards XP_500 when totalXP >= 500', () => {
    const user = { unlockedBadges: [], currentStreak: 0, totalXP: 500 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).toContain('XP_500');
  });

  it('returns empty array when all badges already unlocked', () => {
    const user = { unlockedBadges: ['FIRST_TRANSACTION', 'STREAK_3', 'STREAK_7', 'XP_500'], currentStreak: 10, totalXP: 1000 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).toHaveLength(0);
  });
});
