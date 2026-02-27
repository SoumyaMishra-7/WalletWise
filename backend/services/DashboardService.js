/**
 * DashboardService — extracted from dashboardController.
 * 
 * @param {Object} deps
 * @param {Object} deps.userRepository — IUserRepository
 * @param {Object} deps.transactionRepository — ITransactionRepository
 * @param {Object} deps.budgetRepository — IBudgetRepository
 * @param {Object} deps.savingsGoalModel — Mongoose SavingsGoal model
 * @param {Object} deps.subscriptionModel — Mongoose Subscription model
 * @param {Object} deps.logger — ILogger
 */
class DashboardService {
    constructor({ userRepository, transactionRepository, budgetRepository, savingsGoalModel, subscriptionModel, logger }) {
        this.userRepo = userRepository;
        this.txRepo = transactionRepository;
        this.budgetRepo = budgetRepository;
        this.SavingsGoal = savingsGoalModel;
        this.Subscription = subscriptionModel;
        this.logger = logger;
    }

    /**
     * Get the full dashboard summary for a user.
     * @param {string} userId
     * @returns {Promise<Object>}
     */
    async getDashboardSummary(userId) {
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59, 999);

        const [transactions, budget, savingsGoals, user, subscriptions] = await Promise.all([
            this.txRepo.find({ userId }),
            this.budgetRepo.findOne({ userId, isActive: true }),
            this.SavingsGoal.find({ userId, isActive: true }),
            this.userRepo.findById(userId),
            this.Subscription.find({ userId, isActive: true })
        ]);

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

        const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

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

        const monthlyBudget = budget?.totalBudget || 0;
        const budgetUsedPercentage = monthlyBudget > 0 ?
            Math.min((monthlyExpenses / monthlyBudget) * 100, 100) : 0;
        const budgetLeft = Math.max(0, monthlyBudget - monthlyExpenses);
        const totalBalance = user.walletBalance;

        const categoryMap = new Map();
        monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
            const key = t.category || 'Other';
            categoryMap.set(key, (categoryMap.get(key) || 0) + t.amount);
        });
        const categorySpending = Array.from(categoryMap.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);

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
            dayBuckets.push({ day: day.toLocaleDateString('en-US', { weekday: 'short' }), amount });
        }

        const expenseTrend = prevMonthExpenses > 0
            ? ((monthlyExpenses - prevMonthExpenses) / prevMonthExpenses) * 100
            : (monthlyExpenses > 0 ? 100 : 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        const upcomingBills = subscriptions
            .map(sub => {
                let dueDate = new Date(sub.nextDueDate);
                while (dueDate < today) {
                    if (sub.billingCycle === 'monthly') dueDate.setMonth(dueDate.getMonth() + 1);
                    else if (sub.billingCycle === 'yearly') dueDate.setFullYear(dueDate.getFullYear() + 1);
                    else if (sub.billingCycle === 'weekly') dueDate.setDate(dueDate.getDate() + 7);
                    else break;
                }
                return {
                    id: sub._id, name: sub.name, amount: sub.amount,
                    dueDate, category: sub.category, billingCycle: sub.billingCycle
                };
            })
            .filter(sub => sub.dueDate >= today && sub.dueDate <= nextWeek)
            .sort((a, b) => a.dueDate - b.dueDate)
            .map(sub => ({ id: sub.id, name: sub.name, amount: sub.amount, dueDate: sub.dueDate, category: sub.category }));

        return {
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                studentId: user.studentId
            },
            stats: {
                totalBalance, monthlyExpenses, monthlyIncome,
                budgetLeft, totalSavings, monthlyBudget, budgetUsedPercentage
            },
            recentTransactions,
            categorySpending,
            weeklyExpenses: dayBuckets,
            expenseTrend: Number(expenseTrend.toFixed(2)),
            savingsGoals: savingsGoals.map(g => ({
                id: g._id, name: g.name, targetAmount: g.targetAmount,
                currentAmount: g.currentAmount, targetDate: g.targetDate,
                category: g.category, priority: g.priority,
                progress: g.progress, monthlyContribution: g.monthlyContribution
            })),
            upcomingBills,
            notifications: 0
        };
    }
}

module.exports = DashboardService;
