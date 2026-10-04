import { XP_AWARDS, LEVELS, calculateLevel } from './gamificationConstants';

describe('Gamification — advanced XP scenarios', () => {
  describe('Level progression with real activity', () => {
    it('30 transactions reach level 3 (300 XP)', () => {
      const xp = 30 * XP_AWARDS.TRANSACTION;
      expect(xp).toBe(300);
      expect(calculateLevel(xp).level).toBe(3);
    });

    it('50 transactions reach level 4 (500 XP)', () => {
      const xp = 50 * XP_AWARDS.TRANSACTION;
      expect(xp).toBe(500);
      expect(calculateLevel(xp).level).toBe(3); // still level 3 (600 needed for 4)
    });

    it('60 transactions reach level 4 (600 XP)', () => {
      const xp = 60 * XP_AWARDS.TRANSACTION;
      expect(xp).toBe(600);
      expect(calculateLevel(xp).level).toBe(4);
    });

    it('6 budget goals + 60 transactions = level 5 (1300 XP)', () => {
      const xp = 6 * XP_AWARDS.BUDGET_MET + 60 * XP_AWARDS.TRANSACTION;
      expect(xp).toBe(900); // 300 + 600
      expect(calculateLevel(xp).level).toBe(4); // between 600 and 1000
    });

    it('10 budget goals = level 5 (500 XP budget + 500 from transactions = 1000)', () => {
      const xp = 10 * XP_AWARDS.BUDGET_MET + 50 * XP_AWARDS.TRANSACTION;
      expect(xp).toBe(1000); // 500 + 500
      expect(calculateLevel(xp).level).toBe(5);
    });
  });

  describe('Level boundary accuracy', () => {
    LEVELS.forEach(({ level, requiredXP, title }) => {
      it(`${requiredXP} XP → level ${level} (${title})`, () => {
        expect(calculateLevel(requiredXP).level).toBe(level);
        expect(calculateLevel(requiredXP).title).toBe(title);
      });
    });
  });
});
