const mongoose = require('mongoose');
const MockDate = require('mockdate');

jest.mock('../utils/gamification', () => ({
  awardBadge: jest.fn().mockResolvedValue(null)
}));

const Budget = require('../models/Budget');
const Transaction = require('../models/Transactions');
const budgetController = require('../controllers/budgetController');

const userId = new mongoose.Types.ObjectId();

const baseCategories = () => ([
  { name: 'Food', amount: 3000, percentage: 60 },
  { name: 'Transport', amount: 2000, percentage: 40 }
]);

const createBudget = (month, overrides = {}) =>
  Budget.create({
    userId,
    totalBudget: 5000,
    categories: baseCategories(),
    month,
    isActive: true,
    ...overrides
  });

const addExpense = (category, amount, date) =>
  Transaction.create({ userId, type: 'expense', category, amount, date: new Date(date) });

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

afterEach(() => {
  MockDate.reset();
});

describe('Budget.applyRollover', () => {
  const NOW = new Date('2026-10-15T10:00:00Z');

  test('carries unused money into the next month (positive mode)', async () => {
    await createBudget('2026-09');
    await addExpense('food', 2550, '2026-09-10T10:00:00Z');
    await addExpense('transport', 2300, '2026-09-12T10:00:00Z'); // overspent by 300

    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const result = await Budget.applyRollover(october, { now: NOW });

    expect(result.rolloverAmount).toBe(450);
    expect(result.rolloverAppliedFrom).toBe('2026-09');
    expect(result.categories.find((c) => c.name === 'Food').rolloverAmount).toBe(450);
    expect(result.categories.find((c) => c.name === 'Transport').rolloverAmount).toBe(0);
  });

  test('"both" mode deducts overspending', async () => {
    await createBudget('2026-09');
    await addExpense('food', 2550, '2026-09-10T10:00:00Z');
    await addExpense('transport', 2300, '2026-09-12T10:00:00Z');

    const october = await createBudget('2026-10', { rolloverEnabled: true, rolloverMode: 'both' });
    const result = await Budget.applyRollover(october, { now: NOW });

    expect(result.rolloverAmount).toBe(150); // +450 - 300
    expect(result.categories.find((c) => c.name === 'Transport').rolloverAmount).toBe(-300);
  });

  test('is idempotent: repeated calls never apply it twice', async () => {
    await createBudget('2026-09');
    await addExpense('food', 1000, '2026-09-10T10:00:00Z');

    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const first = await Budget.applyRollover(october, { now: NOW });
    const second = await Budget.applyRollover(first, { now: NOW });
    const reloaded = await Budget.applyRollover(await Budget.findById(october._id), { now: NOW });

    expect(first.rolloverAmount).toBe(4000);
    expect(second.rolloverAmount).toBe(4000);
    expect(reloaded.rolloverAmount).toBe(4000);
  });

  test('concurrent calls apply it exactly once', async () => {
    await createBudget('2026-09');
    await addExpense('food', 1000, '2026-09-10T10:00:00Z');

    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const results = await Promise.all(
      Array.from({ length: 6 }, async () => Budget.applyRollover(await Budget.findById(october._id), { now: NOW }))
    );

    results.forEach((r) => expect(r.rolloverAmount).toBe(4000));
    expect((await Budget.findById(october._id)).rolloverAmount).toBe(4000);
  });

  test('works across a year boundary (December -> January)', async () => {
    await createBudget('2026-12');
    await addExpense('food', 2000, '2026-12-20T10:00:00Z');
    await addExpense('transport', 500, '2026-12-31T23:59:59Z'); // still December

    const january = await createBudget('2027-01', { rolloverEnabled: true });
    const result = await Budget.applyRollover(january, { now: new Date('2027-01-10T10:00:00Z') });

    expect(result.rolloverAppliedFrom).toBe('2026-12');
    expect(result.rolloverAmount).toBe(1000 + 1500);
  });

  test('only counts expenses inside the previous month', async () => {
    await createBudget('2026-09');
    await addExpense('food', 100, '2026-09-30T23:59:59Z');   // counted
    await addExpense('food', 900, '2026-10-01T00:00:00Z');   // October - not counted
    await addExpense('food', 400, '2026-08-31T23:59:59Z');   // August - not counted
    await Transaction.create({ userId, type: 'income', category: 'salary', amount: 9999, date: new Date('2026-09-05T10:00:00Z') });

    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const result = await Budget.applyRollover(october, { now: NOW });

    expect(result.categories.find((c) => c.name === 'Food').rolloverAmount).toBe(2900);
  });

  test('skips months that have not started yet', async () => {
    await createBudget('2026-10');
    const november = await createBudget('2026-11', { rolloverEnabled: true });

    const result = await Budget.applyRollover(november, { now: NOW });

    expect(result.rolloverAmount).toBe(0);
    expect(result.rolloverAppliedFrom).toBeNull();
  });

  test('does nothing (and does not throw) when there is no previous budget', async () => {
    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const result = await Budget.applyRollover(october, { now: NOW });

    expect(result.rolloverAmount).toBe(0);
    expect(result.rolloverAppliedFrom).toBeNull();
  });

  test('ignores soft-deleted previous budgets', async () => {
    await createBudget('2026-09', { isActive: false });
    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const result = await Budget.applyRollover(october, { now: NOW });
    expect(result.rolloverAmount).toBe(0);
  });

  test('leaves budgets without rollover untouched', async () => {
    await createBudget('2026-09');
    const october = await createBudget('2026-10'); // rolloverEnabled defaults to false

    const result = await Budget.applyRollover(october, { now: NOW });

    expect(result.rolloverEnabled).toBe(false);
    expect(result.rolloverAmount).toBe(0);
    expect(result.rolloverAppliedFrom).toBeNull();
  });

  test('legacy documents without any rollover fields keep working', async () => {
    await Budget.collection.insertOne({
      userId,
      totalBudget: 4000,
      categories: [{ name: 'Food', amount: 4000, percentage: 100, color: '#fff' }],
      month: '2026-10',
      isActive: true
    });
    const legacy = await Budget.findOne({ userId, month: '2026-10' });

    expect(legacy.rolloverEnabled).toBe(false);
    expect((await Budget.applyRollover(legacy, { now: NOW })).rolloverAmount).toBe(0);
  });

  test('rollover compounds month after month', async () => {
    await createBudget('2026-08');
    await addExpense('food', 2000, '2026-08-10T10:00:00Z'); // 1000 left over in Food

    const september = await createBudget('2026-09', { rolloverEnabled: true });
    await Budget.applyRollover(september, { now: new Date('2026-09-05T10:00:00Z') });
    await addExpense('food', 3500, '2026-09-10T10:00:00Z'); // available 3000 + 1000, spent 3500 -> 500 left

    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const result = await Budget.applyRollover(october, { now: NOW });

    expect(result.categories.find((c) => c.name === 'Food').rolloverAmount).toBe(500);
  });

  test('resetRollover + applyRollover recalculates instead of adding', async () => {
    await createBudget('2026-09');
    await addExpense('food', 1000, '2026-09-10T10:00:00Z');

    const october = await createBudget('2026-10', { rolloverEnabled: true });
    const applied = await Budget.applyRollover(october, { now: NOW });
    expect(applied.rolloverAmount).toBe(4000);

    applied.resetRollover();
    await applied.save();
    const again = await Budget.applyRollover(applied, { now: NOW });
    expect(again.rolloverAmount).toBe(4000);
  });
});

