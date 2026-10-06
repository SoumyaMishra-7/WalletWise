import { calculateLevel } from './gamificationConstants';

describe('calculateLevel — progress accuracy', () => {
  it('50 XP = 50% progress toward level 2 (0→100)', () => {
    const { progress } = calculateLevel(50);
    expect(progress).toBeCloseTo(50, 0);
  });

  it('200 XP = 50% progress toward level 3 (100→300)', () => {
    const { progress } = calculateLevel(200);
    expect(progress).toBeCloseTo(50, 0);
  });

  it('900 XP = 75% progress toward level 5 (600→1000)', () => {
    const { progress } = calculateLevel(900);
    expect(progress).toBeCloseTo(75, 0);
  });

  it('progress is capped at 100 at max level', () => {
    expect(calculateLevel(5000).progress).toBe(100);
  });

  it('progress is between 0 and 100 for all tested XP values', () => {
    const xpValues = [0, 50, 100, 250, 500, 1000, 1500, 2500, 3000];
    for (const xp of xpValues) {
      const { progress } = calculateLevel(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    }
  });

  it('level title changes at threshold', () => {
    const before = calculateLevel(99);
    const after = calculateLevel(100);
    expect(before.title).toBe('Budget Beginner');
    expect(after.title).toBe('Penny Pincher');
  });
});
