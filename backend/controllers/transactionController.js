const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const User = require('../models/User');

// Helper to handle transaction cleanup
const withTransaction = async (operation) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const result = await operation(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// Add Transaction
const addTransaction = async (req, res) => {
    try {
        const userId = req.userId;
        const { type, amount, category, description, paymentMethod, mood, date } = req.body;

        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        if (!type || amount === undefined || amount === null || !category) {
            return res.status(400).json({ success: false, message: 'Type, amount, and category are required' });
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a valid number greater than 0' });
        }

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Type must be either income or expense' });
        }

        await withTransaction(async (session) => {
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

            await transaction.save({ session });

            // Update user wallet balance atomically
            const balanceChange = type === 'income' ? numericAmount : -numericAmount;
            await User.findByIdAndUpdate(userId, {
                $inc: { walletBalance: balanceChange }
            }, { session });

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
        });

    } catch (error) {
        console.error('Add transaction error:', error);

        // Handle "Transaction numbers are only allowed on a replica set" error for local dev
        if (error.message && error.message.includes('Transaction numbers are only allowed on a replica set')) {
            return res.status(500).json({
                success: false,
                message: 'Database configuration error: Transactions require a Replica Set (Atlas or local-rs).'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors || {}).map((e) => ({ field: e.path, message: e.message }))
            });
        }

        // Avoid double-sending headers if response already sent inside transaction (rare but possible)
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Error adding transaction' });
        }
    }
};

// Get all transactions (Read-only, no transaction needed unless we want snapshot isolation)
const getAllTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const transactions = await Transaction.find({ userId }).sort({ date: -1 });

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
        res.status(500).json({ success: false, message: 'Error fetching transactions' });
    }
};

// Update transaction
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { type, amount, category, description, paymentMethod, mood, date } = req.body;

        await withTransaction(async (session) => {
            const oldTransaction = await Transaction.findOne({ _id: id, userId }).session(session);
            if (!oldTransaction) {
                // Throwing error inside transaction to abort
                const err = new Error('Transaction not found');
                err.status = 404;
                throw err;
            }

            if (amount !== undefined && Number(amount) <= 0) {
                const err = new Error('Amount must be greater than 0');
                err.status = 400;
                throw err;
            }

            let balanceChange = 0;

            // Revert old effect
            if (oldTransaction.type === 'income') {
                balanceChange -= oldTransaction.amount;
            } else {
                balanceChange += oldTransaction.amount;
            }

            const newType = type || oldTransaction.type;
            const newAmount = amount !== undefined ? Number(amount) : oldTransaction.amount;

            // Apply new effect
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

            await oldTransaction.save({ session });

            if (balanceChange !== 0) {
                await User.findByIdAndUpdate(userId, {
                    $inc: { walletBalance: balanceChange }
                }, { session });
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
        });

    } catch (error) {
        console.error('Update transaction error:', error);
        if (!res.headersSent) {
            res.status(error.status || 500).json({ success: false, message: error.message || 'Error updating transaction' });
        }
    }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        await withTransaction(async (session) => {
            const transaction = await Transaction.findOneAndDelete({ _id: id, userId }).session(session);

            if (!transaction) {
                const err = new Error('Transaction not found');
                err.status = 404;
                throw err;
            }

            // Revert transaction effect on balance
            const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;

            await User.findByIdAndUpdate(userId, {
                $inc: { walletBalance: balanceChange }
            }, { session });

            res.json({
                success: true,
                message: 'Transaction deleted successfully'
            });
        });

    } catch (error) {
        console.error('Delete transaction error:', error);
        if (!res.headersSent) {
            res.status(error.status || 500).json({ success: false, message: error.message || 'Error deleting transaction' });
        }
    }
};

module.exports = {
    addTransaction,
    getAllTransactions,
    updateTransaction,
    deleteTransaction
};
