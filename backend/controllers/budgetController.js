const Budget = require('../models/Budget');
const Transaction = require('../models/Transactions');
const { isValidObjectId } = require('../utils/validation');
const gamification = require('../utils/gamification');
const {
    ROLLOVER_MODE_VALUES,
    DEFAULT_ROLLOVER_MODE,
    getRolloverAmount,
    getAvailableBudget,
    getCategoryAvailable,
    calculateUtilization,
    roundMoney
} = require('../utils/budgetRollover');

// Validate the optional rollover settings sent by the client.
// Returns { error } or { rolloverEnabled, rolloverMode } (undefined = "not provided").
const parseRolloverSettings = (body = {}) => {
    const { rolloverEnabled, rolloverMode } = body;

    if (rolloverEnabled !== undefined && typeof rolloverEnabled !== 'boolean') {
        return { error: 'rolloverEnabled must be true or false' };
    }
    if (rolloverMode !== undefined && !ROLLOVER_MODE_VALUES.includes(rolloverMode)) {
        return { error: `rolloverMode must be one of: ${ROLLOVER_MODE_VALUES.join(', ')}` };
    }
    return { rolloverEnabled, rolloverMode };
};

// Never trust rollover values sent inside categories - they are calculated server-side.
const stripCategoryRollover = (categories) =>
    categories.map((category) => {
        const { rolloverAmount, ...rest } = category;
        return rest;
    });

// Shared API shape for a budget (adds the rollover fields to the original ones).
const formatBudget = (budget) => ({
    id: budget._id,
    totalBudget: budget.totalBudget,
    categories: budget.categories,
    month: budget.month,
    rolloverEnabled: Boolean(budget.rolloverEnabled),
    rolloverMode: budget.rolloverMode || DEFAULT_ROLLOVER_MODE,
    rolloverAmount: getRolloverAmount(budget),
    rolloverFrom: budget.rolloverAppliedFrom || null,
    availableBudget: getAvailableBudget(budget),
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt
});

// Set/Update Budget
const setBudget = async (req, res) => {
    try {
        const { totalBudget, categories, month } = req.body;

        // Validation
        if (!totalBudget || totalBudget <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid total budget amount is required'
            });
        }

        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one category is required'
            });
        }

        // Validate categories
        let totalPercentage = 0;
        let totalAmount = 0;

        for (const category of categories) {
            if (!category.name || category.amount === undefined || category.percentage === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Each category must have name, amount, and percentage'
                });
            }

            if (category.percentage < 0 || category.percentage > 100) {
                return res.status(400).json({
                    success: false,
                    message: `Percentage for ${category.name} must be between 0 and 100`
                });
            }

            if (category.amount < 0) {
                return res.status(400).json({
                    success: false,
                    message: `Amount for ${category.name} cannot be negative`
                });
            }

            totalPercentage += category.percentage;
            totalAmount += category.amount;
        }

        // Check if percentages sum to 100
        if (Math.abs(totalPercentage - 100) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`
            });
        }

        // Check if total amount matches sum of categories
        if (Math.abs(totalAmount - totalBudget) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Sum of category amounts (${totalAmount}) must equal total budget (${totalBudget})`
            });
        }

        // Determine month (use current month if not provided)
        const budgetMonth = month || new Date().toISOString().slice(0, 7);

        // Validate month format
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(budgetMonth)) {
            return res.status(400).json({
                success: false,
                message: 'Month must be in YYYY-MM format'
            });
        }

        const { error: rolloverError, rolloverEnabled, rolloverMode } = parseRolloverSettings(req.body);
        if (rolloverError) {
            return res.status(400).json({
                success: false,
                message: rolloverError
            });
        }

        const safeCategories = stripCategoryRollover(categories);

        // Check if budget for this month already exists
        let budget = await Budget.findOne({
            userId: req.userId,
            month: budgetMonth,
            isActive: true
        });

        if (budget) {
            // Update existing budget
            budget.totalBudget = totalBudget;
            budget.categories = safeCategories;
            if (rolloverEnabled !== undefined) budget.rolloverEnabled = rolloverEnabled;
            if (rolloverMode !== undefined) budget.rolloverMode = rolloverMode;
            budget.resetRollover(); // recalculated below from last month's data
            budget.updatedAt = new Date();
            await budget.save();

        } else {
            // Create new budget
            budget = new Budget({
                userId: req.userId,
                totalBudget,
                categories: safeCategories,
                month: budgetMonth,
                isActive: true,
                rolloverEnabled: rolloverEnabled === true,
                rolloverMode: rolloverMode || DEFAULT_ROLLOVER_MODE
            });

            await budget.save();
        }

        // No-op unless rollover is enabled for this budget
        budget = await Budget.applyRollover(budget);

        // Gamification Hook: Award First Budget badge if applicable
        const badgeAwarded = await gamification.awardBadge(req.userId, 'FIRST_BUDGET');

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Budget set successfully! 🎉',
            gamification: badgeAwarded ? { badge: badgeAwarded.badge } : null,
            notification: {
                type: 'success',
                title: 'Budget Set',
                message: `Your monthly budget of ₹${totalBudget.toLocaleString()} has been set successfully.`,
                timestamp: new Date().toISOString()
            },
            budget: formatBudget(budget)
        });

    } catch (error) {
        console.error('❌ Set budget error:', error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Budget for this month already exists'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to set budget. Please try again.'
        });
    }
};

