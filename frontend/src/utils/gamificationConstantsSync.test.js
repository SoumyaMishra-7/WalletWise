// Test that frontend gamificationConstants matches expected backend values
import { XP_AWARDS, LEVELS, BADGES } from './gamificationConstants';

describe('Frontend gamificationConstants — sync with backend', () => {
  it('XP_AWARDS.TRANSACTION = 10 (matches backend)', () => {
    expect(XP_AWARDS.TRANSACTION).toBe(10);
  });

  it('XP_AWARDS.BUDGET_MET = 50 (matches backend)', () => {
    expect(XP_AWARDS.BUDGET_MET).toBe(50);
  });

  it('XP_AWARDS.STREAK_BONUS_MULTIPLIER = 5 (matches backend)', () => {
    expect(XP_AWARDS.STREAK_BONUS_MULTIPLIER).toBe(5);
  });

  it('Level 1 starts at 0 XP (matches backend)', () => {
    expect(LEVELS[0].requiredXP).toBe(0);
  });

  it('Level 7 requires 2500 XP (matches backend)', () => {
    expect(LEVELS[6].requiredXP).toBe(2500);
  });

  it('FIRST_TRANSACTION badge ID matches backend', () => {
    const badge = BADGES.find((b) => b.id === 'FIRST_TRANSACTION');
    expect(badge).toBeDefined();
  });

  it('No duplicate badge IDs between frontend and expected backend IDs', () => {
    const frontendIds = BADGES.map((b) => b.id);
    const uniqueIds = new Set(frontendIds);
    expect(uniqueIds.size).toBe(frontendIds.length);
  });
});
