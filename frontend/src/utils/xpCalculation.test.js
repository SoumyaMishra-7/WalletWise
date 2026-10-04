import { XP_AWARDS, calculateLevel } from './gamificationConstants';

describe('XP calculation integration', () => {
  it('5 transactions earn 50 XP (5 × 10)', () => {
    const xp = 5 * XP_AWARDS.TRANSACTION;
    expect(xp).toBe(50);
  });

  it('2 budget goals earn 100 XP (2 × 50)', () => {
    const xp = 2 * XP_AWARDS.BUDGET_MET;
    expect(xp).toBe(100);
  });

  it('streak of 5 days earns 25 bonus XP (5 × 5)', () => {
    const bonus = 5 * XP_AWARDS.STREAK_BONUS_MULTIPLIER;
    expect(bonus).toBe(25);
  });

  it('100 XP from transactions puts user at level 2', () => {
    const xp = 10 * XP_AWARDS.TRANSACTION;
    expect(calculateLevel(xp).level).toBe(2);
  });

  it('600 XP = level 4 (5 budget goals + 55 transactions)', () => {
    const xp = 5 * XP_AWARDS.BUDGET_MET + 35 * XP_AWARDS.TRANSACTION;
    // 250 + 350 = 600
    expect(xp).toBe(600);
    expect(calculateLevel(xp).level).toBe(4);
  });

  it('XP milestones leading to level progression', () => {
    const milestones = [
      { xp: 0,    level: 1 },
      { xp: 100,  level: 2 },
      { xp: 300,  level: 3 },
      { xp: 600,  level: 4 },
      { xp: 1000, level: 5 },
      { xp: 1500, level: 6 },
      { xp: 2500, level: 7 },
    ];
    for (const { xp, level } of milestones) {
      expect(calculateLevel(xp).level).toBe(level);
    }
  });
});
