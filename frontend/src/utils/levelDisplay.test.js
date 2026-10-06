import { calculateLevel } from './gamificationConstants';

describe('Level display format helpers', () => {
  it('level title is a non-empty string', () => {
    const { title } = calculateLevel(0);
    expect(title.trim().length).toBeGreaterThan(0);
  });

  it('nextLevelXP is a number or "Max"', () => {
    const { nextLevelXP } = calculateLevel(0);
    expect(typeof nextLevelXP === 'number' || nextLevelXP === 'Max').toBe(true);
  });

  it('progress is between 0 and 100 inclusive', () => {
    [0, 50, 100, 500, 1000, 2500, 5000].forEach((xp) => {
      const { progress } = calculateLevel(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  it('level integer is between 1 and 7', () => {
    [0, 50, 100, 500, 1000, 2500, 5000].forEach((xp) => {
      const { level } = calculateLevel(xp);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(7);
    });
  });

  it('Lvl badge can be formed as "Lvl X" string', () => {
    const { level } = calculateLevel(250);
    const badge = `Lvl ${level}`;
    expect(badge).toMatch(/^Lvl \d$/);
  });
});
