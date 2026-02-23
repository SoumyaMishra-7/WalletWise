const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transactions');
const mockdate = require('mockdate');
const {
    addTransaction,
    getAllTransactions,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');

let mongoServer;

jest.setTimeout(60000);

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await User.createCollection();
    await Transaction.createCollection();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    mockdate.reset();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Transaction.deleteMany({});
    mockdate.reset();
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockImplementation((val) => val);
    res.headersSent = false;
    return res;
};

const mockRequest = (body, query = {}, params = {}, userId) => {
    return { body, query, params, userId };
};

describe('Transaction Controller', () => {
    let user;

    beforeEach(async () => {
        user = new User({
            studentId: 'TEST001',
            email: 'test@example.com',
            walletBalance: 1000
        });
        await user.save();
    });

    describe('addTransaction', () => {
        it('should add income transaction and update balance', async () => {
            const req = mockRequest({
                type: 'income',
                amount: 500,
                category: 'freelance',
                description: 'test income'
            }, {}, {}, user._id);
            const res = mockResponse();

            await addTransaction(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const data = res.json.mock.results[0].value;
            expect(data.success).toBe(true);

            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(1500);
        });

        it('should add expense transaction and update balance', async () => {
            const req = mockRequest({
                type: 'expense',
                amount: 200,
                category: 'food',
                description: 'lunch'
            }, {}, {}, user._id);
            const res = mockResponse();

            await addTransaction(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(800); // 1000 - 200
        });

        it('should reject non-positive amounts', async () => {
            const req = mockRequest({
                type: 'expense',
                amount: -50,
                category: 'food'
            }, {}, {}, user._id);
            const res = mockResponse();

            await addTransaction(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should prevent exact duplicate transactions within 24 hours', async () => {
            const req = mockRequest({
                type: 'expense',
                amount: 100,
                category: 'transport'
            }, {}, {}, user._id);

            await addTransaction(req, mockResponse());

            const res2 = mockResponse();
            await addTransaction(req, res2);

            expect(res2.status).toHaveBeenCalledWith(409);
            const data = res2.json.mock.results[0].value;
            expect(data.duplicate).toBe(true);
        });

        it('should compute nextExecutionDate for recurring transaction', async () => {
            mockdate.set('2024-01-01T10:00:00.000Z');
            const req = mockRequest({
                type: 'expense',
                amount: 50,
                category: 'entertainment',
                isRecurring: true,
                recurringInterval: 'monthly'
            }, {}, {}, user._id);
            const res = mockResponse();

            await addTransaction(req, res);

            const tx = await Transaction.findOne({ category: 'entertainment' });
            expect(tx.isRecurring).toBe(true);
            expect(tx.recurringInterval).toBe('monthly');
            // Next execution should be exactly 1 month later
            expect(tx.nextExecutionDate.toISOString()).toBe(new Date('2024-02-01T10:00:00.000Z').toISOString());
        });
    });

    describe('updateTransaction', () => {
        let transaction;

        beforeEach(async () => {
            transaction = new Transaction({
                userId: user._id,
                type: 'expense',
                amount: 100,
                category: 'shopping'
            });
            await transaction.save();
        });

        it('should correctly revert old balance effect and apply new one', async () => {
            // initial balance 1000. Actually user wasn't updated in beforeEach save directly,
            // let's assume it was 1000. Wait, manual save doesn't trigger user update. So user is 1000.
            // If we update to 'income' 200, it should revert expense (-100 -> +100 revert -> user=1100), then add income 200 -> user=1300.

            const req = mockRequest({
                type: 'income',
                amount: 200
            }, {}, { id: transaction._id.toString() }, user._id);
            const res = mockResponse();

            await updateTransaction(req, res);

            expect(res.json.mock.results[0].value.success).toBe(true);
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(1300); // 1000 + 100 + 200
        });
    });

    describe('deleteTransaction', () => {
        let transaction;

        beforeEach(async () => {
            transaction = new Transaction({
                userId: user._id,
                type: 'expense',
                amount: 150,
                category: 'housing'
            });
            await transaction.save();
        });

        it('should properly revert balance on delete', async () => {
            // initial user balance 1000. Deleting 150 expense should add 150 back.
            const req = mockRequest({}, {}, { id: transaction._id.toString() }, user._id);
            const res = mockResponse();

            await deleteTransaction(req, res);

            expect(res.json.mock.results[0].value.success).toBe(true);
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(1150);
        });
    });

    describe('getAllTransactions and recurring triggers', () => {

        it('should correctly filter and sort transactions', async () => {
            await Transaction.insertMany([
                { userId: user._id, type: 'income', amount: 50, category: 'other', date: new Date('2024-01-02') },
                { userId: user._id, type: 'expense', amount: 10, category: 'other', date: new Date('2024-01-01') },
                { userId: user._id, type: 'expense', amount: 100, category: 'other', date: new Date('2024-01-03') }
            ]);

            const req = mockRequest({}, { type: 'expense', sort: 'amount-high' }, {}, user._id);
            const res = mockResponse();
            await getAllTransactions(req, res);

            const txList = res.json.mock.results[0].value.transactions;
            expect(txList.length).toBe(2);
            expect(txList[0].amount).toBe(100);
        });
    });
});
