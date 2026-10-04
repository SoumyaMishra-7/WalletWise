import { calculateLevel, LEVELS } from './gamificationConstants';

describe('calculateLevel — comprehensive edge cases', () => {
  describe('exact level thresholds', () => {
    LEVELS.forEach(({ level, requiredXP, title }) => {
      it(`${requiredXP} XP → level ${level} (${title})`, () => {
        const result = calculateLevel(requiredXP);
        expect(result.level).toBe(level);
        expect(result.title).toBe(title);
      });
    });
  });

  describe('just below level thresholds', () => {
    it('99 XP stays at level 1', () => {
      expect(calculateLevel(99).level).toBe(1);
    });

    it('299 XP stays at level 2', () => {
      expect(calculateLevel(299).level).toBe(2);
    });

    it('599 XP stays at level 3', () => {
      expect(calculateLevel(599).level).toBe(3);
    });
  });

  describe('progress calculation', () => {
    it('0 XP has 0% progress toward level 2', () => {
      expect(calculateLevel(0).progress).toBe(0);
    });

    it('50 XP has 50% progress toward level 2 (0→100)', () => {
      expect(calculateLevel(50).progress).toBeCloseTo(50, 0);
    });

    it('max level has 100% progress', () => {
      expect(calculateLevel(5000).progress).toBe(100);
    });
  });

  describe('nextLevelXP', () => {
    it('level 1 next threshold is 100', () => {
      expect(calculateLevel(0).nextLevelXP).toBe(100);
    });

    it('max level returns "Max" for nextLevelXP', () => {
      expect(calculateLevel(5000).nextLevelXP).toBe('Max');
    });
  });

  describe('large XP values', () => {
    it('10000 XP → level 7 (max)', () => {
      expect(calculateLevel(10000).level).toBe(7);
    });

    it('exact 2500 XP → level 7', () => {
      expect(calculateLevel(2500).level).toBe(7);
    });
  });
});
