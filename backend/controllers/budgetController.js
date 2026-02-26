const Budget = require('../models/Budget');
const Transaction = require('../models/Transactions');

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

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Budget set successfully! 🎉',
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
        if (updates.categories) {
            const totalPercentage = updates.categories.reduce((sum, cat) => sum + cat.percentage, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: `Total percentage must be 100%. Currently ${totalPercentage.toFixed(2)}%`
                });
            }
        }

        // Update fields
        Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== 'userId' && key !== 'month') {
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

        const budget = await Budget.findOne({
            userId,
            month: currentMonth,
            isActive: true
        });

        const monthlyExpenses = await Transaction.find({
            userId,
            type: 'expense',
            date: { $gte: startOfMonth }
        });

        const totalSpent = monthlyExpenses.reduce((sum, tx) => sum + tx.amount, 0);

        if (!budget) {
            return res.json({
                success: true,
                hasBudget: false,
                message: 'No budget set for current month',
                summary: {
                    totalBudget: 0,
                    categories: [],
                    spent: totalSpent,
                    remaining: 0,
                    utilization: 0
                }
            });
        }

        const normalize = (value) =>
            String(value || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '');

        const categoryAliases = {
            food: ['food', 'grocery', 'grocer', 'dining', 'restaurant'],
            transport: ['transport', 'travel', 'fuel', 'gas', 'uber', 'taxi', 'bus', 'train'],
            shopping: ['shopping', 'shop', 'clothes', 'apparel'],
            entertainment: ['entertain', 'movie', 'game', 'fun', 'subscription'],
            education: ['education', 'school', 'tuition', 'course', 'book'],
            healthcare: ['health', 'medical', 'doctor', 'pharmacy'],
            housing: ['housing', 'rent', 'utility', 'utilities', 'home'],
            other: ['other', 'misc']
        };

        const spentByCategory = new Map();
        monthlyExpenses.forEach((tx) => {
            const key = normalize(tx.category);
            spentByCategory.set(key, (spentByCategory.get(key) || 0) + tx.amount);
        });

        const matchTransactionCategories = (categoryName) => {
            const normalized = normalize(categoryName);
            if (!normalized) return [];

            const directMatch = Object.keys(categoryAliases).find((key) => key === normalized);
            if (directMatch) return [directMatch];

            return Object.entries(categoryAliases)
                .filter(([, aliases]) => aliases.some((alias) => normalized.includes(normalize(alias))))
                .map(([key]) => key);
        };

        const categoriesWithSpend = budget.categories.map((category) => {
            const matches = matchTransactionCategories(category.name);
            const spent = matches.reduce((sum, key) => sum + (spentByCategory.get(key) || 0), 0);
            return {
                ...category.toObject(),
                spent
            };
        });

        const utilization = budget.totalBudget > 0
            ? Math.min((totalSpent / budget.totalBudget) * 100, 100)
            : 0;

        res.json({
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
