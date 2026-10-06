const Transaction = require('../models/Transactions');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingGoal');
const {
    calculateFinancialHealthScore
} = require('../utils/financialHealthScore');

const getFinancialHealth = async (req, res) => {
    try {
        const userId = req.userId;
        

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const now = new Date();

        // Current month boundaries
        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const startOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );

        const startOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
);


        // Fetch the user's financial data
const [
    transactions,
    budget,
    savingsGoals,
    previousMonthTransactions
] = await Promise.all([
    Transaction.find({
        userId,
        date: {
            $gte: startOfMonth,
            $lt: startOfNextMonth
        }
    }).select('type amount date category isRecurring'),

   Budget.findOne({
    userId,
    month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
    isActive: true
}),

    SavingsGoal.find({
        userId,
        isActive: true
    }).select(
        'targetAmount currentAmount progress monthlyContribution'
    ),

    Transaction.find({
        userId,
        date: {
            $gte: startOfPreviousMonth,
            $lt: startOfMonth
        }
    }).select('type amount date category isRecurring')

]);     


// Calculate previous month's income and expenses
const previousMonthIncome = previousMonthTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

const previousMonthExpenses = previousMonthTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        // Calculate income and expenses
        const monthlyIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const monthlyExpenses = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const monthlyBudget = budget?.totalBudget || 0;

        // Calculate overall savings progress
        const totalTarget = savingsGoals.reduce(
            (sum, goal) => sum + (goal.targetAmount || 0),
            0
        );

        const totalSaved = savingsGoals.reduce(
            (sum, goal) => sum + (goal.currentAmount || 0),
            0
        );

        const savingsProgress = totalTarget > 0
            ? Math.min((totalSaved / totalTarget) * 100, 100)
            : 0;

        // Calculate spending consistency.
        // More even daily spending = higher consistency.
        const expenseDays = new Set(
            transactions
                .filter(tx => tx.type === 'expense')
                .map(tx => new Date(tx.date).toISOString().slice(0, 10))
        );

        let spendingConsistency = 100;

        if (expenseDays.size > 0) {
            const dailyExpenses = {};

            transactions
                .filter(tx => tx.type === 'expense')
                .forEach(tx => {
                    const day = new Date(tx.date)
                        .toISOString()
                        .slice(0, 10);

                    dailyExpenses[day] =
                        (dailyExpenses[day] || 0) + (tx.amount || 0);
                });

            const dailyValues = Object.values(dailyExpenses);

            if (dailyValues.length > 1) {
                const average =
                    dailyValues.reduce((sum, value) => sum + value, 0) /
                    dailyValues.length;

                const variance =
                    dailyValues.reduce(
                        (sum, value) =>
                            sum + Math.pow(value - average, 2),
                        0
                    ) / dailyValues.length;

                const standardDeviation = Math.sqrt(variance);

                const variation =
                    average > 0
                        ? standardDeviation / average
                        : 0;

                spendingConsistency = Math.max(
                    0,
                    Math.min(100, 100 - variation * 50)
                );
            }
        }

        const hasFinancialData =
    transactions.length > 0 ||
    Boolean(budget) ||
    savingsGoals.length > 0;

let scoreResult = null;

if (hasFinancialData) {
    scoreResult = calculateFinancialHealthScore({
        monthlyIncome,
        monthlyExpenses,
        monthlyBudget,
        savingsProgress,
        spendingConsistency
    });
}

        
        // Identify major factors
const factors = [];

