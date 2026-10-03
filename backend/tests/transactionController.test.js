const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transactions');
const Wallet = require('../models/Wallet');
const mockdate = require('mockdate');
const {
    addTransaction,
    getAllTransactions,
    updateTransaction,
    deleteTransaction,
    undoTransaction
} = require('../controllers/transactionController');

let mongoServer;

jest.setTimeout(60000);

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await User.createCollection();
    await Transaction.createCollection();
    await Wallet.createCollection();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    mockdate.reset();
});

beforeEach(async () => {
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await Wallet.deleteMany({});
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

        it('should reject transactions for wallets the user cannot access', async () => {
            const owner = new User({
                studentId: 'OWNER001',
                email: 'owner@example.com',
                walletBalance: 1000
            });
            await owner.save();

            const wallet = await Wallet.create({
                name: 'Private wallet',
                owner: owner._id,
                members: [{ user: owner._id, role: 'admin' }],
                balance: 500
            });

            const req = mockRequest({
                type: 'expense',
                amount: 200,
                category: 'food',
                walletId: wallet._id.toString()
            }, {}, {}, user._id);
            const res = mockResponse();

            await addTransaction(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(await Transaction.countDocuments({ userId: user._id })).toBe(0);
            expect((await Wallet.findById(wallet._id)).balance).toBe(500);
        });
    });

    describe('Optimistic Concurrency Control (OCC)', () => {
        it('should handle concurrent addTransaction requests without losing balance updates', async () => {
            const reqs = [1, 2, 3].map(i => mockRequest({
                type: 'expense',
                amount: 100,
                category: 'shopping',
                description: `concurrent ${i}`
            }, {}, {}, user._id));

            const responses = reqs.map(() => mockResponse());

            await Promise.all(reqs.map((req, i) => addTransaction(req, responses[i])));

            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(700); // 1000 - (100 * 3)
            
            const txCount = await Transaction.countDocuments({ userId: user._id, category: 'shopping' });
            expect(txCount).toBe(3);
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

    describe('undoTransaction', () => {
        it('rebuilds the original transaction from the server side snapshot', async () => {
            await User.findByIdAndUpdate(user._id, { $inc: { walletBalance: -250 } });

            const original = await new Transaction({
                userId: user._id,
                type: 'expense',
                amount: 250,
                category: 'food',
                description: 'Dinner with friends',
                paymentMethod: 'card',
                mood: 'happy',
                isRecurring: true,
                recurringInterval: 'monthly',
                nextExecutionDate: new Date('2024-02-01T00:00:00.000Z')
            }).save();

            await deleteTransaction(
                mockRequest({}, {}, { id: original._id.toString() }, user._id),
                mockResponse()
            );

            expect((await User.findById(user._id)).walletBalance).toBe(1000);

            const res = mockResponse();
            await undoTransaction(
                mockRequest({ deletedTransaction: { _id: original._id.toString() } }, {}, {}, user._id),
                res,
                (err) => { throw err; }
            );

            const restored = res.json.mock.results[0].value.transaction;
            expect(restored.category).toBe('food');
            expect(restored.description).toBe('Dinner with friends');
            expect(restored.paymentMethod).toBe('card');
            expect(restored.mood).toBe('happy');
            expect(restored.isRecurring).toBe(true);
            expect(restored.recurringInterval).toBe('monthly');
            expect((await User.findById(user._id)).walletBalance).toBe(750);
        });

        it('refuses a client supplied transaction that was never deleted', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = mockResponse();
            let error = null;

            await undoTransaction(
                mockRequest({ transactionId: fakeId.toString(), deletedTransaction: { type: 'income', amount: 100000 } }, {}, {}, user._id),
                res,
                (err) => { error = err; }
            );

            expect(error).not.toBeNull();
            expect(error.statusCode).toBe(404);
            expect(res.json).not.toHaveBeenCalled();
            expect((await User.findById(user._id)).walletBalance).toBe(1000);
        });

        it('restores a shared wallet transaction to that wallet, not the personal balance', async () => {
            const wallet = await Wallet.create({
                name: 'Trip fund',
                owner: user._id,
                members: [{ user: user._id, role: 'admin' }],
                balance: 4500
            });

            const original = await new Transaction({
                userId: user._id,
                type: 'expense',
                amount: 500,
                category: 'shopping',
                walletId: wallet._id
            }).save();

            await deleteTransaction(
                mockRequest({}, {}, { id: original._id.toString() }, user._id),
                mockResponse()
            );

            expect((await Wallet.findById(wallet._id)).balance).toBe(5000);
            expect((await User.findById(user._id)).walletBalance).toBe(1000);

            const res = mockResponse();
            await undoTransaction(
                mockRequest({ transactionId: original._id.toString() }, {}, {}, user._id),
                res,
                (err) => { throw err; }
            );

            expect((await Wallet.findById(wallet._id)).balance).toBe(4500);
            expect((await User.findById(user._id)).walletBalance).toBe(1000);
            expect(res.json.mock.results[0].value.transaction.walletId.toString()).toBe(wallet._id.toString());
        });
    });

    describe('getAllTransactions and recurring triggers', () => {

        it('should correctly spawn new transaction and update wallet balance for recurring transactions', async () => {
            mockdate.set('2024-01-01T10:00:00.000Z');

            // Create a recurring transaction that is due
            const recurringTx = new Transaction({
                userId: user._id,
                type: 'income',
                amount: 300,
                category: 'salary',
                isRecurring: true,
                recurringInterval: 'monthly',
                nextExecutionDate: new Date('2024-01-01T08:00:00.000Z') // Due now
            });
            await recurringTx.save();

            const req = mockRequest({}, {}, {}, user._id);
            const res = mockResponse();

            await getAllTransactions(req, res);

            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(1300); // 1000 + 300

            // Check if discrete transaction was spawned
            const txs = await Transaction.find({ userId: user._id, category: 'salary' });
            expect(txs.length).toBe(2);

            // Check next execution date
            const updatedRecurring = await Transaction.findById(recurringTx._id);
            expect(updatedRecurring.nextExecutionDate.toISOString()).toBe(new Date('2024-02-01T08:00:00.000Z').toISOString());
        });

        it('should not break the list or lose the schedule when a recurring item fails to process', async () => {
            mockdate.set('2024-01-01T10:00:00.000Z');
            const dueDate = new Date('2024-01-01T08:00:00.000Z');

            // Inserted via the raw collection to bypass schema validation, so that
            // spawning this occurrence fails on save (category not in the enum).
            const broken = await Transaction.collection.insertOne({
                userId: user._id,
                type: 'expense',
                amount: 50,
                category: 'not-a-real-category',
                isRecurring: true,
                recurringInterval: 'monthly',
                nextExecutionDate: dueDate,
                walletId: null,
                date: new Date()
            });

            const healthy = await new Transaction({
                userId: user._id,
                type: 'income',
                amount: 300,
                category: 'salary',
                isRecurring: true,
                recurringInterval: 'monthly',
                nextExecutionDate: dueDate
            }).save();

            const req = mockRequest({}, {}, {}, user._id);
            const res = mockResponse();
            await getAllTransactions(req, res, (err) => { throw err; });

            // The request succeeds and the healthy recurrence is still processed
            expect(res.json).toHaveBeenCalled();
            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(1300); // failed item fully reverted

            // The failed recurrence stays due (not pushed a year ahead) so it can retry
            const stillDue = await Transaction.findById(broken.insertedId);
            expect(stillDue.nextExecutionDate.toISOString()).toBe(dueDate.toISOString());

            const advanced = await Transaction.findById(healthy._id);
            expect(advanced.nextExecutionDate.toISOString()).toBe(new Date('2024-02-01T08:00:00.000Z').toISOString());
        });

        it('should execute a due recurring transaction only once under concurrent requests', async () => {
            mockdate.set('2024-01-01T10:00:00.000Z');

            await new Transaction({
                userId: user._id,
                type: 'income',
                amount: 100,
                category: 'salary',
                isRecurring: true,
                recurringInterval: 'monthly',
                nextExecutionDate: new Date('2024-01-01T08:00:00.000Z')
            }).save();

            await Promise.all([1, 2, 3].map(() =>
                getAllTransactions(mockRequest({}, {}, {}, user._id), mockResponse(), () => {})
            ));

            const updatedUser = await User.findById(user._id);
            expect(updatedUser.walletBalance).toBe(1100); // 1000 + a single 100
        });

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
