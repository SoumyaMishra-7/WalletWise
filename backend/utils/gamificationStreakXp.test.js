const { evaluateBadges, calculateLevel } = require('./gamificationEngine');

describe('Streak and XP badge unlocking', () => {
  it('STREAK_7 unlocked when currentStreak = 7', () => {
    const user = { unlockedBadges: [], currentStreak: 7, totalXP: 0 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).toContain('STREAK_7');
  });

  it('STREAK_7 not unlocked when currentStreak = 6', () => {
    const user = { unlockedBadges: [], currentStreak: 6, totalXP: 0 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).not.toContain('STREAK_7');
  });

  it('STREAK_3 not unlocked when streak < 3', () => {
    const user = { unlockedBadges: [], currentStreak: 2, totalXP: 0 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).not.toContain('STREAK_3');
  });

  it('XP_500 not unlocked below threshold', () => {
    const user = { unlockedBadges: [], currentStreak: 0, totalXP: 499 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).not.toContain('XP_500');
  });

  it('multiple badges can unlock simultaneously', () => {
    const user = { unlockedBadges: [], currentStreak: 7, totalXP: 500 };
    const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(badges).toContain('FIRST_TRANSACTION');
    expect(badges).toContain('STREAK_3');
    expect(badges).toContain('STREAK_7');
    expect(badges).toContain('XP_500');
  });
});

describe('calculateLevel — boundary precision', () => {
  it('299 XP → level 2 (not yet level 3)', () => {
    expect(calculateLevel(299)).toBe(2);
  });

  it('2499 XP → level 6 (not yet level 7)', () => {
    expect(calculateLevel(2499)).toBe(6);
  });
});
