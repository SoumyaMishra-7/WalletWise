'use strict';

const SavingsGoalService = require('../services/SavingsGoalService');

const service = new SavingsGoalService({
  savingsGoalModel: {},
  gamificationService: { awardBadge: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn() },
});

describe('SavingsGoalService — calculatePredictiveFields', () => {
  const now = new Date();
  const futureDate = (daysFromNow) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysFromNow);
    return d;
  };
  const pastDate = (daysAgo) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  it('returns "Completed" when currentAmount >= targetAmount', () => {
    const result = service.calculatePredictiveFields({
      targetAmount: 1000,
      currentAmount: 1000,
      targetDate: futureDate(30),
    });
    expect(result.status).toBe('Completed');
  });

  it('returns requiredDailySavings = 0 when goal is already completed', () => {
    const result = service.calculatePredictiveFields({
      targetAmount: 500,
      currentAmount: 600,
      targetDate: futureDate(30),
    });
    expect(result.requiredDailySavings).toBe(0);
    expect(result.requiredWeeklySavings).toBe(0);
  });

  it('returns daysRemaining = 0 for past targetDate', () => {
    const result = service.calculatePredictiveFields({
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: pastDate(5),
    });
    expect(result.daysRemaining).toBe(0);
  });

  it('calculates requiredDailySavings correctly', () => {
    // 100 remaining over 10 days = 10/day
    const result = service.calculatePredictiveFields({
      targetAmount: 100,
      currentAmount: 0,
      targetDate: futureDate(10),
    });
    // daysRemaining could be 10 or 11 depending on exact ms, so allow range
    expect(result.requiredDailySavings).toBeCloseTo(100 / result.daysRemaining, 0);
  });

  it('requiredWeeklySavings is 7x requiredDailySavings', () => {
    const result = service.calculatePredictiveFields({
      targetAmount: 700,
      currentAmount: 0,
      targetDate: futureDate(7),
    });
    if (result.daysRemaining > 0) {
      expect(result.requiredWeeklySavings).toBeCloseTo(result.requiredDailySavings * 7, 1);
    }
  });

  it('returns "On track" when savings are ahead of expected pace', () => {
    // Created 30 days ago, target in 30 more days (60 days total)
    // At day 30 of 60 we're half-way through time → expected = targetAmount/2
    // If currentAmount = 75% of target, we are On track
    const createdAt = pastDate(30);
    const result = service.calculatePredictiveFields({
      targetAmount: 1000,
      currentAmount: 750, // 75% of target after 50% of time
      targetDate: futureDate(30),
      createdAt,
    });
    expect(result.status).toBe('On track');
  });

  it('returns "Lagging" when savings are behind expected pace', () => {
    // Created 30 days ago, target in 30 more days
    // At day 30 of 60 we expect 50%, but currentAmount is only 10%
    const createdAt = pastDate(30);
    const result = service.calculatePredictiveFields({
      targetAmount: 1000,
      currentAmount: 100, // 10% of target after 50% of time
      targetDate: futureDate(30),
      createdAt,
    });
    expect(result.status).toBe('Lagging');
  });

  it('does not throw when createdAt is missing', () => {
    expect(() =>
      service.calculatePredictiveFields({
        targetAmount: 1000,
        currentAmount: 500,
        targetDate: futureDate(30),
      })
    ).not.toThrow();
  });

  it('returns numeric values for requiredDailySavings and requiredWeeklySavings', () => {
    const result = service.calculatePredictiveFields({
      targetAmount: 1000,
      currentAmount: 0,
      targetDate: futureDate(30),
    });
    expect(typeof result.requiredDailySavings).toBe('number');
    expect(typeof result.requiredWeeklySavings).toBe('number');
    expect(Number.isFinite(result.requiredDailySavings)).toBe(true);
    expect(Number.isFinite(result.requiredWeeklySavings)).toBe(true);
  });
});
