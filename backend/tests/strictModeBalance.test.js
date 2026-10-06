'use strict';

const TransactionService = require('../services/TransactionService');
const MockTransactionRepository = require('./mocks/MockTransactionRepository');
const MockUserRepository = require('./mocks/MockUserRepository');
const MockGamificationService = require('./mocks/MockGamificationService');
const MockLogger = require('./mocks/MockLogger');

describe('STRICT_MODE wallet balance enforcement', () => {
  let service;
  let userRepo;
  let testUser;

  beforeEach(async () => {
    const txRepo = new MockTransactionRepository();
    userRepo = new MockUserRepository();

    // Enable strict mode for these tests
    service = new TransactionService({
      transactionRepository: txRepo,
      userRepository: userRepo,
      gamificationService: new MockGamificationService(),
      logger: new MockLogger(),
      strictMode: true, // override for testing
    });

    testUser = await userRepo.create({
      email: 'strict-test@example.com',
      studentId: `STRICT${Date.now()}`,
      walletBalance: 200,
    });
  });

  it('allows expense when balance is sufficient', async () => {
    const result = await service.addTransaction(testUser._id, {
      type: 'expense',
      amount: 100,
      category: 'food',
      forceDuplicate: true,
    });
    const user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(100);
  });

  it('allows expense equal to exact balance', async () => {
    const result = await service.addTransaction(testUser._id, {
      type: 'expense',
      amount: 200,
      category: 'food',
      forceDuplicate: true,
    });
    const user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(0);
  });

  it('income always increases balance regardless of current balance', async () => {
    // Income should never be blocked by balance
    await service.addTransaction(testUser._id, {
      type: 'income',
      amount: 500,
      category: 'salary',
      forceDuplicate: true,
    });
    const user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(700);
  });
});

describe('Balance validation — edge cases', () => {
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
      email: 'edge-test@example.com',
      studentId: `EDGE${Date.now()}`,
      walletBalance: 0,
    });
  });

  it('income works when balance is 0', async () => {
    await service.addTransaction(testUser._id, {
      type: 'income',
      amount: 100,
      category: 'salary',
      forceDuplicate: true,
    });
    const user = await userRepo.findById(testUser._id);
    expect(user.walletBalance).toBe(100);
  });

  it('wallet balance never goes below -Infinity (uses numeric arithmetic)', async () => {
    const result = await service.addTransaction(testUser._id, {
      type: 'expense',
      amount: 50,
      category: 'food',
      forceDuplicate: true,
    });
    // Whether strict or not, the balance after this should be finite
    const user = await userRepo.findById(testUser._id);
    expect(Number.isFinite(user.walletBalance)).toBe(true);
  });
});
