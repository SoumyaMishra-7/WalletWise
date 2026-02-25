const SavingsGoal = require('../models/SavingGoal');
const { isValidObjectId } = require('../utils/validation');

// Calculate predictive fields helper
const calculatePredictiveFields = (goal) => {
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
};

// Create Savings Goal
const createGoal = async (req, res) => {
    try {

        const {
            name,
            description = '',
            targetAmount,
            currentAmount = 0,
            targetDate,
            category = 'Other',
            priority = 'Medium',
            monthlyContribution = 0
        } = req.body;

        // Basic validation
        if (!name || !targetAmount || !targetDate) {
            return res.status(400).json({
                success: false,
                message: 'Name, target amount, and target date are required'
            });
        }

        // Parse amounts
        const parsedTarget = parseFloat(targetAmount);
        const parsedCurrent = parseFloat(currentAmount) || 0;
        const parsedMonthly = parseFloat(monthlyContribution) || 0;

        if (isNaN(parsedTarget) || parsedTarget <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid target amount is required'
            });
        }

        // Create goal
        const savingsGoal = new SavingsGoal({
            userId: req.userId,
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

        res.status(201).json({
            success: true,
            message: 'Savings goal created successfully',
            goal: {
                id: savingsGoal._id,
                name: savingsGoal.name,
                targetAmount: savingsGoal.targetAmount,
                currentAmount: savingsGoal.currentAmount,
                targetDate: savingsGoal.targetDate,
                progress: savingsGoal.progress,
                ...calculatePredictiveFields(savingsGoal)
            }
        });

    } catch (error) {
        console.error('❌ Create savings goal error:', error);
        console.error('Error stack:', error.stack);

        let errorMessage = 'Failed to create savings goal';

        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(e => e.message).join(', ');
        } else if (error.code === 11000) {
            errorMessage = 'Duplicate goal detected';
        }

        res.status(500).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all savings goals
const getAllGoals = async (req, res) => {
    try {
        const goals = await SavingsGoal.find({ userId: req.userId, isActive: true });

        res.json({
            success: true,
            goals: goals.map(g => ({
                id: g._id,
                name: g.name,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
                targetDate: g.targetDate,
                progress: g.progress,
                ...calculatePredictiveFields(g)
            })),
            count: goals.length
        });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch goals' });
    }
};

// Add amount to a savings goal
const addAmount = async (req, res) => {
    try {
        const goalId = req.params.id;

        if (!isValidObjectId(goalId)) {
            return res.status(400).json({ success: false, message: 'Invalid goal ID format' });
        }

        const amount = parseFloat(req.body?.amount);

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        const goal = await SavingsGoal.findOneAndUpdate(
            { _id: goalId, userId: req.userId, isActive: true },
            [
                {
                    $set: {
                        currentAmount: {
                            $min: [
                                "$targetAmount",
                                { $add: ["$currentAmount", amount] }
                            ]
                        }
                    }
                }
            ],
            { new: true }
        );

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Goal not found'
            });
        }

        res.json({
            success: true,
            message: 'Amount added successfully',
            goal: {
                id: goal._id,
                name: goal.name,
                targetAmount: goal.targetAmount,
                currentAmount: goal.currentAmount,
                targetDate: goal.targetDate,
                progress: goal.progress,
                category: goal.category,
                isActive: goal.isActive,
                ...calculatePredictiveFields(goal)
            }
        });
    } catch (error) {
        console.error('Add amount error:', error);
        res.status(500).json({ success: false, message: 'Failed to add amount' });
    }
};

module.exports = {
    createGoal,
    getAllGoals,
    addAmount
};
