/**
 * Calculate a financial health score from 0-100.
 *
 * The score is based on:
 * - Budget adherence
 * - Savings progress
 * - Income vs expenses
 * - Spending consistency
 *
 * Each factor contributes 25 points.
 */

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getScoreCategory = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
};

const calculateFinancialHealthScore = ({
    monthlyIncome = 0,
    monthlyExpenses = 0,
    monthlyBudget = 0,
    savingsProgress = 0,
    spendingConsistency = 100
}) => {
    // 1. Budget adherence — 25 points
    let budgetScore = 25;

    if (monthlyBudget > 0) {
        const budgetUsage = (monthlyExpenses / monthlyBudget) * 100;

        if (budgetUsage <= 70) {
            budgetScore = 25;
        } else if (budgetUsage <= 85) {
            budgetScore = 20;
        } else if (budgetUsage <= 100) {
            budgetScore = 15;
        } else if (budgetUsage <= 120) {
            budgetScore = 8;
        } else {
            budgetScore = 0;
        }
    }

    // 2. Income vs expenses — 25 points
    let incomeExpenseScore = 0;

    if (monthlyIncome > 0) {
        const expenseRatio = monthlyExpenses / monthlyIncome;

        if (expenseRatio <= 0.50) {
            incomeExpenseScore = 25;
        } else if (expenseRatio <= 0.70) {
            incomeExpenseScore = 20;
        } else if (expenseRatio <= 0.85) {
            incomeExpenseScore = 15;
        } else if (expenseRatio <= 1) {
            incomeExpenseScore = 8;
        }
    }

    // 3. Savings progress — 25 points
    const normalizedSavingsProgress = clamp(savingsProgress, 0, 100);
    const savingsScore = Math.round(
        (normalizedSavingsProgress / 100) * 25
    );

    // 4. Spending consistency — 25 points
    const normalizedConsistency = clamp(spendingConsistency, 0, 100);
    const consistencyScore = Math.round(
        (normalizedConsistency / 100) * 25
    );

    const score = clamp(
        Math.round(
            budgetScore +
            incomeExpenseScore +
            savingsScore +
            consistencyScore
        ),
        0,
        100
    );

    return {
        score,
        category: getScoreCategory(score),
        factors: {
            budgetAdherence: budgetScore,
            incomeVsExpenses: incomeExpenseScore,
            savingsProgress: savingsScore,
            spendingConsistency: consistencyScore
        }
    };
};

module.exports = {
    calculateFinancialHealthScore,
    getScoreCategory
};