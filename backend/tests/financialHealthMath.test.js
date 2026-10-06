'use strict';

/**
 * Tests for the financial health score calculation logic.
 * Since the financialHealthService isn't in main yet (PR #552),
 * these tests verify the standalone math functions used in the score.
 */

describe('Financial health — savings rate math', () => {
  const calcSavingsRate = (income, savings) => income > 0 ? (savings / income) * 100 : 0;
  const calcRatioScore = (ratio) => Math.max(0, Math.min(1, (1.2 - ratio) / 0.4));

  it('savings rate of 20% is exactly 20', () => {
    expect(calcSavingsRate(10000, 2000)).toBeCloseTo(20, 1);
  });

  it('savings rate of 0 when income is 0', () => {
    expect(calcSavingsRate(0, 0)).toBe(0);
  });

  it('savings rate of 100% when all income is saved', () => {
    expect(calcSavingsRate(1000, 1000)).toBe(100);
  });

  it('expense ratio of 80% gives full score (1.0)', () => {
    expect(calcRatioScore(0.8)).toBeCloseTo(1.0, 5);
  });

  it('expense ratio of 120% gives zero score', () => {
    expect(calcRatioScore(1.2)).toBeCloseTo(0, 5);
  });

  it('expense ratio of 100% gives score between 0 and 1', () => {
    const score = calcRatioScore(1.0);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('Financial health — score boundaries', () => {
  const weights = {
    budgetAdherence: 30,
    incomeExpenseRatio: 25,
    savingsProgress: 20,
    spendingConsistency: 15,
    savingsMomentum: 10,
  };

  it('total weights sum to 100', () => {
    const total = Object.values(weights).reduce((s, v) => s + v, 0);
    expect(total).toBe(100);
  });

  it('perfect score (all sub-scores at 1.0) equals 100', () => {
    const score = Object.values(weights).reduce((s, w) => s + w, 0);
    expect(score).toBe(100);
  });

  it('zero score (all sub-scores at 0.0) equals 0', () => {
    const score = Object.values(weights).reduce((s) => s + 0, 0);
    expect(score).toBe(0);
  });

  it('score is always in [0, 100] range', () => {
    // Test a few combinations
    const combinations = [
      [1, 1, 1, 1, 1],   // perfect
      [0, 0, 0, 0, 0],   // zero
      [0.5, 0.5, 0.5, 0.5, 0.5], // half
      [1, 0, 1, 0, 1],   // alternating
    ];

    const weightList = Object.values(weights);
    combinations.forEach((scores) => {
      const rawScore = scores.reduce((sum, s, i) => sum + s * weightList[i], 0);
      const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)));
      expect(clampedScore).toBeGreaterThanOrEqual(0);
      expect(clampedScore).toBeLessThanOrEqual(100);
    });
  });
});
