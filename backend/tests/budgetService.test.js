'use strict';

const BudgetService = require('../services/BudgetService');

// Minimal mock implementations
const mockBudgetRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findByUserId: jest.fn(() => Promise.resolve([])),
};

const mockTxRepo = {
  find: jest.fn(() => Promise.resolve([])),
  aggregate: jest.fn(() => Promise.resolve([])),
};

const mockGamification = {
  awardBadge: jest.fn(() => Promise.resolve(null)),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const service = new BudgetService({
  budgetRepository: mockBudgetRepo,
  transactionRepository: mockTxRepo,
  gamificationService: mockGamification,
  logger: mockLogger,
});

const VALID_CATEGORIES = [
  { name: 'Food', amount: 500, percentage: 50, color: '#ff0000' },
  { name: 'Transport', amount: 500, percentage: 50, color: '#00ff00' },
];

describe('BudgetService — setBudget validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBudgetRepo.findOne.mockResolvedValue(null);
    mockBudgetRepo.create.mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock-id', toJSON: () => data }));
  });

  it('returns 400 when totalBudget is missing', async () => {
    const result = await service.setBudget('user1', { categories: VALID_CATEGORIES });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/total budget/i);
  });

  it('returns 400 when totalBudget is 0 or negative', async () => {
    const r1 = await service.setBudget('user1', { totalBudget: 0, categories: VALID_CATEGORIES });
    expect(r1.status).toBe(400);

    const r2 = await service.setBudget('user1', { totalBudget: -100, categories: VALID_CATEGORIES });
    expect(r2.status).toBe(400);
  });

  it('returns 400 when categories is empty or missing', async () => {
    const r1 = await service.setBudget('user1', { totalBudget: 1000, categories: [] });
    expect(r1.status).toBe(400);

    const r2 = await service.setBudget('user1', { totalBudget: 1000 });
    expect(r2.status).toBe(400);
  });

  it('returns 400 when a category is missing required fields', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [{ name: 'Food', amount: 1000 }] // missing percentage
    });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/percentage/i);
  });

  it('returns 400 when percentage is out of range', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [{ name: 'Food', amount: 1000, percentage: 110 }]
    });
    expect(result.status).toBe(400);
  });

  it('returns 400 when category amount is negative', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [{ name: 'Food', amount: -100, percentage: 100 }]
    });
    expect(result.status).toBe(400);
  });

  it('returns 400 when percentages do not sum to 100', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [{ name: 'Food', amount: 1000, percentage: 80 }]
    });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/percentage/i);
  });

  it('returns 400 when category amounts do not match totalBudget', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: [{ name: 'Food', amount: 900, percentage: 100 }]
    });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/sum/i);
  });

  it('returns 400 for invalid month format', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: VALID_CATEGORIES,
      month: 'January 2024'
    });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/YYYY-MM/i);
  });

  it('creates a new budget for valid input', async () => {
    const result = await service.setBudget('user1', {
      totalBudget: 1000,
      categories: VALID_CATEGORIES,
      month: '2024-01'
    });
    expect(result.status).not.toBe(400);
    expect(mockBudgetRepo.create).toHaveBeenCalled();
  });
});

describe('BudgetService — getBudgetByMonth validation', () => {
  it('returns 400 for invalid month format', async () => {
    const result = await service.getBudgetByMonth('user1', 'not-valid');
    expect(result.status).toBe(400);
  });

  it('does not throw for valid month format', async () => {
    mockBudgetRepo.findOne.mockResolvedValue(null);
    const result = await service.getBudgetByMonth('user1', '2024-01');
    expect(result).toBeDefined();
  });
});
