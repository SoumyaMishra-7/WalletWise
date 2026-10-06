const Budget = require('../models/Budget');
const Transaction = require('../models/Transactions');
const { isValidObjectId } = require('../utils/validation');
const gamification = require('../utils/gamification');

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

        // Check if budget for this month already exists
        let budget = await Budget.findOne({
            userId: req.userId,
            month: budgetMonth,
            isActive: true
        });

        if (budget) {
            // Update existing budget
            budget.totalBudget = totalBudget;
            budget.categories = categories;
            budget.updatedAt = new Date();
            await budget.save();

        } else {
            // Create new budget
            budget = new Budget({
                userId: req.userId,
                totalBudget,
                categories,
                month: budgetMonth,
                isActive: true
            });

            await budget.save();
        }

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
            budget: {
                id: budget._id,
                totalBudget: budget.totalBudget,
                categories: budget.categories,
                month: budget.month,
                createdAt: budget.createdAt,
                updatedAt: budget.updatedAt
            }
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

        const budget = await Budget.findOne({
            userId: req.userId,
            month: currentMonth,
            isActive: true
        });

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
            budget: {
                id: budget._id,
                totalBudget: budget.totalBudget,
                categories: budget.categories,
                month: budget.month,
                createdAt: budget.createdAt,
                updatedAt: budget.updatedAt
            }
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

        const budget = await Budget.findOne({
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

        res.json({
            success: true,
            hasBudget: true,
            budget: budget
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
            budgets: budgets.map(budget => ({
                id: budget._id,
                totalBudget: budget.totalBudget,
                categories: budget.categories,
                month: budget.month,
                createdAt: budget.createdAt,
                updatedAt: budget.updatedAt
            }))
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
        const newBudget = new Budget({
            userId: previousBudget.userId,
            totalBudget: previousBudget.totalBudget,
            categories: previousBudget.categories.map(cat => ({
                name: cat.name,
                amount: cat.amount,
                percentage: cat.percentage,
                color: cat.color
            })),
            month: currentMonth,
            isActive: true
        });

        await newBudget.save();

        res.status(201).json({
            success: true,
            message: 'Previous month budget copied successfully!',
            notification: {
                type: 'success',
                title: 'Budget Copied',
                message: `Budget of ₹${newBudget.totalBudget.toLocaleString()} has been copied from previous month.`,
                timestamp: new Date().toISOString()
            },
            budget: {
                id: newBudget._id,
                totalBudget: newBudget.totalBudget,
                categories: newBudget.categories,
                month: newBudget.month,
                createdAt: newBudget.createdAt
            }
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

        const budget = await Budget.findOne({
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

        // Update fields with a secure whitelist
        const allowedUpdates = ['totalBudget', 'categories', 'isActive', 'rolloverEnabled', 'rolloverMode'];

        allowedUpdates.forEach(key => {
            if (updates[key] !== undefined) {
                budget[key] = updates[key];
            }
        });

        await budget.save();

        res.json({
            success: true,
            message: 'Budget updated successfully',
            notification: {
                type: 'success',
                title: 'Budget Updated',
                message: `Your budget has been updated successfully.`,
                timestamp: new Date().toISOString()
            },
            budget: budget
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

        const budget = await Budget.findOne({
            userId,
            month: currentMonth,
            isActive: true
        });
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

        const rolloverAmount = budget.rolloverAmount || 0;
        const effectiveBudget = budget.totalBudget + rolloverAmount;

        const utilization = effectiveBudget > 0
            ? Math.min((totalSpent / effectiveBudget) * 100, 100)
            : 0;

        return res.json({
            success: true,
            hasBudget: true,
            summary: {
                totalBudget: budget.totalBudget,
                rolloverEnabled: budget.rolloverEnabled,
                rolloverMode: budget.rolloverMode,
                rolloverAmount,
                effectiveBudget,
                categories: categoriesWithSpend.map(cat => ({
                    name: cat.name,
                    allocated: cat.amount,
                    spent: cat.spent,
                    remaining: Math.max(cat.amount - cat.spent, 0),
                    utilization: cat.amount > 0 ? Math.min((cat.spent / cat.amount) * 100, 100) : 0,
                    color: cat.color
                })),
                spent: totalSpent,
                remaining: Math.max(effectiveBudget - totalSpent, 0),
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

// Apply rollover from the previous month into the current budget
// Idempotent: sets rolloverApplied = true so it never runs twice for the same budget
const applyRollover = async (req, res) => {
    try {
        const userId = req.userId;
        const currentMonth = new Date().toISOString().slice(0, 7);

        const currentBudget = await Budget.findOne({ userId, month: currentMonth, isActive: true });
        if (!currentBudget) {
            return res.status(404).json({ success: false, message: 'No budget found for the current month' });
        }
        if (!currentBudget.rolloverEnabled) {
            return res.status(400).json({ success: false, message: 'Rollover is not enabled for this budget' });
        }
        if (currentBudget.rolloverApplied) {
            return res.status(409).json({ success: false, message: 'Rollover has already been applied for this month' });
        }

        // Find previous month
        const prevDate = new Date();
        prevDate.setDate(1);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonth = prevDate.toISOString().slice(0, 7);

        const prevBudget = await Budget.findOne({ userId, month: prevMonth, isActive: true });
        if (!prevBudget) {
            return res.status(404).json({ success: false, message: 'No budget found for the previous month to roll over from' });
        }

        // Calculate actual spending for the previous month
        const prevStart = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
        const prevEnd = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const prevExpenses = await Transaction.find({
            userId,
            type: 'expense',
            date: { $gte: prevStart, $lte: prevEnd }
        }).select('amount');

        const prevTotalSpent = prevExpenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const prevNetRemaining = prevBudget.totalBudget - prevTotalSpent; // positive = underspent, negative = overspent

        // Apply rollover based on mode
        let rolloverAmount = 0;
        if (currentBudget.rolloverMode === 'positive') {
            rolloverAmount = Math.max(0, prevNetRemaining); // carry only unused budget
        } else {
            rolloverAmount = prevNetRemaining; // carry unused AND deduct overspend
        }

        currentBudget.rolloverAmount = Math.round(rolloverAmount * 100) / 100;
        currentBudget.rolloverApplied = true;
        await currentBudget.save();

        return res.json({
            success: true,
            message: 'Rollover applied successfully',
            rolloverAmount: currentBudget.rolloverAmount,
            effectiveBudget: currentBudget.totalBudget + currentBudget.rolloverAmount
        });

    } catch (error) {
        console.error('Apply rollover error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply rollover' });
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
    getBudgetSummary,
    applyRollover
};