// Get Current Budget
const getCurrentBudget = async (req, res) => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7);

        let budget = await Budget.findOne({
            userId: req.userId,
            month: currentMonth,
            isActive: true
        });

        if (budget) {
            budget = await Budget.applyRollover(budget);
        }

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'No budget set for current month',
                hasBudget: false,
                notification: {
                    type: 'info',
                    title: 'No Budget Found',
                    message: 'You have not set a budget for this month. Click "Set Budget" to create one.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            success: true,
            hasBudget: true,
            message: 'Budget found for current month',
            budget: formatBudget(budget)
        });

    } catch (error) {
        console.error('Get current budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget'
        });
    }
};

// Get Budget by Month
const getBudgetByMonth = async (req, res) => {
    try {
        const { month } = req.params;
        const userId = req.userId;

        // Validate month format
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(month)) {
            return res.status(400).json({
                success: false,
                message: 'Month must be in YYYY-MM format'
            });
        }

        let budget = await Budget.findOne({
            userId,
            month,
            isActive: true
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: `No budget found for ${month}`,
                hasBudget: false
            });
        }

        budget = await Budget.applyRollover(budget);

        res.json({
            success: true,
            hasBudget: true,
            budget: { ...budget.toJSON(), availableBudget: getAvailableBudget(budget) }
        });

    } catch (error) {
        console.error('Get budget by month error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget'
        });
    }
};

// Get All User Budgets
const getAllBudgets = async (req, res) => {
    try {
        const userId = req.userId;
        const budgets = await Budget.find({
            userId,
            isActive: true
        }).sort({ month: -1 });

        res.json({
            success: true,
            count: budgets.length,
            budgets: budgets.map(formatBudget)
        });

    } catch (error) {
        console.error('Get all budgets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budgets'
        });
    }
};

// Copy Previous Month's Budget
const copyPreviousBudget = async (req, res) => {
    try {


        const currentDate = new Date();
        const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
            .toISOString().slice(0, 7);

        const previousBudget = await Budget.findOne({
            userId: req.userId,
            month: previousMonth,
            isActive: true
        });

        if (!previousBudget) {
            return res.status(404).json({
                success: false,
                message: 'No previous month budget found to copy'
            });
        }

        const currentMonth = currentDate.toISOString().slice(0, 7);

        // Check if current month budget already exists
        const existingBudget = await Budget.findOne({
            userId: req.userId,
            month: currentMonth,
            isActive: true
        });

        if (existingBudget) {
            return res.status(400).json({
                success: false,
                message: 'Budget for current month already exists'
            });
        }

        // Create new budget for current month
        let newBudget = new Budget({
            userId: previousBudget.userId,
            totalBudget: previousBudget.totalBudget,
            categories: previousBudget.categories.map(cat => ({
                name: cat.name,
                amount: cat.amount,
                percentage: cat.percentage,
                color: cat.color
            })),
            month: currentMonth,
            isActive: true,
            rolloverEnabled: previousBudget.rolloverEnabled,
            rolloverMode: previousBudget.rolloverMode
        });

        await newBudget.save();
        newBudget = await Budget.applyRollover(newBudget);

        res.status(201).json({
            success: true,
            message: 'Previous month budget copied successfully!',
            notification: {
                type: 'success',
                title: 'Budget Copied',
                message: `Budget of ₹${newBudget.totalBudget.toLocaleString()} has been copied from previous month.`,
                timestamp: new Date().toISOString()
            },
            budget: formatBudget(newBudget)
        });

    } catch (error) {
        console.error('Copy previous budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to copy previous month budget'
        });
    }
};

// Delete/Deactivate Budget
const deleteBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid budget ID format' });
        }

        const budget = await Budget.findOne({
            _id: id,
            userId
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        // Soft delete by setting isActive to false
        budget.isActive = false;
        await budget.save();

        res.json({
            success: true,
            message: 'Budget deleted successfully'
        });

    } catch (error) {
        console.error('Delete budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete budget'
        });
    }
};

