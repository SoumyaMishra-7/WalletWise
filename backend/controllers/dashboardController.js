const User = require('../models/User');
const Transaction = require('../models/Transactions');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingGoal');
const Subscription = require('../models/Subscription');

// Dashboard Summary
const getDashboardSummary = async (req, res) => {
    try {
        const userId = req.userId;
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59, 999);

        // Get all data in parallel
        const [transactions, budget, savingsGoals, user, subscriptions] = await Promise.all([
            Transaction.find({ userId }),
            Budget.findOne({ userId, isActive: true }),
            SavingsGoal.find({ userId, isActive: true }),
            User.findById(userId).select('-passwordHash -refreshTokenHash'),
            Subscription.find({ userId, isActive: true })
        ]);

        // Calculate monthly expenses and income
        const monthlyTransactions = transactions.filter(t => t.date >= startOfMonth);
        const prevMonthTransactions = transactions.filter(
            t => t.date >= startOfPrevMonth && t.date <= endOfPrevMonth
        );

        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const prevMonthExpenses = prevMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        // Calculate total savings
        const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

        // Get recent transactions (last 10)
        const recentTransactions = transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10)
            .map(t => ({
                id: t._id,
                type: t.type,
                amount: t.amount,
                category: t.category,
                description: t.description,
                date: t.date,
                paymentMethod: t.paymentMethod,
                mood: t.mood
            }));

        // Calculate budget data
        const monthlyBudget = budget?.totalBudget || 0;
        const budgetUsedPercentage = monthlyBudget > 0 ?
            Math.min((monthlyExpenses / monthlyBudget) * 100, 100) : 0;
        const budgetLeft = Math.max(0, monthlyBudget - monthlyExpenses);

        // Calculate total balance
        const totalBalance = user.walletBalance;

        // Category spending (current month)
        const categoryMap = new Map();
        monthlyTransactions
            .filter(t => t.type === 'expense')
            .forEach((t) => {
                const key = t.category || 'Other';
                const current = categoryMap.get(key) || 0;
                categoryMap.set(key, current + t.amount);
            });

        const categorySpending = Array.from(categoryMap.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

        // Weekly expenses (last 7 days)
        const dayBuckets = [];
        for (let i = 6; i >= 0; i -= 1) {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);
            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);

            const amount = transactions
                .filter(t => t.type === 'expense' && t.date >= day && t.date < nextDay)
                .reduce((sum, t) => sum + t.amount, 0);

            dayBuckets.push({
                day: day.toLocaleDateString('en-US', { weekday: 'short' }),
                amount
            });
        }

        const expenseTrend = prevMonthExpenses > 0
            ? ((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 100
            : (monthlyExpenses > 0 ? 100 : 0);

        // Calculate upcoming bills (next 7 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        const upcomingBills = subscriptions
            .map(sub => {
                let dueDate = new Date(sub.nextDueDate);

                // If due date is in the past, project it forward to the next cycle
                while (dueDate < today) {
                    if (sub.billingCycle === 'monthly') {
                        dueDate.setMonth(dueDate.getMonth() + 1);
                    } else if (sub.billingCycle === 'yearly') {
                        dueDate.setFullYear(dueDate.getFullYear() + 1);
                    } else if (sub.billingCycle === 'weekly') {
                        dueDate.setDate(dueDate.getDate() + 7);
                    } else {
                        break; // Safety break for unknown cycles
                    }
                }

                // Return a new object with the projected date
                // We convert Mongoose document to object to avoid mutation issues
                return {
                    id: sub._id,
                    name: sub.name,
                    amount: sub.amount,
                    dueDate: dueDate,
                    category: sub.category,
                    billingCycle: sub.billingCycle
                };
            })
            .filter(sub => {
                return sub.dueDate >= today && sub.dueDate <= nextWeek;
            })
            .sort((a, b) => a.dueDate - b.dueDate) // Sort by nearest due date
            .map(sub => ({
                id: sub.id,
                name: sub.name,
                amount: sub.amount,
                dueDate: sub.dueDate,
                category: sub.category
            }));

        res.json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                studentId: user.studentId
            },
            stats: {
                totalBalance,
                monthlyExpenses,
                monthlyIncome,
                budgetLeft,
                totalSavings,
                monthlyBudget,
                budgetUsedPercentage
            },
            recentTransactions,
            categorySpending,
            weeklyExpenses: dayBuckets,
            expenseTrend: Number(expenseTrend.toFixed(2)),
            savingsGoals: savingsGoals.map(g => ({
                id: g._id,
                name: g.name,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
                targetDate: g.targetDate,
                category: g.category,
                priority: g.priority,
                progress: g.progress,
                monthlyContribution: g.monthlyContribution
            })),
            upcomingBills,
            notifications: 0
        });

    } catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data'
        });
    }
};

module.exports = {
    getDashboardSummary
};
