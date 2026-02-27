const { isValidObjectId } = require('../utils/validation');

/**
 * SavingsGoalService — extracted from savingGoalController.
 * 
 * @param {Object} deps
 * @param {Object} deps.savingsGoalModel — Mongoose SavingsGoal model (used directly for simplicity)
 * @param {Object} deps.gamificationService — IGamificationService
 * @param {Object} deps.logger — ILogger
 */
class SavingsGoalService {
    constructor({ savingsGoalModel, gamificationService, logger }) {
        this.SavingsGoal = savingsGoalModel;
        this.gamification = gamificationService;
        this.logger = logger;
    }

    /**
     * Calculate predictive fields for a savings goal.
     * @param {Object} goal
     * @returns {Object}
     */
    calculatePredictiveFields(goal) {
        const now = new Date();
        const targetDate = new Date(goal.targetDate);
        const createdAt = goal.createdAt ? new Date(goal.createdAt) : now;

        const timeRemaining = targetDate.getTime() - now.getTime();
        let daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 3600 * 24)));

        const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

        let requiredDailySavings = 0;
        let requiredWeeklySavings = 0;

        if (daysRemaining > 0 && remainingAmount > 0) {
            requiredDailySavings = remainingAmount / daysRemaining;
            requiredWeeklySavings = requiredDailySavings * 7;
        }

        let status = 'Lagging';
        if (goal.currentAmount >= goal.targetAmount) {
            status = 'Completed';
        } else {
            const totalDurationDays = Math.max(1, Math.ceil((targetDate.getTime() - createdAt.getTime()) / (1000 * 3600 * 24)));
            const daysElapsed = Math.max(0, Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24)));
            const expectedAmount = (goal.targetAmount / totalDurationDays) * daysElapsed;

            if (goal.currentAmount >= expectedAmount) {
                status = 'On track';
            }
        }

        return {
            daysRemaining,
            requiredDailySavings: Number(requiredDailySavings.toFixed(2)),
            requiredWeeklySavings: Number(requiredWeeklySavings.toFixed(2)),
            status
        };
    }

    /**
     * Create a savings goal.
     * @param {string} userId
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    async createGoal(userId, data) {
        const {
            name, description = '', targetAmount, currentAmount = 0,
            targetDate, category = 'Other', priority = 'Medium', monthlyContribution = 0
        } = data;

        if (!name || !targetAmount || !targetDate) {
            return { error: 'Name, target amount, and target date are required', status: 400 };
        }

        const parsedTarget = parseFloat(targetAmount);
        const parsedCurrent = parseFloat(currentAmount) || 0;
        const parsedMonthly = parseFloat(monthlyContribution) || 0;

        if (isNaN(parsedTarget) || parsedTarget <= 0) {
            return { error: 'Valid target amount is required', status: 400 };
        }

        const savingsGoal = new this.SavingsGoal({
            userId,
            name: name.trim(),
            description: description.trim(),
            targetAmount: parsedTarget,
            currentAmount: parsedCurrent,
            targetDate: new Date(targetDate),
            category,
            priority,
            monthlyContribution: parsedMonthly,
            isActive: true
        });

        await savingsGoal.save();

        const badgeAwarded = await this.gamification.awardBadge(userId, 'SAVINGS_GOAL_STARTED');

        return {
            goal: {
                id: savingsGoal._id,
                name: savingsGoal.name,
                targetAmount: savingsGoal.targetAmount,
                currentAmount: savingsGoal.currentAmount,
                targetDate: savingsGoal.targetDate,
                progress: savingsGoal.progress,
                ...this.calculatePredictiveFields(savingsGoal)
            },
            badgeAwarded
        };
    }

    /**
     * Get all active savings goals for a user.
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async getAllGoals(userId) {
        const goals = await this.SavingsGoal.find({ userId, isActive: true });
        return goals.map(g => ({
            id: g._id,
            name: g.name,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            targetDate: g.targetDate,
            progress: g.progress,
            ...this.calculatePredictiveFields(g)
        }));
    }

    /**
     * Add an amount to a savings goal.
     * @param {string} userId
     * @param {string} goalId
     * @param {number} amount
     * @returns {Promise<Object>}
     */
    async addAmount(userId, goalId, amount) {
        if (!isValidObjectId(goalId)) {
            return { error: 'Invalid goal ID format', status: 400 };
        }

        const parsedAmount = parseFloat(amount);
        if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return { error: 'Valid amount is required', status: 400 };
        }

        const goal = await this.SavingsGoal.findOneAndUpdate(
            { _id: goalId, userId, isActive: true },
            [
                {
                    $set: {
                        currentAmount: {
                            $min: [
                                "$targetAmount",
                                { $add: ["$currentAmount", parsedAmount] }
                            ]
                        }
                    }
                }
            ],
            { new: true }
        );

        if (!goal) {
            return { error: 'Goal not found', status: 404 };
        }

        return {
            id: goal._id,
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            targetDate: goal.targetDate,
            progress: goal.progress,
            category: goal.category,
            isActive: goal.isActive,
            ...this.calculatePredictiveFields(goal)
        };
    }
}

module.exports = SavingsGoalService;
