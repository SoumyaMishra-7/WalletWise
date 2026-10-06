'use strict';

const BudgetService = require('../services/BudgetService');

const mockBudgetRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
};

const service = new BudgetService({
  budgetRepository: mockBudgetRepo,
  transactionRepository: { find: jest.fn(() => Promise.resolve([])) },
  gamificationService: { awardBadge: jest.fn(() => Promise.resolve(null)) },
  logger: { info: jest.fn(), error: jest.fn() },
});

describe('BudgetService.getAllBudgets', () => {
  it('returns empty array when no budgets exist', async () => {
    mockBudgetRepo.find = jest.fn(() => Promise.resolve([]));
    const result = await service.getAllBudgets('user1');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('returns budgets when they exist', async () => {
    const mockBudgets = [
      { _id: 'b1', totalBudget: 1000, month: '2024-01', categories: [], isActive: true },
      { _id: 'b2', totalBudget: 1200, month: '2024-02', categories: [], isActive: true },
    ];
    mockBudgetRepo.find = jest.fn(() => Promise.resolve(mockBudgets));
    const result = await service.getAllBudgets('user1');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });
});

describe('BudgetService.setBudget — edge cases', () => {
  beforeEach(() => {
    mockBudgetRepo.findOne.mockResolvedValue(null);
    mockBudgetRepo.create.mockResolvedValue({
      _id: 'mock-id',
      totalBudget: 1000,
      categories: [],
      month: '2024-01',
      toJSON: () => ({})
    });
  });

  it('accepts current month when month is not provided', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [
        { name: 'Food', amount: 600, percentage: 60 },
        { name: 'Transport', amount: 400, percentage: 40 },
      ],
    });
    expect(result.status).not.toBe(400);
  });

  it('accepts float percentage values that sum to 100', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [
        { name: 'Food', amount: 333.33, percentage: 33.33 },
        { name: 'Transport', amount: 333.33, percentage: 33.33 },
        { name: 'Shopping', amount: 333.34, percentage: 33.34 },
      ],
    });
    expect(result.status).not.toBe(400);
  });
});
