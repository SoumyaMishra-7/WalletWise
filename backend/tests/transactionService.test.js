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

        it('should exclude soft-deleted transactions from results', async () => {
            const addResult = await service.addTransaction(testUser._id, {
                type: 'expense', amount: 100, category: 'food', forceDuplicate: true
            });
            await service.addTransaction(testUser._id, {
                type: 'income', amount: 200, category: 'salary', forceDuplicate: true
            });

            // Soft-delete first transaction
            await service.deleteTransaction(testUser._id, addResult.transaction._id.toString());

            const result = await service.getAllTransactions(testUser._id, { page: 1, limit: 10 });

            expect(result.transactions.length).toBe(1);
            expect(result.transactions[0].type).toBe('income');
        });
    });

    describe('deleteTransaction (soft-delete)', () => {
        it('should soft-delete a transaction and revert balance', async () => {
            const addResult = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 150,
                category: 'housing'
            });

            // Balance should be 850 (1000 - 150)
            let user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(850);

            const deleted = await service.deleteTransaction(testUser._id, addResult.transaction._id.toString());

            // Transaction should be soft-deleted, not removed
            expect(deleted.isDeleted).toBe(true);
            expect(deleted.deletedAt).toBeDefined();

            // Balance should be restored to 1000
            user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(1000);

            // Transaction should still exist in the repository
            const raw = await txRepo.findOne({ _id: addResult.transaction._id, isDeleted: true });
            expect(raw).not.toBeNull();
        });

        it('should throw for invalid transaction ID', async () => {
            await expect(
                service.deleteTransaction(testUser._id, 'invalid-id')
            ).rejects.toThrow('Invalid transaction ID format');
        });
    });

    describe('undoTransaction (server-side restore)', () => {
        it('should restore a soft-deleted transaction and re-apply balance', async () => {
            const addResult = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 200,
                category: 'shopping'
            });

            // Balance: 1000 - 200 = 800
            let user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(800);

            // Delete (soft) — balance reverts to 1000
            await service.deleteTransaction(testUser._id, addResult.transaction._id.toString());
            user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(1000);

            // Undo — balance goes back to 800
            const restored = await service.undoTransaction(testUser._id, addResult.transaction._id.toString());

            expect(restored.isDeleted).toBe(false);
            expect(restored.deletedAt).toBeNull();

            user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(800);
        });

        it('should restore a soft-deleted income transaction correctly', async () => {
            const addResult = await service.addTransaction(testUser._id, {
                type: 'income',
                amount: 500,
                category: 'salary'
            });

            // Balance: 1000 + 500 = 1500
            let user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(1500);

            // Delete — balance reverts to 1000
            await service.deleteTransaction(testUser._id, addResult.transaction._id.toString());
            user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(1000);

            // Undo — balance goes back to 1500
            const restored = await service.undoTransaction(testUser._id, addResult.transaction._id.toString());
            expect(restored.isDeleted).toBe(false);

            user = await userRepo.findById(testUser._id);
            expect(user.walletBalance).toBe(1500);
        });

        it('should reject undo for a non-deleted transaction', async () => {
            const addResult = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 100,
                category: 'food'
            });

            // Try to undo a transaction that was never deleted
            await expect(
                service.undoTransaction(testUser._id, addResult.transaction._id.toString())
            ).rejects.toThrow('No deleted transaction found to restore');
        });

        it('should reject undo after the undo window expires', async () => {
            const addResult = await service.addTransaction(testUser._id, {
                type: 'expense',
                amount: 100,
                category: 'food'
            });

            await service.deleteTransaction(testUser._id, addResult.transaction._id.toString());

            // Manually set deletedAt to 31 minutes ago to simulate expiry
            const tx = await txRepo.findOne({ _id: addResult.transaction._id, isDeleted: true });
            tx.deletedAt = new Date(Date.now() - 31 * 60 * 1000);

            await expect(
                service.undoTransaction(testUser._id, addResult.transaction._id.toString())
            ).rejects.toThrow('Undo window has expired');
        });

        it('should reject undo with invalid transaction ID', async () => {
            await expect(
                service.undoTransaction(testUser._id, 'invalid-id')
            ).rejects.toThrow('Invalid transaction ID format');
        });
    });
});
