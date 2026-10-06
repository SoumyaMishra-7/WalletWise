'use strict';

const { evaluateBadges, calculateLevel } = require('../utils/gamificationEngine');
const { BADGES, LEVELS, XP_AWARDS } = require('../utils/gamificationConstants');

describe('Badge award scenarios', () => {
  const makeUser = (overrides = {}) => ({
    unlockedBadges: [],
    currentStreak: 0,
    totalXP: 0,
    ...overrides,
  });

  describe('FIRST_TRANSACTION badge', () => {
    it('awards badge on first TRANSACTION_ADDED event', () => {
      const badges = evaluateBadges(makeUser(), { event: 'TRANSACTION_ADDED' });
      expect(badges).toContain('FIRST_TRANSACTION');
    });

    it('does not re-award to a user who already has it', () => {
      const user = makeUser({ unlockedBadges: ['FIRST_TRANSACTION'] });
      const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
      expect(badges).not.toContain('FIRST_TRANSACTION');
    });
  });

  describe('STREAK badges', () => {
    it('awards STREAK_3 badge at 3-day streak', () => {
      const user = makeUser({ currentStreak: 3 });
      const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
      expect(badges).toContain('STREAK_3');
    });

    it('awards STREAK_7 badge at 7-day streak', () => {
      const user = makeUser({ currentStreak: 7 });
      const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
      expect(badges).toContain('STREAK_7');
    });

    it('awards both STREAK_3 and STREAK_7 at 7-day streak (if neither is unlocked)', () => {
      const user = makeUser({ currentStreak: 7 });
      const badges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
      expect(badges).toContain('STREAK_3');
      expect(badges).toContain('STREAK_7');
    });
  });

  describe('Level progression with badge unlock', () => {
    it('XP_AWARDS.TRANSACTION is 10 XP', () => {
      expect(XP_AWARDS.TRANSACTION).toBe(10);
    });

    it('10 transactions worth of XP (100 XP) advances to level 2', () => {
      const xp = XP_AWARDS.TRANSACTION * 10; // 100 XP
      expect(calculateLevel(xp)).toBe(2);
    });

    it('level 7 is the maximum defined level', () => {
      const maxLevel = Math.max(...LEVELS.map(l => l.level));
      expect(calculateLevel(99999)).toBe(maxLevel);
    });
  });

  describe('BADGES catalog integrity', () => {
    it('no two badges share the same id', () => {
      const ids = BADGES.map(b => b.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all badge condition types are from the supported set', () => {
      const validTypes = new Set(['FIRST_TRANSACTION', 'STREAK', 'XP_MILESTONE', 'SAVINGS_GOAL_STARTED', 'FIRST_BUDGET']);
      BADGES.forEach(b => {
        expect(validTypes.has(b.condition.type)).toBe(true);
      });
    });

    it('XP_MILESTONE conditions have positive numeric values', () => {
      BADGES.filter(b => b.condition.type === 'XP_MILESTONE').forEach(b => {
        expect(typeof b.condition.value).toBe('number');
        expect(b.condition.value).toBeGreaterThan(0);
      });
    });
  });
});