// Update Budget
const updateBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const updates = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid budget ID format' });
        }

        let budget = await Budget.findOne({
            _id: id,
            userId,
            isActive: true
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                message: 'Budget not found'
            });
        }

        // Validate if updating
        if (updates.totalBudget !== undefined && updates.totalBudget <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid total budget amount is required and must be greater than 0'
            });
        }

        if (updates.categories) {
            const totalPercentage = updates.categories.reduce((sum, cat) => sum + cat.percentage, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`
                });
            }

            // Ensure we use the right totalBudget to compare against (either the new one or existing)
            const expectedTotal = updates.totalBudget !== undefined ? updates.totalBudget : budget.totalBudget;
            let totalAmount = 0;

            for (const category of updates.categories) {
                if (category.amount < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Amount for ${category.name} cannot be negative`
                    });
                }
                totalAmount += category.amount;
            }

            if (Math.abs(totalAmount - expectedTotal) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Sum of category amounts (${totalAmount}) must equal total budget (${expectedTotal})`
                });
            }
        }

        const { error: rolloverError, rolloverEnabled, rolloverMode } = parseRolloverSettings(updates);
        if (rolloverError) {
            return res.status(400).json({
                success: false,
                message: rolloverError
            });
        }

        // Update fields with a secure whitelist
        const allowedUpdates = ['totalBudget', 'categories', 'isActive'];

        allowedUpdates.forEach(key => {
            if (updates[key] !== undefined) {
                budget[key] = key === 'categories' ? stripCategoryRollover(updates[key]) : updates[key];
            }
        });
        if (rolloverEnabled !== undefined) budget.rolloverEnabled = rolloverEnabled;
        if (rolloverMode !== undefined) budget.rolloverMode = rolloverMode;

        // Categories or settings changed => recalculate from last month's data
        if (updates.categories !== undefined || rolloverEnabled !== undefined || rolloverMode !== undefined) {
            budget.resetRollover();
        }

        await budget.save();
        budget = await Budget.applyRollover(budget);

        res.json({
            success: true,
            message: 'Budget updated successfully',
            notification: {
                type: 'success',
                title: 'Budget Updated',
                message: `Your budget has been updated successfully.`,
                timestamp: new Date().toISOString()
            },
            budget: { ...budget.toJSON(), availableBudget: getAvailableBudget(budget) }
        });

    } catch (error) {
        console.error('Update budget error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update budget'
        });
    }
};

// Budget Summary/Statistics
const getBudgetSummary = async (req, res) => {
    try {
        const userId = req.userId;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        let budget = await Budget.findOne({
            userId,
            month: currentMonth,
            isActive: true
        });
        if (budget) {
            budget = await Budget.applyRollover(budget);
        }
        const expenses = await Transaction.find({
            userId,
            type: "expense",
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        }).select("category amount");

        const totalSpent = expenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);

        if (!budget) {
            return res.json({
                success: true,
                hasBudget: false,
                summary: {
                    totalBudget: 0,
                    categories: [],
                    spent: totalSpent,
                    remaining: 0,
                    utilization: 0
                }
            });
        }

        const spentByCategory = new Map();
        expenses.forEach((tx) => {
            const key = String(tx.category || "").toLowerCase();
            spentByCategory.set(key, (spentByCategory.get(key) || 0) + (tx.amount || 0));
        });

        const categoriesWithSpend = budget.categories.map((category) => {
            const key = String(category.name || "").toLowerCase();
            const spent = spentByCategory.get(key) || 0;
            return {
                ...category.toObject(),
                spent
            };
        });

        // "Available this month" = base budget + rollover (rollover is 0 when disabled,
        // so budgets without rollover produce exactly the same numbers as before).
        const rolloverAmount = getRolloverAmount(budget);
        const availableBudget = getAvailableBudget(budget);
        const utilization = calculateUtilization(totalSpent, availableBudget);

        return res.json({
            success: true,
            hasBudget: true,
            summary: {
                // totalBudget is the rollover-adjusted amount so existing consumers
                // (progress bars, alerts, reports) pick up the rollover automatically.
                totalBudget: availableBudget,
                baseBudget: budget.totalBudget,
                rolloverAmount,
                availableBudget,
                rolloverEnabled: Boolean(budget.rolloverEnabled),
                rolloverMode: budget.rolloverMode || DEFAULT_ROLLOVER_MODE,
                rolloverFrom: budget.rolloverAppliedFrom || null,
                categories: categoriesWithSpend.map(cat => {
                    const allocated = getCategoryAvailable(budget, cat);
                    const categoryRollover = budget.rolloverEnabled ? roundMoney(cat.rolloverAmount) : 0;
                    return {
                        name: cat.name,
                        allocated,
                        baseAllocated: cat.amount,
                        rollover: categoryRollover,
                        spent: cat.spent,
                        remaining: Math.max(allocated - cat.spent, 0),
                        utilization: (cat.amount > 0 || categoryRollover !== 0)
                            ? calculateUtilization(cat.spent, allocated)
                            : 0,
                        color: cat.color
                    };
                }),
                spent: totalSpent,
                remaining: Math.max(availableBudget - totalSpent, 0),
                utilization
            }
        });

    } catch (error) {
        console.error('Budget summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get budget summary'
        });
    }
};

module.exports = {
    setBudget,
    getCurrentBudget,
    getBudgetByMonth,
    getAllBudgets,
    copyPreviousBudget,
    deleteBudget,
    updateBudget,
    getBudgetSummary
};
