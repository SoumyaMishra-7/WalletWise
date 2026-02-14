const SavingsGoal = require('../models/SavingGoal');

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
                progress: savingsGoal.progress
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
                progress: g.progress
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
        const amount = parseFloat(req.body?.amount);

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        const goal = await SavingsGoal.findOne({ _id: goalId, userId: req.userId, isActive: true });

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: 'Goal not found'
            });
        }

        const nextAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);
        goal.currentAmount = nextAmount;
        await goal.save();

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
                isActive: goal.isActive
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
