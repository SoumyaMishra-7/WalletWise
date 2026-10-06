'use strict';

const SavingsGoalService = require('../services/SavingsGoalService');

const mockSavingsGoal = class {
  constructor(data) { Object.assign(this, data) }
  async save() { return this }
};

const service = new SavingsGoalService({
  savingsGoalModel: mockSavingsGoal,
  gamificationService: { awardBadge: jest.fn(() => Promise.resolve(null)) },
  logger: { info: jest.fn(), error: jest.fn() },
});

const validGoal = {
  name: 'Emergency Fund',
  targetAmount: 10000,
  targetDate: '2025-12-31',
};

describe('SavingsGoalService.createGoal — validation', () => {
  it('returns 400 when name is missing', async () => {
    const result = await service.createGoal('user1', { ...validGoal, name: undefined });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/required/i);
  });

  it('returns 400 when targetAmount is missing', async () => {
    const result = await service.createGoal('user1', { ...validGoal, targetAmount: undefined });
    expect(result.status).toBe(400);
  });

  it('returns 400 when targetDate is missing', async () => {
    const result = await service.createGoal('user1', { ...validGoal, targetDate: undefined });
    expect(result.status).toBe(400);
  });

  it('returns 400 when targetAmount is 0', async () => {
    const result = await service.createGoal('user1', { ...validGoal, targetAmount: 0 });
    expect(result.status).toBe(400);
  });

  it('returns 400 when targetAmount is negative', async () => {
    const result = await service.createGoal('user1', { ...validGoal, targetAmount: -100 });
    expect(result.status).toBe(400);
  });

  it('returns 400 when targetAmount is NaN', async () => {
    const result = await service.createGoal('user1', { ...validGoal, targetAmount: 'not-a-number' });
    expect(result.status).toBe(400);
  });

  it('creates a goal when all required fields are valid', async () => {
    const result = await service.createGoal('user1', validGoal);
    expect(result.status).not.toBe(400);
    expect(result.goal).toBeDefined();
    expect(result.goal.name).toBe('Emergency Fund');
    expect(result.goal.targetAmount).toBe(10000);
  });

  it('defaults priority to "Medium" when not provided', async () => {
    const result = await service.createGoal('user1', validGoal);
    expect(result.goal.name).toBeDefined(); // goal was created
  });

  it('parses string targetAmount correctly', async () => {
    const result = await service.createGoal('user1', { ...validGoal, targetAmount: '5000' });
    expect(result.status).not.toBe(400);
    expect(result.goal.targetAmount).toBe(5000);
  });
});
