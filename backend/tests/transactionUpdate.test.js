'use strict';

const TransactionService = require('../services/TransactionService');
const MockTransactionRepository = require('./mocks/MockTransactionRepository');
const MockUserRepository = require('./mocks/MockUserRepository');
const MockGamificationService = require('./mocks/MockGamificationService');
const MockLogger = require('./mocks/MockLogger');

describe('TransactionService — updateTransaction', () => {
  let service;
  let txRepo;
  let userRepo;
  let testUser;
  let expenseTx;

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
      email: 'update-test@example.com',
      studentId: `UPD${Date.now()}`,
      walletBalance: 1000,
    });

    // Create a base expense transaction
    const result = await service.addTransaction(testUser._id, {
      type: 'expense',
      amount: 100,
      category: 'food',
      description: 'original',
      forceDuplicate: true,
    });
    expenseTx = result.transaction;
  });

  it('updates the description of a transaction', async () => {
    const result = await service.updateTransaction(testUser._id, expenseTx._id.toString(), {
      description: 'updated description',
    });
    expect(result).toBeDefined();
  });

  it('throws for invalid transaction ObjectId', async () => {
    await expect(
      service.updateTransaction(testUser._id, 'invalid-id', { description: 'new' })
    ).rejects.toThrow();
  });

  it('throws for non-existent transaction', async () => {
    await expect(
      service.updateTransaction(testUser._id, '6501234567890abc12345678', { description: 'new' })
    ).rejects.toThrow();
  });

  it('changing amount updates the wallet balance', async () => {
    const userBefore = await userRepo.findById(testUser._id);
    const balanceBefore = userBefore.walletBalance;

    // Update expense from 100 to 50 → wallet should gain 50
    await service.updateTransaction(testUser._id, expenseTx._id.toString(), {
      amount: 50,
    });

    const userAfter = await userRepo.findById(testUser._id);
    expect(userAfter.walletBalance).toBe(balanceBefore + 50);
  });
});
