'use strict';

const BudgetService = require('../services/BudgetService');

const mockBudgetRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const service = new BudgetService({
  budgetRepository: mockBudgetRepo,
  transactionRepository: { find: jest.fn(() => Promise.resolve([])) },
  gamificationService: { awardBadge: jest.fn(() => Promise.resolve(null)) },
  logger: { info: jest.fn(), error: jest.fn() },
});

describe('BudgetService.getBudgetByMonth — month format validation', () => {
  it('returns 400 for "January-2024"', async () => {
    const result = await service.getBudgetByMonth('user1', 'January-2024');
    expect(result.status).toBe(400);
  });

  it('returns 400 for "2024/01"', async () => {
    const result = await service.getBudgetByMonth('user1', '2024/01');
    expect(result.status).toBe(400);
  });

  it('returns 400 for "24-01" (2-digit year)', async () => {
    const result = await service.getBudgetByMonth('user1', '24-01');
    expect(result.status).toBe(400);
  });

  it('does not return 400 for valid "2024-01" format', async () => {
    mockBudgetRepo.findOne.mockResolvedValue(null);
    const result = await service.getBudgetByMonth('user1', '2024-01');
    // Should not be a 400 error
    if (result?.status) {
      expect(result.status).not.toBe(400);
    }
  });

  it('does not return 400 for valid "2026-12" format', async () => {
    mockBudgetRepo.findOne.mockResolvedValue(null);
    const result = await service.getBudgetByMonth('user1', '2026-12');
    if (result?.status) {
      expect(result.status).not.toBe(400);
    }
  });
});

describe('BudgetService.setBudget — percentage sum validation', () => {
  const categories = (pcts) =>
    pcts.map((p, i) => ({ name: `Cat${i}`, amount: p * 10, percentage: p }));

  it('rejects when percentages sum to 99', async () => {
    mockBudgetRepo.findOne.mockResolvedValue(null);
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: categories([50, 49]),
    });
    expect(result.status).toBe(400);
  });

  it('rejects when percentages sum to 101', async () => {
    mockBudgetRepo.findOne.mockResolvedValue(null);
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: categories([50, 51]),
    });
    expect(result.status).toBe(400);
  });

  it('accepts when percentages sum to exactly 100', async () => {
    mockBudgetRepo.findOne.mockResolvedValue(null);
    mockBudgetRepo.create.mockResolvedValue({
      _id: 'mock-id', totalBudget: 1000, categories: [], toJSON: () => ({})
    });
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [
        { name: 'Food', amount: 600, percentage: 60 },
        { name: 'Transport', amount: 400, percentage: 40 },
      ],
    });
    expect(result.status).not.toBe(400);
  });
});