describe('budgetController with rollover', () => {
  beforeEach(() => {
    MockDate.set('2026-10-15T10:00:00Z');
  });

  test('setBudget rejects invalid rollover settings', async () => {
    const res = mockRes();
    await budgetController.setBudget({
      userId,
      body: { totalBudget: 5000, categories: baseCategories(), rolloverEnabled: 'yes' }
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    const res2 = mockRes();
    await budgetController.setBudget({
      userId,
      body: { totalBudget: 5000, categories: baseCategories(), rolloverMode: 'everything' }
    }, res2);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  test('setBudget ignores client supplied rollover amounts', async () => {
    const res = mockRes();
    await budgetController.setBudget({
      userId,
      body: {
        totalBudget: 5000,
        month: '2026-10',
        rolloverEnabled: true,
        rolloverAmount: 99999,
        categories: baseCategories().map((c) => ({ ...c, rolloverAmount: 99999 }))
      }
    }, res);

    const saved = await Budget.findOne({ userId, month: '2026-10' });
    expect(saved.rolloverAmount).toBe(0);
    saved.categories.forEach((c) => expect(c.rolloverAmount).toBe(0));
  });

  test('setBudget without rollover fields behaves as before', async () => {
    const res = mockRes();
    await budgetController.setBudget({
      userId,
      body: { totalBudget: 5000, month: '2026-10', categories: baseCategories() }
    }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.budget.rolloverEnabled).toBe(false);
    expect(payload.budget.availableBudget).toBe(5000);
  });

  test('summary uses base + rollover for totals, categories and utilization', async () => {
    await createBudget('2026-09');
    await addExpense('food', 2550, '2026-09-10T10:00:00Z'); // 450 unused in Food
    await addExpense('transport', 1000, '2026-09-11T10:00:00Z'); // 1000 unused in Transport
    await createBudget('2026-10', { rolloverEnabled: true });
    await addExpense('food', 2900, '2026-10-05T10:00:00Z');

    const res = mockRes();
    await budgetController.getBudgetSummary({ userId }, res);
    const { summary } = res.json.mock.calls[0][0];

    expect(summary.baseBudget).toBe(5000);
    expect(summary.rolloverAmount).toBe(1450);
    expect(summary.availableBudget).toBe(6450);
    expect(summary.totalBudget).toBe(6450);
    expect(summary.spent).toBe(2900);
    expect(summary.remaining).toBe(3550);
    expect(summary.utilization).toBeCloseTo((2900 / 6450) * 100);

    const food = summary.categories.find((c) => c.name === 'Food');
    expect(food.allocated).toBe(3450);
    expect(food.baseAllocated).toBe(3000);
    expect(food.rollover).toBe(450);
    expect(food.remaining).toBe(550);
  });

  test('summary for a budget without rollover is unchanged', async () => {
    await createBudget('2026-10');
    await addExpense('food', 1000, '2026-10-05T10:00:00Z');

    const res = mockRes();
    await budgetController.getBudgetSummary({ userId }, res);
    const { summary } = res.json.mock.calls[0][0];

    expect(summary.totalBudget).toBe(5000);
    expect(summary.rolloverAmount).toBe(0);
    expect(summary.remaining).toBe(4000);
    expect(summary.utilization).toBe(20);
  });

  test('negative rollover that wipes out the budget reads as fully used', async () => {
    await Budget.create({
      userId,
      totalBudget: 1000,
      categories: [{ name: 'Food', amount: 1000, percentage: 100 }],
      month: '2026-09'
    });
    await addExpense('food', 1800, '2026-09-10T10:00:00Z'); // overspent by 800

    await Budget.create({
      userId,
      totalBudget: 500,
      categories: [{ name: 'Food', amount: 500, percentage: 100 }],
      month: '2026-10',
      rolloverEnabled: true,
      rolloverMode: 'both'
    });
    await addExpense('food', 50, '2026-10-05T10:00:00Z');

    const res = mockRes();
    await budgetController.getBudgetSummary({ userId }, res);
    const { summary } = res.json.mock.calls[0][0];

    expect(summary.availableBudget).toBe(-300);
    expect(summary.remaining).toBe(0);
    expect(summary.utilization).toBe(100);
  });

  test('updateBudget recalculates rollover when the setting is turned on', async () => {
    await createBudget('2026-09');
    await addExpense('food', 1000, '2026-09-10T10:00:00Z');
    const october = await createBudget('2026-10');

    const res = mockRes();
    await budgetController.updateBudget({
      userId,
      params: { id: october._id.toString() },
      body: { rolloverEnabled: true }
    }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.budget.rolloverAmount).toBe(4000);
    expect(payload.budget.availableBudget).toBe(9000);
  });

  test('turning rollover off removes it from the available amount', async () => {
    await createBudget('2026-09');
    const october = await createBudget('2026-10', { rolloverEnabled: true });
    await Budget.applyRollover(october);

    const res = mockRes();
    await budgetController.updateBudget({
      userId,
      params: { id: october._id.toString() },
      body: { rolloverEnabled: false }
    }, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.budget.rolloverAmount).toBe(0);
    expect(payload.budget.availableBudget).toBe(5000);
  });
});
