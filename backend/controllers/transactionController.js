const Transaction = require('../models/Transactions');
const User = require('../models/User');

// Add Transaction
const addTransaction = async (req, res) => {
    try {
        const userId = req.userId;
        const { type, amount, category, description, paymentMethod, mood, date } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        if (!type || amount === undefined || amount === null || !category) {
            return res.status(400).json({
                success: false,
                message: 'Type, amount, and category are required'
            });
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a valid number greater than 0'
            });
        }

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either income or expense'
            });
        }

        const transaction = new Transaction({
            userId,
            type,
            amount: numericAmount,
            category: typeof category === 'string' ? category.trim().toLowerCase() : category,
            description: typeof description === 'string' ? description.trim() : description,
            paymentMethod: paymentMethod || 'cash',
            mood: mood || 'neutral',
            ...(date ? { date } : {})
        });

        await transaction.save();

        // Update user wallet balance atomically
        const balanceChange = type === 'income' ? numericAmount : -numericAmount;
        await User.findByIdAndUpdate(userId, {
            $inc: { walletBalance: balanceChange }
        });

        res.status(201).json({
            success: true,
            message: 'Transaction added successfully',
            transaction: {
                id: transaction._id,
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                description: transaction.description,
                date: transaction.date,
                paymentMethod: transaction.paymentMethod,
                mood: transaction.mood
            }
        });

    } catch (error) {
        console.error('Add transaction error:', error);

        if (error?.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors || {}).map((e) => ({
                    field: e?.path,
                    message: e?.message
                }))
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error adding transaction'
        });
    }
};

// Get all transactions
const getAllTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const transactions = await Transaction.find({ userId })
            .sort({ date: -1 });

        res.json({
            success: true,
            transactions: transactions.map(t => ({
                id: t._id,
                type: t.type,
                amount: t.amount,
                category: t.category,
                description: t.description,
                date: t.date,
                paymentMethod: t.paymentMethod,
                mood: t.mood
            }))
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transactions'
        });
    }
};

// Update transaction
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { type, amount, category, description, paymentMethod, mood, date } = req.body;

        const oldTransaction = await Transaction.findOne({ _id: id, userId });
        if (!oldTransaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (amount !== undefined && Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        }

        let balanceChange = 0;

        if (oldTransaction.type === 'income') {
            balanceChange -= oldTransaction.amount;
        } else {
            balanceChange += oldTransaction.amount;
        }

        const newType = type || oldTransaction.type;
        const newAmount = amount !== undefined ? Number(amount) : oldTransaction.amount;

        if (newType === 'income') {
            balanceChange += newAmount;
        } else {
            balanceChange -= newAmount;
        }

        oldTransaction.type = newType;
        oldTransaction.amount = newAmount;
        oldTransaction.category = category || oldTransaction.category;
        oldTransaction.description = description !== undefined ? description : oldTransaction.description;
        oldTransaction.paymentMethod = paymentMethod || oldTransaction.paymentMethod;
        oldTransaction.mood = mood || oldTransaction.mood;
        if (date) oldTransaction.date = date;

        await oldTransaction.save();

        if (balanceChange !== 0) {
            await User.findByIdAndUpdate(userId, {
                $inc: { walletBalance: balanceChange }
            });
        }

        res.json({
            success: true,
            message: 'Transaction updated successfully',
            transaction: {
                id: oldTransaction._id,
                type: oldTransaction.type,
                amount: oldTransaction.amount,
                category: oldTransaction.category,
                description: oldTransaction.description,
                date: oldTransaction.date,
                paymentMethod: oldTransaction.paymentMethod,
                mood: oldTransaction.mood
            }
        });

    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ success: false, message: 'Error updating transaction' });
    }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const transaction = await Transaction.findOneAndDelete({ _id: id, userId });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Revert transaction effect on balance
        const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;

        await User.findByIdAndUpdate(userId, {
            $inc: { walletBalance: balanceChange }
        });

        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });

    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting transaction'
        });
    }
};

module.exports = {
    addTransaction,
    getAllTransactions,
    updateTransaction,
    deleteTransaction
};
