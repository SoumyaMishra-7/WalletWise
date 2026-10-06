'use strict';

const TransactionService = require('../services/TransactionService');
const MockTransactionRepository = require('./mocks/MockTransactionRepository');
const MockUserRepository = require('./mocks/MockUserRepository');
const MockGamificationService = require('./mocks/MockGamificationService');
const MockLogger = require('./mocks/MockLogger');

describe('Transaction lifecycle — full CRUD flow', () => {
  let service;
  let txRepo;
  let userRepo;
  let testUser;

  beforeEach(async () => {
    txRepo = new MockTransactionRepository();
    userRepo = new MockUserRepository();
    service = new TransactionService({
      transactionRepository: txRepo,
      userRepository: userRepo,
      gamificationService: new MockGamificationService(),
      logger: new MockLogger(),
    });

    testUser = await userRepo.create({
      email: 'lifecycle@example.com',
      studentId: `LC${Date.now()}`,
      walletBalance: 1000,
    });
  });

  it('create → list → filter: transaction appears in filtered results', async () => {
    await service.addTransaction(testUser._id, {
      type: 'expense', amount: 25, category: 'coffee',
      description: 'Morning coffee', forceDuplicate: true,
    });

    const { transactions } = await service.getAllTransactions(testUser._id, { type: 'expense' });
    expect(transactions.some(t => t.description === 'Morning coffee')).toBe(true);
  });

  it('create → delete: transaction no longer appears in list', async () => {
    const { transaction } = await service.addTransaction(testUser._id, {
      type: 'expense', amount: 50, category: 'food',
      description: 'Lunch', forceDuplicate: true,
    });

    await service.deleteTransaction(testUser._id, transaction._id.toString());

    const { transactions } = await service.getAllTransactions(testUser._id, {});
    expect(transactions.some(t => t.description === 'Lunch')).toBe(false);
  });

  it('create → update → list: updated description appears', async () => {
    const { transaction } = await service.addTransaction(testUser._id, {
      type: 'expense', amount: 30, category: 'transport',
      description: 'old desc', forceDuplicate: true,
    });

    await service.updateTransaction(testUser._id, transaction._id.toString(), {
      description: 'new desc',
    });

    const { transactions } = await service.getAllTransactions(testUser._id, {});
    expect(transactions.some(t => t.description === 'new desc')).toBe(true);
    expect(transactions.some(t => t.description === 'old desc')).toBe(false);
  });

  it('duplicate prevention: same transaction within 24h returns 409', async () => {
    const txData = { type: 'expense', amount: 100, category: 'shopping' };
    await service.addTransaction(testUser._id, txData);
    const result = await service.addTransaction(testUser._id, txData);
    // Second attempt should be flagged as duplicate
    expect(result?.duplicate || result?.statusCode === 409).toBeTruthy();
  });

  it('recurring transaction sets nextExecutionDate', async () => {
    const { transaction } = await service.addTransaction(testUser._id, {
      type: 'expense', amount: 10, category: 'subscription',
      isRecurring: true, recurringInterval: 'monthly',
      forceDuplicate: true,
    });
    expect(transaction.nextExecutionDate).toBeDefined();
    expect(transaction.nextExecutionDate).toBeInstanceOf(Date);
  });
});
