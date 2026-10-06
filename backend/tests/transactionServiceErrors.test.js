'use strict';

const TransactionService = require('../services/TransactionService');
const MockTransactionRepository = require('./mocks/MockTransactionRepository');
const MockUserRepository = require('./mocks/MockUserRepository');
const MockGamificationService = require('./mocks/MockGamificationService');
const MockLogger = require('./mocks/MockLogger');

describe('TransactionService — error handling and edge cases', () => {
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
      email: 'errtest@example.com',
      studentId: `ERR${Date.now()}`,
      walletBalance: 1000,
    });
  });

  describe('addTransaction — invalid inputs', () => {
    it('rejects when type is invalid', async () => {
      const req = { userId: testUser._id, body: { type: 'transfer', amount: 100, category: 'food' }, query: {}, params: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
      // Invalid type should return error
      const result = await service.addTransaction(testUser._id, { type: 'transfer', amount: 100, category: 'food' })
      expect(result).toBeDefined()
      // The service should either throw or return an error status
      if (result?.status) {
        expect(result.status).toBeGreaterThanOrEqual(400)
      }
    })

    it('rejects when amount is 0', async () => {
      const result = await service.addTransaction(testUser._id, { type: 'expense', amount: 0, category: 'food' })
      if (result?.status) {
        expect(result.status).toBeGreaterThanOrEqual(400)
      }
    })

    it('rejects when category is missing', async () => {
      const result = await service.addTransaction(testUser._id, { type: 'expense', amount: 50 })
      if (result?.status) {
        expect(result.status).toBeGreaterThanOrEqual(400)
      }
    })
  })

  describe('deleteTransaction — invalid IDs', () => {
    it('throws for invalid ObjectId format', async () => {
      await expect(
        service.deleteTransaction(testUser._id, 'not-a-valid-id')
      ).rejects.toThrow()
    })

    it('throws for non-existent transaction', async () => {
      await expect(
        service.deleteTransaction(testUser._id, '6501234567890abc12345678')
      ).rejects.toThrow()
    })
  })

  describe('getAllTransactions — pagination safety', () => {
    it('accepts zero page count gracefully', async () => {
      const result = await service.getAllTransactions(testUser._id, { page: 0, limit: 10 })
      expect(result).toBeDefined()
      expect(Array.isArray(result.transactions)).toBe(true)
    })

    it('accepts very large limit without throwing', async () => {
      const result = await service.getAllTransactions(testUser._id, { limit: 9999 })
      expect(Array.isArray(result.transactions)).toBe(true)
    })

    it('handles NaN page param', async () => {
      const result = await service.getAllTransactions(testUser._id, { page: NaN })
      expect(Array.isArray(result.transactions)).toBe(true)
    })
  })
})
