const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const User = require('../models/User');
const { isValidObjectId } = require('../utils/validation');

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

        const {
            type,
            amount,
            category,
            description,
            paymentMethod,
            mood,
            date,
            isRecurring,
            recurringInterval
        } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
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
        // ===== Duplicate Detection =====

        // configurable time window (24 hours)
        const duplicateWindow = 24 * 60 * 60 * 1000;
        const sinceDate = new Date(Date.now() - duplicateWindow);

        // find similar transactions
        const possibleDuplicate = await Transaction.findOne({
            userId,
            type,
            amount: numericAmount,
            category: typeof category === 'string'
                ? category.trim().toLowerCase()
                : category,
            date: { $gte: sinceDate }
        });

        if (possibleDuplicate) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                message: "A similar transaction was recently added. Do you still want to continue?"
            });
        }
        let nextExecutionDate = null;

if (isRecurring && recurringInterval) {
    const now = new Date();

    if (recurringInterval === "daily") now.setDate(now.getDate() + 1);
    else if (recurringInterval === "weekly") now.setDate(now.getDate() + 7);
    else if (recurringInterval === "monthly") now.setMonth(now.getMonth() + 1);

    nextExecutionDate = now;
}

const transaction = new Transaction({
    userId,
    type,
    amount: numericAmount,
    category: typeof category === 'string' ? category.trim().toLowerCase() : category,
    description: typeof description === 'string' ? description.trim() : description,
    paymentMethod: paymentMethod || 'cash',
    mood: mood || 'neutral',
    ...(date ? { date } : {}),
    isRecurring: isRecurring || false,
    recurringInterval: recurringInterval || null,
    nextExecutionDate
});

await transaction.save();

// update wallet
const balanceChange = type === 'income' ? numericAmount : -numericAmount;

await User.findByIdAndUpdate(userId, {
    $inc: { walletBalance: balanceChange }
});

res.status(201).json({
    success: true,
    message: 'Transaction added successfully',
    transaction
});

    } catch (error) {
        console.error('Add transaction error:', error);

        if (
            error.message &&
            error.message.includes('Transaction numbers are only allowed on a replica set')
        ) {
            return res.status(500).json({
                success: false,
                message:
                    'Database configuration error: Transactions require a Replica Set.'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error'
            });
        }

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error adding transaction'
            });
        }
    }
};



// Get all transactions with pagination and filtering
const getAllTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            page = 1,
            limit = 10,
            search,
            type,
            startDate,
            endDate,
            sort = 'newest'
        } = req.query;

        const query = { userId };
        // ===== Process recurring transactions =====
const recurringTransactions = await Transaction.find({
    userId,
    isRecurring: true,
    nextExecutionDate: { $lte: new Date() }
});

for (const rt of recurringTransactions) {
    const newTransaction = new Transaction({
        userId: rt.userId,
        type: rt.type,
        amount: rt.amount,
        category: rt.category,
        description: rt.description,
        paymentMethod: rt.paymentMethod,
        mood: rt.mood,
        date: new Date()
    });

    await newTransaction.save();

    // Update next execution date
    let nextDate = new Date(rt.nextExecutionDate);

    if (rt.recurringInterval === "daily") {
        nextDate.setDate(nextDate.getDate() + 1);
    } else if (rt.recurringInterval === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
    } else if (rt.recurringInterval === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    rt.nextExecutionDate = nextDate;
    await rt.save();
}


        // Apply filters
        if (type && type !== 'all') {
            query.type = type;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { description: searchRegex },
                { category: searchRegex }
            ];
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Determine sort order
        let sortOptions = { date: -1 }; // Default new to old
        if (sort === 'oldest') sortOptions = { date: 1 };
        else if (sort === 'amount-high') sortOptions = { amount: -1 };
        else if (sort === 'amount-low') sortOptions = { amount: 1 };

        // Execute query
        const transactions = await Transaction.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        const totalOptions = await Transaction.countDocuments(query);

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
                mood: t.mood,
                isRecurring: t.isRecurring,
                recurringInterval: t.recurringInterval
            })),
            pagination: {
                total: totalOptions,
                page: pageNum,
                pages: Math.ceil(totalOptions / limitNum),
                limit: limitNum
            }
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

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID format' });
        }

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

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID format' });
        }

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
