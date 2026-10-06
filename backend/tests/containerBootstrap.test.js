'use strict';

const { createContainer } = require('../containerBootstrap');

describe('containerBootstrap — createContainer', () => {
  it('returns an object with a resolve function', () => {
    const container = createContainer();
    expect(typeof container.resolve).toBe('function');
  });

  it('resolves analyticsService', () => {
    const container = createContainer();
    const svc = container.resolve('analyticsService');
    expect(svc).toBeDefined();
    expect(typeof svc.getForecast).toBe('function');
  });

  it('resolves gamificationService', () => {
    const container = createContainer();
    const svc = container.resolve('gamificationService');
    expect(svc).toBeDefined();
    expect(typeof svc.recordUserActivity).toBe('function');
  });

  it('resolves budgetService', () => {
    const container = createContainer();
    const svc = container.resolve('budgetService');
    expect(svc).toBeDefined();
    expect(typeof svc.setBudget).toBe('function');
  });

  it('resolves transactionService', () => {
    const container = createContainer();
    const svc = container.resolve('transactionService');
    expect(svc).toBeDefined();
    expect(typeof svc.addTransaction).toBe('function');
  });

  it('resolves savingsGoalService', () => {
    const container = createContainer();
    const svc = container.resolve('savingsGoalService');
    expect(svc).toBeDefined();
    expect(typeof svc.createGoal).toBe('function');
  });

  it('resolves dashboardService', () => {
    const container = createContainer();
    const svc = container.resolve('dashboardService');
    expect(svc).toBeDefined();
    expect(typeof svc.getDashboardData).toBe('function');
  });

  it('throws for unregistered service', () => {
    const container = createContainer();
    expect(() => container.resolve('nonExistentService')).toThrow();
  });
});
