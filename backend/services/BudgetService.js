const { isValidObjectId } = require('../utils/validation');

/**
 * BudgetService — extracted business logic from budgetController.
 * 
 * @param {Object} deps
 * @param {Object} deps.budgetRepository — IBudgetRepository implementation
 * @param {Object} deps.transactionRepository — ITransactionRepository implementation
 * @param {Object} deps.gamificationService — IGamificationService implementation
 * @param {Object} deps.logger — ILogger implementation
 */
class BudgetService {
    constructor({ budgetRepository, transactionRepository, gamificationService, logger }) {
        this.budgetRepo = budgetRepository;
        this.txRepo = transactionRepository;
        this.gamification = gamificationService;
        this.logger = logger;
    }

    /**
     * Set or update a budget for a given month.
     * @param {string} userId
     * @param {Object} data — { totalBudget, categories, month? }
     * @returns {Promise<Object>}
     */
    async setBudget(userId, data) {
        const { totalBudget, categories, month } = data;

        if (!totalBudget || totalBudget <= 0) {
            return { error: 'Valid total budget amount is required', status: 400 };
        }

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return { error: 'At least one category is required', status: 400 };
        }

        let totalPercentage = 0;
        let totalAmount = 0;

        for (const category of categories) {
            if (!category.name || category.amount === undefined || category.percentage === undefined) {
                return { error: 'Each category must have name, amount, and percentage', status: 400 };
            }
            if (category.percentage < 0 || category.percentage > 100) {
                return { error: `Percentage for ${category.name} must be between 0 and 100`, status: 400 };
            }
            if (category.amount < 0) {
                return { error: `Amount for ${category.name} cannot be negative`, status: 400 };
            }
            totalPercentage += category.percentage;
            totalAmount += category.amount;
        }

        if (Math.abs(totalPercentage - 100) > 0.01) {
            return { error: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`, status: 400 };
        }

        if (Math.abs(totalAmount - totalBudget) > 0.01) {
            return { error: `Sum of category amounts (${totalAmount}) must equal total budget (${totalBudget})`, status: 400 };
        }

        const budgetMonth = month || new Date().toISOString().slice(0, 7);

        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(budgetMonth)) {
            return { error: 'Month must be in YYYY-MM format', status: 400 };
        }

        let budget = await this.budgetRepo.findOne({
            userId,
            month: budgetMonth,
            isActive: true
        });

        if (budget) {
            budget.totalBudget = totalBudget;
            budget.categories = categories;
            budget.updatedAt = new Date();
            await budget.save();
        } else {
            budget = await this.budgetRepo.create({
                userId,
                totalBudget,
                categories,
                month: budgetMonth,
                isActive: true
            });
        }

        const badgeAwarded = await this.gamification.awardBadge(userId, 'FIRST_BUDGET');

        return {
            budget: {
                id: budget._id,
                totalBudget: budget.totalBudget,
                categories: budget.categories,
                month: budget.month,
                createdAt: budget.createdAt,
                updatedAt: budget.updatedAt
            },
            badgeAwarded
        };
    }

    /**
     * Get the current month's budget.
     * @param {string} userId
     * @returns {Promise<Object|null>}
     */
    async getCurrentBudget(userId) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return this.budgetRepo.findOne({
            userId,
            month: currentMonth,
            isActive: true
        });
    }

    /**
     * Get a budget by month string (YYYY-MM).
     * @param {string} userId
     * @param {string} month
     * @returns {Promise<Object|null>}
     */
    async getBudgetByMonth(userId, month) {
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(month)) {
            return { error: 'Month must be in YYYY-MM format', status: 400 };
        }
        return this.budgetRepo.findOne({ userId, month, isActive: true });
    }

    /**
     * Get all budgets for a user.
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async getAllBudgets(userId) {
        return this.budgetRepo.find({ userId, isActive: true }, { sort: { month: -1 } });
    }

    /**
     * Delete (soft) a budget.
     * @param {string} userId
     * @param {string} budgetId
     * @returns {Promise<Object>}
     */
    async deleteBudget(userId, budgetId) {
        if (!isValidObjectId(budgetId)) {
            return { error: 'Invalid budget ID format', status: 400 };
        }

        const budget = await this.budgetRepo.findOne({ _id: budgetId, userId });
        if (!budget) {
            return { error: 'Budget not found', status: 404 };
        }

        budget.isActive = false;
        await budget.save();
        return { success: true };
    }
}

module.exports = BudgetService;
