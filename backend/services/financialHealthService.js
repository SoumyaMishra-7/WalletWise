/**
 * Financial Health Scoring Service
 *
 * Scores a user's financial health 0–100 based on five indicators:
 *   1. Budget adherence (how much of the monthly budget is left)
 *   2. Savings progress (% progress toward active savings goals)
 *   3. Income vs. expenses ratio (surplus or deficit this month)
 *   4. Spending consistency (std deviation vs mean for last 3 months)
 *   5. Savings goal momentum (month-over-month growth in currentAmount)
 *
 * Each indicator contributes a weighted sub-score, and the result is
 * clamped to [0, 100].
 */

const Transaction = require('../models/Transactions');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingGoal');

const WEIGHTS = {
  budgetAdherence: 30,
  incomeExpenseRatio: 25,
  savingsProgress: 20,
  spendingConsistency: 15,
  savingsMomentum: 10,
};

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function categorize(score) {
  if (score >= 80) return { label: 'Excellent', emoji: '🟢' };
  if (score >= 60) return { label: 'Good', emoji: '🟡' };
  if (score >= 40) return { label: 'Fair', emoji: '🟠' };
  return { label: 'Poor', emoji: '🔴' };
}

async function computeFinancialHealthScore(userId) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // --- 1. Budget adherence ---
  const budget = await Budget.findOne({ userId, month: currentMonth, isActive: true });
  let budgetScore = 0;
  let budgetDetail = null;

  if (budget) {
    const expenses = await Transaction.find({
      userId, type: 'expense',
      date: { $gte: startOfMonth, $lte: now }
    }).select('amount');
    const totalSpent = expenses.reduce((s, tx) => s + (tx.amount || 0), 0);
    const utilization = budget.totalBudget > 0 ? totalSpent / budget.totalBudget : 0;
    // Score full marks if spent ≤ 80%, decreasing linearly to 0 at 150%+
    budgetScore = Math.max(0, Math.min(1, (1.5 - utilization) / 0.7));
    budgetDetail = { totalBudget: budget.totalBudget, spent: Math.round(totalSpent), utilization: Math.round(utilization * 100) };
  }

  // --- 2. Income vs. expenses ratio ---
  const [incTxs, expTxs] = await Promise.all([
    Transaction.find({ userId, type: 'income', date: { $gte: startOfMonth, $lte: now } }).select('amount'),
    Transaction.find({ userId, type: 'expense', date: { $gte: startOfMonth, $lte: now } }).select('amount')
  ]);
  const monthlyIncome  = incTxs.reduce((s, tx) => s + (tx.amount || 0), 0);
  const monthlyExpense = expTxs.reduce((s, tx) => s + (tx.amount || 0), 0);
  let ratioScore = 0;
  if (monthlyIncome > 0) {
    const ratio = monthlyExpense / monthlyIncome;
    // < 80% expenses/income → 1.0, > 120% → 0
    ratioScore = Math.max(0, Math.min(1, (1.2 - ratio) / 0.4));
  } else if (monthlyExpense === 0) {
    ratioScore = 0.5; // no data
  }

  // --- 3. Savings progress ---
  const goals = await SavingsGoal.find({ userId, isActive: true });
  let savingsScore = 0;
  if (goals.length > 0) {
    const avgProgress = goals.reduce((s, g) => s + Math.min(1, (g.currentAmount || 0) / Math.max(g.targetAmount, 1)), 0) / goals.length;
    savingsScore = avgProgress;
  }

  // --- 4. Spending consistency (last 3 months, lower std dev = better) ---
  let consistencyScore = 0.5; // default when insufficient data
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const historicExpenses = await Transaction.aggregate([
    { $match: { userId, type: 'expense', date: { $gte: threeMonthsAgo, $lt: startOfMonth } } },
    { $group: { _id: { y: { $year: '$date' }, m: { $month: '$date' } }, total: { $sum: '$amount' } } }
  ]);
  if (historicExpenses.length >= 2) {
    const totals = historicExpenses.map(h => h.total);
    const mean = totals.reduce((s, v) => s + v, 0) / totals.length;
    const cv = mean > 0 ? stdDev(totals) / mean : 0; // coefficient of variation
    // cv < 0.1 → perfect consistency; cv > 0.5 → very inconsistent
    consistencyScore = Math.max(0, Math.min(1, 1 - cv / 0.5));
  }

  // --- 5. Savings goal momentum (month-over-month growth) ---
  let momentumScore = 0.5;
  if (goals.length > 0) {
    const growing = goals.filter(g => (g.currentAmount || 0) > 0 && (g.currentAmount || 0) < (g.targetAmount || 0));
    momentumScore = goals.length > 0 ? growing.length / goals.length : 0.5;
  }

  // --- Weighted total ---
  const rawScore =
    budgetScore      * WEIGHTS.budgetAdherence +
    ratioScore       * WEIGHTS.incomeExpenseRatio +
    savingsScore     * WEIGHTS.savingsProgress +
    consistencyScore * WEIGHTS.spendingConsistency +
    momentumScore    * WEIGHTS.savingsMomentum;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const { label, emoji } = categorize(score);

  // --- Actionable suggestions ---
  const suggestions = [];
  if (budget && budgetDetail && budgetDetail.utilization > 80) {
    suggestions.push(`Your spending is at ${budgetDetail.utilization}% of your monthly budget. Try cutting discretionary expenses to stay under 80%.`);
  }
  if (ratioScore < 0.5 && monthlyIncome > 0) {
    suggestions.push('Your expenses are exceeding your income this month. Review large spending categories.');
  }
  if (savingsScore < 0.3 && goals.length > 0) {
    suggestions.push('Your savings goals are progressing slowly. Consider increasing your monthly contribution.');
  }
  if (consistencyScore < 0.5) {
    suggestions.push('Your spending varies a lot month-to-month. A more consistent pattern helps with planning.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Great job! Keep maintaining your current spending and saving habits.');
  }

  return {
    score,
    label,
    emoji,
    indicators: {
      budgetAdherence: Math.round(budgetScore * WEIGHTS.budgetAdherence),
      incomeExpenseRatio: Math.round(ratioScore * WEIGHTS.incomeExpenseRatio),
      savingsProgress: Math.round(savingsScore * WEIGHTS.savingsProgress),
      spendingConsistency: Math.round(consistencyScore * WEIGHTS.spendingConsistency),
      savingsMomentum: Math.round(momentumScore * WEIGHTS.savingsMomentum),
    },
    details: {
      budget: budgetDetail,
      monthlyIncome: Math.round(monthlyIncome),
      monthlyExpense: Math.round(monthlyExpense),
      activeGoals: goals.length,
    },
    suggestions,
  };
}

module.exports = { computeFinancialHealthScore };
