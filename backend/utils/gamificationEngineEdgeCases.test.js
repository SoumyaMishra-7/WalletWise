const { calculateLevel, evaluateBadges } = require('./gamificationEngine');

describe('gamificationEngine — edge cases', () => {
  describe('calculateLevel edge cases', () => {
    it('returns level 1 for negative XP', () => {
      expect(calculateLevel(-100)).toBe(1);
    });

    it('returns level 1 for fractional XP below 100', () => {
      expect(calculateLevel(99.9)).toBe(1);
    });

    it('returns level 7 for very large XP', () => {
      expect(calculateLevel(999999)).toBe(7);
    });
  });

  describe('evaluateBadges edge cases', () => {
    it('returns empty array for user with all badges and max XP', () => {
      const user = {
        unlockedBadges: ['FIRST_TRANSACTION', 'STREAK_3', 'STREAK_7', 'XP_500'],
        currentStreak: 100,
        totalXP: 10000,
      };
      expect(evaluateBadges(user, { event: 'TRANSACTION_ADDED' })).toHaveLength(0);
    });

    it('handles missing unlockedBadges (undefined)', () => {
      const user = { currentStreak: 0, totalXP: 0 };
      const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
      expect(badges).toContain('FIRST_TRANSACTION');
    });

    it('handles empty unlockedBadges', () => {
      const user = { unlockedBadges: [], currentStreak: 0, totalXP: 0 };
      const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
      expect(Array.isArray(badges)).toBe(true);
    });

    it('does not unlock streak badge when streak is 0', () => {
      const user = { unlockedBadges: [], currentStreak: 0, totalXP: 0 };
      const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
      expect(badges).not.toContain('STREAK_3');
    });
  });
});
