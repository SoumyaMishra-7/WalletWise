const Budget = require('../models/Budget');
const Transaction = require('../models/Transactions');
const { isValidObjectId } = require('../utils/validation');
const gamification = require('../utils/gamification');

// Coerce a value to a finite number. Returns null when it is missing, blank or
// not numeric, so callers can tell "absent" apart from a legitimate 0.
const toFiniteNumber = (value) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

// Validate the category list before any arithmetic is done on it. The old code
// summed the raw values first, so a missing or non-numeric amount/percentage
// produced NaN. Every comparison against NaN is false, so the
// `Math.abs(total - expected) > 0.01` checks below silently passed and an
// invalid budget was saved.
const validateCategories = (categories) => {
    if (!Array.isArray(categories) || categories.length === 0) {
        return { error: 'At least one category is required' };
    }

    const normalized = [];

    for (const category of categories) {
        if (!category || typeof category !== 'object' || Array.isArray(category)) {
            return { error: 'Each category must be an object' };
        }

        if (typeof category.name !== 'string' || category.name.trim() === '') {
            return { error: 'Each category must have a name' };
        }

        const name = category.name.trim();
        const amount = toFiniteNumber(category.amount);
        const percentage = toFiniteNumber(category.percentage);

        if (percentage === null) {
            return { error: `Percentage for ${name} must be a number` };
        }

        if (amount === null) {
            return { error: `Amount for ${name} must be a number` };
        }

        if (percentage < 0 || percentage > 100) {
            return { error: `Percentage for ${name} must be between 0 and 100` };
        }

        if (amount < 0) {
            return { error: `Amount for ${name} cannot be negative` };
        }

        normalized.push({ ...category, name, amount, percentage });
    }

    return { categories: normalized };
};

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

        // Validate the categories before summing them, so a missing or
        // non-numeric value cannot turn the totals into NaN and skip the
        // checks below.
        const validated = validateCategories(categories);
        if (validated.error) {
            return res.status(400).json({
                success: false,
                message: validated.error
            });
        }

        const safeCategories = validated.categories;
        const totalPercentage = safeCategories.reduce((sum, cat) => sum + cat.percentage, 0);
        const totalAmount = safeCategories.reduce((sum, cat) => sum + cat.amount, 0);

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
            budget.categories = safeCategories;
            budget.updatedAt = new Date();
            await budget.save();

        } else {
            // Create new budget
            budget = new Budget({
                userId: req.userId,
                totalBudget,
                categories: safeCategories,
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

        if (updates.categories !== undefined) {
            // Validate first: the old code summed the raw values, so a missing
            // or non-numeric amount/percentage made the total NaN and the
            // Math.abs(...) > 0.01 check below always returned false.
            const validated = validateCategories(updates.categories);
            if (validated.error) {
                return res.status(400).json({
                    success: false,
                    message: validated.error
                });
            }

            const safeCategories = validated.categories;
            const totalPercentage = safeCategories.reduce((sum, cat) => sum + cat.percentage, 0);

            if (Math.abs(totalPercentage - 100) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`
                });
            }

            // Ensure we use the right totalBudget to compare against (either the new one or existing)
            const expectedTotal = updates.totalBudget !== undefined ? updates.totalBudget : budget.totalBudget;
            const totalAmount = safeCategories.reduce((sum, cat) => sum + cat.amount, 0);

            if (Math.abs(totalAmount - expectedTotal) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Sum of category amounts (${totalAmount}) must equal total budget (${expectedTotal})`
                });
            }

            updates.categories = safeCategories;
        }

        // Update fields with a secure whitelist
        const allowedUpdates = ['totalBudget', 'categories', 'isActive'];

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

        const utilization = budget.totalBudget > 0
            ? Math.min((totalSpent / budget.totalBudget) * 100, 100)
            : 0;

        return res.json({
            success: true,
            hasBudget: true,
            summary: {
                totalBudget: budget.totalBudget,
                categories: categoriesWithSpend.map(cat => ({
                    name: cat.name,
                    allocated: cat.amount,
                    spent: cat.spent,
                    remaining: Math.max(cat.amount - cat.spent, 0),
                    utilization: cat.amount > 0 ? Math.min((cat.spent / cat.amount) * 100, 100) : 0,
                    color: cat.color
                })),
                spent: totalSpent,
                remaining: Math.max(budget.totalBudget - totalSpent, 0),
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
