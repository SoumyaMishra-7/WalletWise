const TransactionService = require('../services/TransactionService');
const MockTransactionRepository = require('./mocks/MockTransactionRepository');
const MockUserRepository = require('./mocks/MockUserRepository');
const MockGamificationService = require('./mocks/MockGamificationService');
const MockLogger = require('./mocks/MockLogger');

describe('TransactionService (with mocks — no database)', () => {
    let service;
    let txRepo;
    let userRepo;
    let gamification;
    let logger;
    let testUser;

    beforeEach(async () => {
        txRepo = new MockTransactionRepository();
        userRepo = new MockUserRepository();
        gamification = new MockGamificationService();
        logger = new MockLogger();

        service = new TransactionService({
            transactionRepository: txRepo,
            userRepository: userRepo,
            gamificationService: gamification,
            logger
        });

        // Create a test user
        testUser = await userRepo.create({
            email: 'test@example.com',
            fullName: 'Test User',
            walletBalance: 1000
        });
    });

    afterEach(() => {
        txRepo.clear();
        userRepo.clear();
        gamification.clear();
        logger.clear();
    });

    describe('addTransaction', () => {
        it('should add an income transaction and update balance', async () => {
            const result = await service.addTransaction(testUser._id, {
                type: 'income',
                amount: 500,
                category: 'freelance',
                description: 'test income'
            });

            expect(result.duplicate).toBe(false);
            expect(result.transaction).toBeDefined();
            expect(result.transaction.type).toBe('income');
            expect(result.transaction.amount).toBe(500);

            // User balance should increase
            const user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(1500);

            // Gamification should be called
            expect(gamification.calls.recordUserActivity).toHaveLength(1);
        });

        it('should add an expense transaction and decrease balance', async () => {
            const result = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 200,
                category: 'food',
                description: 'lunch'
            });

            expect(result.duplicate).toBe(false);
            expect(result.transaction.type).toBe('expense');

            const user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(800);
        });

        it('should reject invalid data (negative amount)', async () => {
            await expect(service.addTransaction(testUser._id, {
                type: 'expense',
                amount: -50,
                category: 'food'
            })).rejects.toThrow();
        });

        it('should reject missing category', async () => {
            await expect(service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 50,
                category: ''
            })).rejects.toThrow();
        });

        it('should detect duplicate transactions within 24 hours', async () => {
            // First transaction
            await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 100,
                category: 'transport'
            });

            // Second identical transaction should be flagged
            const result = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 100,
                category: 'transport'
            });

            expect(result.duplicate).toBe(true);
        });

        it('should allow duplicate when forceDuplicate is true', async () => {
            await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 100,
                category: 'transport'
            });

            const result = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 100,
                category: 'transport',
                forceDuplicate: true
            });

            expect(result.duplicate).toBe(false);
            expect(result.transaction).toBeDefined();
        });
    });

    describe('deleteTransaction', () => {
        it('should delete a transaction and revert balance', async () => {
            const addResult = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 150,
                category: 'housing'
            });

            // Balance should be 850 (1000 - 150)
            let user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(850);

            await service.deleteTransaction(testUser._id, addResult.transaction._id.toString());

            // Balance should be restored to 1000
            user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(1000);
        });

        it('should throw for invalid transaction ID', async () => {
            await expect(
                service.deleteTransaction(testUser._id, 'invalid-id')
            ).rejects.toThrow('Invalid transaction ID format');
        });
    });

    describe('getAllTransactions', () => {
        it('should return paginated transactions', async () => {
            // Add 3 transactions
            await service.addTransaction(testUser._id, { type: 'expense', amount: 10, category: 'food', forceDuplicate: true });
            await service.addTransaction(testUser._id, { type: 'expense', amount: 20, category: 'transport', forceDuplicate: true });
            await service.addTransaction(testUser._id, { type: 'income', amount: 500, category: 'salary', forceDuplicate: true });

            const result = await service.getAllTransactions(testUser._id, {
                page: 1,
                limit: 10
            });

            expect(result.transactions.length).toBe(3);
            expect(result.pagination.total).toBe(3);
        });

        it('should filter by type', async () => {
            await service.addTransaction(testUser._id, { type: 'expense', amount: 10, category: 'food', forceDuplicate: true });
            await service.addTransaction(testUser._id, { type: 'income', amount: 500, category: 'salary', forceDuplicate: true });

            const result = await service.getAllTransactions(testUser._id, {
                type: 'expense'
            });

            expect(result.transactions.length).toBe(1);
            expect(result.transactions[0].type).toBe('expense');
        });
    });
});
