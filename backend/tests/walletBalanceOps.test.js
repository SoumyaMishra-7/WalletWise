'use strict';

/**
 * Tests for wallet balance accuracy across transaction operations.
 * Uses mock repositories to avoid database dependencies.
 */
const TransactionService = require('../services/TransactionService');
const MockTransactionRepository = require('./mocks/MockTransactionRepository');
const MockUserRepository = require('./mocks/MockUserRepository');
const MockGamificationService = require('./mocks/MockGamificationService');
const MockLogger = require('./mocks/MockLogger');

describe('Wallet balance integrity', () => {
  let service;
  let userRepo;
  let testUser;

  beforeEach(async () => {
    const txRepo = new MockTransactionRepository();
    userRepo = new MockUserRepository();
    service = new TransactionService({
      transactionRepository: txRepo,
      userRepository: userRepo,
      gamificationService: new MockGamificationService(),
      logger: new MockLogger(),
    });

    testUser = await userRepo.create({
      email: 'balance-test@example.com',
      studentId: `BAL${Date.now()}`,
      walletBalance: 500,
    });
  });

  it('income increases wallet balance by exact amount', async () => {
    await service.addTransaction(testUser._id, {
      type: 'income',
      amount: 200,
      category: 'salary',
      forceDuplicate: true,
    });
    const user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(700);
  });

  it('expense decreases wallet balance by exact amount', async () => {
    await service.addTransaction(testUser._id, {
      type: 'expense',
      amount: 150,
      category: 'food',
      forceDuplicate: true,
    });
    const user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(350);
  });

  it('multiple transactions accumulate correctly', async () => {
    await service.addTransaction(testUser._id, { type: 'income', amount: 100, category: 'salary', forceDuplicate: true });
    await service.addTransaction(testUser._id, { type: 'expense', amount: 50, category: 'food', forceDuplicate: true });
    await service.addTransaction(testUser._id, { type: 'expense', amount: 30, category: 'transport', forceDuplicate: true });
    const user = await userRepo.findById(testUser._id);
    // 500 + 100 - 50 - 30 = 520
    expect(user.walletBalance).toBe(520);
  });

  it('deleting an expense returns money to wallet', async () => {
    const { transaction } = await service.addTransaction(testUser._id, {
      type: 'expense',
      amount: 200,
      category: 'shopping',
      forceDuplicate: true,
    });
    // Balance = 500 - 200 = 300
    let user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(300);

    await service.deleteTransaction(testUser._id, transaction._id.toString());
    // Balance should return to 500
    user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(500);
  });

  it('deleting an income removes it from wallet', async () => {
    const { transaction } = await service.addTransaction(testUser._id, {
      type: 'income',
      amount: 300,
      category: 'freelance',
      forceDuplicate: true,
    });
    // Balance = 500 + 300 = 800
    await service.deleteTransaction(testUser._id, transaction._id.toString());
    const user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(500);
  });
});