if (!hasFinancialData) {
    factors.push(
        {
            name: 'Budget Adherence',
            score: null,
            impact: 'neutral',
            detail: 'No monthly budget or financial history available'
        },
        {
            name: 'Income vs Expenses',
            score: null,
            impact: 'neutral',
            detail: 'No income or expense data available'
        },
        {
            name: 'Savings Progress',
            score: null,
            impact: 'neutral',
            detail: 'No savings goals available'
        },
        {
            name: 'Spending Consistency',
            score: null,
            impact: 'neutral',
            detail: 'Not enough transaction history'
        }
    );
} else {
    if (monthlyBudget > 0) {
        const budgetUsage =
            (monthlyExpenses / monthlyBudget) * 100;

        factors.push({
            name: 'Budget Adherence',
            score: scoreResult.factors.budgetAdherence,
            impact:
                budgetUsage <= 85
                    ? 'positive'
                    : 'negative',
            detail: `${Math.round(budgetUsage)}% of monthly budget used`
        });
    } else {
        factors.push({
            name: 'Budget Adherence',
            score: 0,
            impact: 'neutral',
            detail: 'No monthly budget set'
        });
    }

    factors.push({
        name: 'Income vs Expenses',
        score: scoreResult.factors.incomeVsExpenses,
        impact:
            monthlyIncome >= monthlyExpenses
                ? 'positive'
                : 'negative',
        detail:
            monthlyIncome > 0
                ? `₹${Math.round(monthlyIncome - monthlyExpenses).toLocaleString()} net monthly balance`
                : 'No income recorded this month'
    });

    factors.push({
        name: 'Savings Progress',
        score: scoreResult.factors.savingsProgress,
        impact: savingsProgress >= 50
            ? 'positive'
            : 'negative',
        detail: `${Math.round(savingsProgress)}% of savings targets completed`
    });

    factors.push({
        name: 'Spending Consistency',
        score: scoreResult.factors.spendingConsistency,
        impact: spendingConsistency >= 60
            ? 'positive'
            : 'negative',
        detail: `${Math.round(spendingConsistency)}% spending consistency`
    });
}

        // Generate actionable suggestions
        const suggestions = [];

        if (monthlyBudget === 0) {
            suggestions.push(
                'Set a monthly budget to better control your spending.'
            );
        } else if (monthlyExpenses > monthlyBudget) {
            suggestions.push(
                'Your expenses are above your monthly budget. Consider reducing non-essential spending.'
            );
        }

        if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
            suggestions.push(
                'Your expenses are higher than your income this month. Review your largest spending categories.'
            );
        }

        if (savingsProgress < 50) {
            suggestions.push(
                'Increase your savings contributions to make faster progress toward your goals.'
            );
        }

        if (spendingConsistency < 50) {
            suggestions.push(
                'Your spending varies significantly. Try setting daily or weekly spending limits.'
            );
        }

        if (suggestions.length === 0) {
            suggestions.push(
                'Your finances are on a healthy track. Keep maintaining your current habits.'
            );
        }

        res.json({
            success: true,
            score: scoreResult ? scoreResult.score : null,
            category: scoreResult ? scoreResult.category : 'Insufficient Data',

            factors,

            suggestions,

            summary: {
    monthlyIncome,
    monthlyExpenses,
    monthlyBudget,

    monthOverMonth: {
        previousMonthIncome,
        previousMonthExpenses,
        incomeChange: previousMonthIncome > 0
            ? Number(
                (((monthlyIncome - previousMonthIncome) / previousMonthIncome) * 100).toFixed(2)
            )
            : null,
        expenseChange: previousMonthExpenses > 0
            ? Number(
                (((monthlyExpenses - previousMonthExpenses) / previousMonthExpenses) * 100).toFixed(2)
            )
            : null
    },

    savingsProgress: Number(
        savingsProgress.toFixed(2)
    ),
    spendingConsistency: Number(
        spendingConsistency.toFixed(2)
    ),
    transactionCount: transactions.length,
    savingsGoalCount: savingsGoals.length
},

            dataAvailability: {
                hasTransactions: transactions.length > 0,
                hasBudget: Boolean(budget),
                hasSavingsGoals: savingsGoals.length > 0
            }
        });
    } catch (error) {
        console.error(
            'Financial health score error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to calculate financial health score'
        });
    }
};

module.exports = {
    getFinancialHealth
};