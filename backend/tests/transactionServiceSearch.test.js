'use strict';

const TransactionService = require('../services/TransactionService');
const MockTransactionRepository = require('./mocks/MockTransactionRepository');
const MockUserRepository = require('./mocks/MockUserRepository');
const MockGamificationService = require('./mocks/MockGamificationService');
const MockLogger = require('./mocks/MockLogger');

describe('TransactionService — search and filter', () => {
  let service;
  let txRepo;
  let userRepo;
  let testUser;

  beforeEach(async () => {
    txRepo = new MockTransactionRepository();
    userRepo = new MockUserRepository();
    const gamification = new MockGamificationService();
    const logger = new MockLogger();

    service = new TransactionService({
      transactionRepository: txRepo,
      userRepository: userRepo,
      gamificationService: gamification,
      logger,
    });

    testUser = await userRepo.create({
      email: 'search-test@example.com',
      studentId: 'SEARCH001',
      walletBalance: 5000,
    });

    // Seed transactions
    await service.addTransaction(testUser._id, { type: 'expense', amount: 100, category: 'food', description: 'Pizza Hut dinner', forceDuplicate: true });
    await service.addTransaction(testUser._id, { type: 'expense', amount: 50, category: 'transport', description: 'Uber ride', forceDuplicate: true });
    await service.addTransaction(testUser._id, { type: 'income', amount: 2000, category: 'salary', description: 'Monthly salary', forceDuplicate: true });
  });

  describe('search by description', () => {
    it('returns matching transactions for a simple term', async () => {
      const { transactions } = await service.getAllTransactions(testUser._id, { search: 'Pizza' });
      expect(transactions.some(t => t.description?.includes('Pizza'))).toBe(true);
    });

    it('is case-insensitive', async () => {
      const { transactions } = await service.getAllTransactions(testUser._id, { search: 'pizza' });
      expect(transactions.length).toBeGreaterThan(0);
    });

    it('returns empty for a search with no matches', async () => {
      const { transactions } = await service.getAllTransactions(testUser._id, { search: 'xxxxnotfound' });
      expect(transactions.length).toBe(0);
    });

    it('handles ReDoS-unsafe regex characters without crashing', async () => {
      // These characters would crash new RegExp() if not escaped
      const dangerousInputs = ['(a+)+', '+++', '[unclosed', '**', '(?:'];
      for (const input of dangerousInputs) {
        await expect(
          service.getAllTransactions(testUser._id, { search: input })
        ).resolves.toBeDefined();
      }
    });

    it('treats special regex characters as literal', async () => {
      await service.addTransaction(testUser._id, {
        type: 'expense', amount: 10, category: 'food',
        description: 'Cost: $5.00 (discounted)', forceDuplicate: true
      });
      const { transactions } = await service.getAllTransactions(testUser._id, { search: '$5.00' });
      expect(transactions.some(t => t.description?.includes('$5.00'))).toBe(true);
    });
  });

  describe('filter by type', () => {
    it('returns only expense transactions', async () => {
      const { transactions } = await service.getAllTransactions(testUser._id, { type: 'expense' });
      expect(transactions.every(t => t.type === 'expense')).toBe(true);
    });

    it('returns only income transactions', async () => {
      const { transactions } = await service.getAllTransactions(testUser._id, { type: 'income' });
      expect(transactions.every(t => t.type === 'income')).toBe(true);
    });

    it('returns all transactions when type is "all"', async () => {
      const allResult = await service.getAllTransactions(testUser._id, { type: 'all' });
      const unfiltered = await service.getAllTransactions(testUser._id, {});
      expect(allResult.transactions.length).toBe(unfiltered.transactions.length);
    });
  });

  describe('pagination', () => {
    it('respects the limit parameter', async () => {
      const { transactions } = await service.getAllTransactions(testUser._id, { limit: 2 });
      expect(transactions.length).toBeLessThanOrEqual(2);
    });

    it('returns correct total count', async () => {
      const { pagination } = await service.getAllTransactions(testUser._id, { limit: 1 });
      expect(pagination.total).toBe(3);
    });
  });
});
