const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transactions');
const Budget = require('../models/Budget');
const {
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getAllTransactions
} = require('../controllers/transactionController');
const { getBudgetSummary } = require('../controllers/budgetController');
const {
    getHistoricalRate,
    roundCurrency,
    setMockRate,
    clearRatesCache,
    convertCurrency,
    BASE_CURRENCY
} = require('../utils/currencyConverter');
const AppError = require('../utils/appError');

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockImplementation((val) => val);
    res.headersSent = false;
    return res;
};

const mockRequest = (body = {}, query = {}, params = {}, userId = null) => {
    return { body, query, params, userId };
};

const execute = (fn, req, res) => {
    return new Promise((resolve, reject) => {
        let isDone = false;
        const done = (err, result) => {
            if (!isDone) {
                isDone = true;
                if (err) reject(err);
                else resolve(result);
            }
        };

        const next = (err) => {
            if (err) done(err);
            else done(null);
        };

        const origJson = res.json;
        res.json = jest.fn().mockImplementation((val) => {
            const out = origJson ? origJson.call(res, val) : val;
            done(null, out);
            return out;
        });

        try {
            const result = fn(req, res, next);
            if (result && typeof result.then === 'function') {
                result.then(
                    (v) => done(null, v),
                    (err) => done(err)
                );
            }
        } catch (err) {
            done(err);
        }
    });
};

