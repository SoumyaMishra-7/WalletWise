const Transaction = require('../models/Transactions');

// Add Transaction
const addTransaction = async (req, res) => {
    try {
        const userId = req.userId;
        const { type, amount, category, description, paymentMethod, mood } = req.body;

        if (!type || !amount || !category) {
            return res.status(400).json({
                success: false,
                message: 'Type, amount, and category are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        const transaction = new Transaction({
            userId,
            type,
            amount,
            category,
            description,
            paymentMethod: paymentMethod || 'cash',
            mood: mood || 'neutral'
        });

        await transaction.save();

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

module.exports = {
    addTransaction,
    getAllTransactions
};
