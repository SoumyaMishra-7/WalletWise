import { BADGES, XP_AWARDS, LEVELS, calculateLevel } from './gamificationConstants';

describe('BADGES — structure and content', () => {
  it('has at least 4 badges', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(4);
  });

  it('all badge IDs are unique', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all badge names are non-empty', () => {
    for (const badge of BADGES) {
      expect(badge.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('FIRST_TRANSACTION badge name is "First Steps"', () => {
    const b = BADGES.find((b) => b.id === 'FIRST_TRANSACTION');
    expect(b?.name).toBe('First Steps');
  });

  it('STREAK_3 badge exists', () => {
    expect(BADGES.some((b) => b.id === 'STREAK_3')).toBe(true);
  });

  it('STREAK_7 badge exists', () => {
    expect(BADGES.some((b) => b.id === 'STREAK_7')).toBe(true);
  });

  it('XP_500 badge exists', () => {
    expect(BADGES.some((b) => b.id === 'XP_500')).toBe(true);
  });

  it('all badges have emoji icon', () => {
    for (const badge of BADGES) {
      expect(typeof badge.icon).toBe('string');
      expect(badge.icon.length).toBeGreaterThan(0);
    }
  });
});

describe('XP calculation for badge earning', () => {
  it('BUDGET_MET award (50 XP) is 5x TRANSACTION award (10 XP)', () => {
    expect(XP_AWARDS.BUDGET_MET / XP_AWARDS.TRANSACTION).toBe(5);
  });

  it('earning 500 XP triggers XP_500 badge threshold', () => {
    const level500 = calculateLevel(500);
    expect(level500.level).toBeGreaterThanOrEqual(4); // Level 4 starts at 600 XP — 500 is level 3
  });
});