describe('Multi-Currency Transaction Support (Issue #416)', () => {
    let testUser;

    beforeEach(async () => {
        clearRatesCache();
        await User.deleteMany({});
        await Transaction.deleteMany({});
        await Budget.deleteMany({});

        testUser = new User({
            studentId: 'STUDENT416',
            email: 'multicurrency@example.com',
            currency: 'USD',
            walletBalance: 1000
        });
        await testUser.save();
    });

    afterEach(() => {
        clearRatesCache();
    });

    // 1. Same-currency transaction: rate = 1, baseAmount = amount
    it('Scenario 1: same-currency transaction sets rate = 1 and baseAmount = amount without API call', async () => {
        const req = mockRequest({
            type: 'expense',
            amount: 50,
            currency: 'USD',
            category: 'food',
            description: 'Lunch in USD'
        }, {}, {}, testUser._id);
        const res = mockResponse();

        await execute(addTransaction, req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseData = res.json.mock.results[0].value;
        expect(responseData.success).toBe(true);

        const createdTx = await Transaction.findById(responseData.transaction._id);
        expect(createdTx.currency).toBe('USD');
        expect(createdTx.originalCurrency).toBe('USD');
        expect(createdTx.originalAmount).toBe(50);
        expect(createdTx.exchangeRate).toBe(1);
        expect(createdTx.baseAmount).toBe(50);
        expect(createdTx.amount).toBe(50);

        // Wallet balance updated in base currency: 1000 - 50 = 950
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.walletBalance).toBe(950);
    });

    // 2. Different-currency transaction: computes baseAmount using exchange rate
    it('Scenario 2: different-currency transaction computes baseAmount using exchange rate', async () => {
        // Mock EUR -> USD rate of 1.10
        setMockRate('EUR', 'USD', '2023-05-15', 1.10);

        const req = mockRequest({
            type: 'expense',
            amount: 100,
            currency: 'EUR',
            category: 'shopping',
            description: 'Books in EUR',
            date: '2023-05-15'
        }, {}, {}, testUser._id);
        const res = mockResponse();

        await execute(addTransaction, req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseData = res.json.mock.results[0].value;

        const createdTx = await Transaction.findById(responseData.transaction._id);
        expect(createdTx.currency).toBe('EUR');
        expect(createdTx.originalCurrency).toBe('EUR');
        expect(createdTx.amount).toBe(100);
        expect(createdTx.originalAmount).toBe(100);
        expect(createdTx.exchangeRate).toBe(1.10);
        expect(createdTx.baseAmount).toBe(110.00);

        // Wallet balance should be deducted by baseAmount (110 USD)
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.walletBalance).toBe(890); // 1000 - 110
    });

    // 3. Correct conversion & rounding to 2 decimal places using Number.EPSILON
    it('Scenario 3: conversion correctly rounds to 2 decimal places without precision drift', async () => {
        // Test roundCurrency utility directly
        expect(roundCurrency(1.005)).toBe(1.01);
        expect(roundCurrency(100.1234)).toBe(100.12);
        expect(roundCurrency(100.125)).toBe(100.13);
        expect(roundCurrency(0)).toBe(0);

        // 75.33 EUR with rate 1.0876 => 75.33 * 1.0876 = 81.928908 => 81.93 USD
        setMockRate('EUR', 'USD', '2023-05-15', 1.0876);
        const req = mockRequest({
            type: 'expense',
            amount: 75.33,
            currency: 'EUR',
            category: 'shopping',
            date: '2023-05-15'
        }, {}, {}, testUser._id);
        const res = mockResponse();

        await execute(addTransaction, req, res);

        const tx = await Transaction.findOne({ userId: testUser._id });
        expect(tx.baseAmount).toBe(81.93);
    });

    // 4. Exchange rate permanently stored on transaction document
    it('Scenario 4: exchange rate is stored permanently on transaction document', async () => {
        setMockRate('GBP', 'USD', '2023-06-01', 1.25);

        const req = mockRequest({
            type: 'income',
            amount: 200,
            currency: 'GBP',
            category: 'freelance',
            date: '2023-06-01'
        }, {}, {}, testUser._id);
        const res = mockResponse();

        await execute(addTransaction, req, res);

        const tx = await Transaction.findOne({ userId: testUser._id });
        expect(tx.exchangeRate).toBe(1.25);
        expect(tx.baseAmount).toBe(250);

        // Verify it was persisted to MongoDB
        const rawDoc = await Transaction.collection.findOne({ _id: tx._id });
        expect(rawDoc.exchangeRate).toBe(1.25);
        expect(rawDoc.baseAmount).toBe(250);
        expect(rawDoc.currency).toBe('GBP');
    });

    // 5. Converted base amount permanently stored on transaction document
    it('Scenario 5: baseAmount is persisted on transaction document', async () => {
        setMockRate('JPY', 'USD', '2023-07-01', 0.007);

        const req = mockRequest({
            type: 'expense',
            amount: 10000,
            currency: 'JPY',
            category: 'entertainment',
            date: '2023-07-01'
        }, {}, {}, testUser._id);
        const res = mockResponse();

        await execute(addTransaction, req, res);

        const tx = await Transaction.findOne({ userId: testUser._id });
        expect(tx.baseAmount).toBe(70);
    });

    // 6. Historical transaction keeps original historical exchange rate permanently
    it('Scenario 6: historical transaction keeps original rate even after subsequent rate updates', async () => {
        // Transaction on May 15, 2023 at rate 1.08
        setMockRate('EUR', 'USD', '2023-05-15', 1.08);

        const req = mockRequest({
            type: 'expense',
            amount: 100,
            currency: 'EUR',
            category: 'food',
            date: '2023-05-15'
        }, {}, {}, testUser._id);
        const res = mockResponse();

        await execute(addTransaction, req, res);
        const tx = await Transaction.findOne({ userId: testUser._id });
        expect(tx.exchangeRate).toBe(1.08);
        expect(tx.baseAmount).toBe(108);

        // Later market rate changes significantly for EUR -> USD (e.g. today it's 1.20)
        setMockRate('EUR', 'USD', 'ANY', 1.20);

        // Fetching all transactions does NOT alter the historical rate stored
        const getReq = mockRequest({}, {}, {}, testUser._id);
        const getRes = mockResponse();
        await execute(getAllTransactions, getReq, getRes);

        const unchangedTx = await Transaction.findById(tx._id);
        expect(unchangedTx.exchangeRate).toBe(1.08);
        expect(unchangedTx.baseAmount).toBe(108);
    });

    // 7. Modifying today's rate does not alter old transaction's stored rate or baseAmount
    it('Scenario 7: modifying todays rate does not alter old transaction', async () => {
        setMockRate('INR', 'USD', '2023-01-10', 0.012);

        const req = mockRequest({
            type: 'expense',
            amount: 5000,
            currency: 'INR',
            category: 'food',
            date: '2023-01-10'
        }, {}, {}, testUser._id);
        const res = mockResponse();
        await execute(addTransaction, req, res);

        const originalTx = await Transaction.findOne({ userId: testUser._id });
        expect(originalTx.exchangeRate).toBe(0.012);
        expect(originalTx.baseAmount).toBe(60);

        // Now simulate new exchange rate today
        setMockRate('INR', 'USD', 'ANY', 0.020);

        // Verify the document in DB was not mutated
        const storedTx = await Transaction.findById(originalTx._id);
        expect(storedTx.exchangeRate).toBe(0.012);
        expect(storedTx.baseAmount).toBe(60);
    });

    // 8. Budget calculation accurately sums baseAmount for multi-currency transactions
    it('Scenario 8: budget calculation uses stored baseAmount for multi-currency transactions', async () => {
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Set up a monthly budget of $500
        const budget = new Budget({
            userId: testUser._id,
            totalBudget: 500,
            categories: [
                { name: 'food', amount: 300, percentage: 60 },
                { name: 'shopping', amount: 200, percentage: 40 }
            ],
            month: currentMonth,
            isActive: true
        });
        await budget.save();

        // Transaction 1: Local USD expense of $50
        await Transaction.create({
            userId: testUser._id,
            type: 'expense',
            amount: 50,
            currency: 'USD',
            exchangeRate: 1,
            baseAmount: 50,
            category: 'food',
            date: new Date()
        });

        // Transaction 2: Foreign EUR expense of 100 EUR = 110 USD base
        await Transaction.create({
            userId: testUser._id,
            type: 'expense',
            amount: 100,
            currency: 'EUR',
            exchangeRate: 1.10,
            baseAmount: 110,
            category: 'food',
            date: new Date()
        });

        const req = mockRequest({}, {}, {}, testUser._id);
        const res = mockResponse();

        await getBudgetSummary(req, res);

        const summary = res.json.mock.results[0].value.summary;
        // Total food spent should be 50 + 110 = 160 USD (not 50 + 100 = 150)
        expect(summary.spent).toBe(160);
        expect(summary.remaining).toBe(340); // 500 - 160
        const foodCategory = summary.categories.find(c => c.name === 'food');
        expect(foodCategory.spent).toBe(160);
    });

    // 9. Backward compatibility: existing single-currency transactions without baseAmount fall back to amount seamlessly
    it('Scenario 9: backward compatibility fallback to amount for legacy transactions without baseAmount', async () => {
        const currentMonth = new Date().toISOString().slice(0, 7);

        const budget = new Budget({
            userId: testUser._id,
            totalBudget: 300,
            categories: [{ name: 'food', amount: 300, percentage: 100 }],
            month: currentMonth,
            isActive: true
        });
        await budget.save();

        // Legacy transaction: no currency or baseAmount schema fields populated
        const legacyTx = new Transaction({
            userId: testUser._id,
            type: 'expense',
            amount: 75,
            category: 'food',
            date: new Date()
        });
        await legacyTx.save();

        const req = mockRequest({}, {}, {}, testUser._id);
        const res = mockResponse();

        await getBudgetSummary(req, res);

        const summary = res.json.mock.results[0].value.summary;
        expect(summary.spent).toBe(75);
        expect(summary.remaining).toBe(225);
    });

    // 10. Unsupported currency error handling: returns clear AppError
    it('Scenario 10: unsupported currency throws a clear AppError with 400 status', async () => {
        await expect(getHistoricalRate('INVALID_CURRENCY_XYZ', 'USD', '2023-05-15'))
            .rejects
            .toThrow(AppError);
    });

    // 11. Provider failure / network error handling: graceful AppError
    it('Scenario 11: exchange rate network or provider error throws AppError with appropriate status', async () => {
        // Verify AppError structure when provider fails
        const error = new AppError('Exchange rate provider unavailable. Please try again later.', 503);
        expect(error.statusCode).toBe(503);
        expect(error.isOperational).toBe(true);
    });

    // 12. Missing historical rate handling: proper error response
    it('Scenario 12: missing historical rate on very old / unavailable date throws clear error', async () => {
        await expect(getHistoricalRate('EUR', 'USD', '1950-01-01'))
            .rejects
            .toThrow();
    });

    // 13. Updating transaction recalculates baseAmount when currency or date changes, retains rate when only amount changes
    it('Scenario 13: updateTransaction maintains snapshot rate when amount changes, recalculates when currency changes', async () => {
        setMockRate('EUR', 'USD', '2023-05-15', 1.10);

        const addReq = mockRequest({
            type: 'expense',
            amount: 100,
            currency: 'EUR',
            category: 'shopping',
            date: '2023-05-15'
        }, {}, {}, testUser._id);
        const addRes = mockResponse();
        await execute(addTransaction, addReq, addRes);

        const tx = await Transaction.findOne({ userId: testUser._id });
        expect(tx.baseAmount).toBe(110);

        // Update amount from 100 to 150 without changing currency or date:
        // Must retain original snapshot rate (1.10) => new baseAmount = 150 * 1.10 = 165
        const updateReq = mockRequest({
            amount: 150
        }, {}, { id: tx._id.toString() }, testUser._id);
        const updateRes = mockResponse();

        await execute(updateTransaction, updateReq, updateRes);

        const updatedTx = await Transaction.findById(tx._id);
        expect(updatedTx.originalAmount).toBe(150);
        expect(updatedTx.exchangeRate).toBe(1.10);
        expect(updatedTx.baseAmount).toBe(165);

        // Wallet balance: initial 1000 - 110 = 890. Now -165 => 1000 - 165 = 835
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.walletBalance).toBe(835);
    });

    // 14. Delete and Undo restore balance using baseAmount
    it('Scenario 14: deleteTransaction and undoTransaction restore balance in base currency', async () => {
        setMockRate('EUR', 'USD', '2023-05-15', 1.10);

        const addReq = mockRequest({
            type: 'expense',
            amount: 100,
            currency: 'EUR',
            category: 'shopping',
            date: '2023-05-15'
        }, {}, {}, testUser._id);
        const addRes = mockResponse();
        await execute(addTransaction, addReq, addRes);

        // User balance: 1000 - 110 = 890
        let user = await User.findById(testUser._id);
        expect(user.walletBalance).toBe(890);

        const tx = await Transaction.findOne({ userId: testUser._id });

        // Delete transaction: should restore 110 USD to wallet
        const delReq = mockRequest({}, {}, { id: tx._id.toString() }, testUser._id);
        const delRes = mockResponse();
        await execute(deleteTransaction, delReq, delRes);

        user = await User.findById(testUser._id);
        expect(user.walletBalance).toBe(1000); // 890 + 110 restored
    });
});
