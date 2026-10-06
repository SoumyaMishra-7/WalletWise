'use strict';

const { calculateLevel, evaluateBadges } = require('../utils/gamificationEngine');
const { LEVELS, BADGES } = require('../utils/gamificationConstants');

describe('calculateLevel', () => {
  it('returns level 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns level 1 for XP below the first threshold', () => {
    expect(calculateLevel(50)).toBe(1); // level 2 requires 100
  });

  it('returns level 2 at exactly 100 XP', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('returns the correct level for each boundary', () => {
    LEVELS.forEach(({ level, requiredXP }) => {
      expect(calculateLevel(requiredXP)).toBe(level);
    });
  });

  it('returns level 7 (max) for very high XP', () => {
    expect(calculateLevel(99999)).toBe(7);
  });

  it('returns the level for XP just below the next threshold', () => {
    // Level 2 requires 100, level 3 requires 300 → 299 XP = level 2
    expect(calculateLevel(299)).toBe(2);
    // Level 3 requires 300, level 4 requires 600 → 599 XP = level 3
    expect(calculateLevel(599)).toBe(3);
  });

  it('never returns a level above the max defined level', () => {
    const maxLevel = Math.max(...LEVELS.map(l => l.level));
    expect(calculateLevel(100000)).toBeLessThanOrEqual(maxLevel);
  });
});

describe('evaluateBadges', () => {
  const makeUser = (overrides = {}) => ({
    unlockedBadges: [],
    currentStreak: 0,
    totalXP: 0,
    ...overrides,
  });

  it('awards FIRST_TRANSACTION badge on first transaction event', () => {
    const user = makeUser();
    const newBadges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(newBadges).toContain('FIRST_TRANSACTION');
  });

  it('does not re-award an already-unlocked badge', () => {
    const user = makeUser({ unlockedBadges: ['FIRST_TRANSACTION'] });
    const newBadges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(newBadges).not.toContain('FIRST_TRANSACTION');
  });

  it('awards streak badge when streak meets the threshold', () => {
    const user = makeUser({ currentStreak: 3 });
    const newBadges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(newBadges).toContain('STREAK_3');
  });

  it('does not award streak badge when streak is below threshold', () => {
    const user = makeUser({ currentStreak: 2 });
    const newBadges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(newBadges).not.toContain('STREAK_3');
  });

  it('awards XP milestone badge when totalXP meets the threshold', () => {
    const xpMilestoneBadge = BADGES.find(b => b.condition.type === 'XP_MILESTONE');
    if (!xpMilestoneBadge) return; // skip if no XP_MILESTONE badge defined

    const user = makeUser({ totalXP: xpMilestoneBadge.condition.value });
    const newBadges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(newBadges).toContain(xpMilestoneBadge.id);
  });

  it('returns an empty array when no new badges are earned', () => {
    const allBadgeIds = BADGES.map(b => b.id);
    const user = makeUser({ unlockedBadges: allBadgeIds, currentStreak: 999, totalXP: 99999 });
    const newBadges = evaluateBadges(user, { event: 'TRANSACTION_ADDED' });
    expect(newBadges).toEqual([]);
  });
});
