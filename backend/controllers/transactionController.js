const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const User = require('../models/User');
const { z } = require('zod');
const { isValidObjectId } = require('../utils/validation');

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: "Type must be either 'income' or 'expense'" })
  }),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    z.number({ invalid_type_error: "Amount must be a number" })
     .finite()
     .positive("Amount must be greater than 0")
  ),
  category: z.string().trim().min(1, "Category is required").toLowerCase(),
  description: z.string().trim().optional().default(''),
  paymentMethod: z.string().trim().optional().default('cash'),
  mood: z.string().trim().optional().default('neutral'),
  date: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : new Date(val)),
    z.date().optional()
  ),
  isRecurring: z.boolean().optional().default(false),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly']).nullable().optional()
});

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

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const parsed = transactionSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: parsed.error.errors[0]?.message || 'Invalid input'
            });
        }

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
        } = parsed.data;

        // ===== Duplicate Detection =====
        const duplicateWindow = 24 * 60 * 60 * 1000;
        const sinceDate = new Date(Date.now() - duplicateWindow);

        const possibleDuplicate = await Transaction.findOne({
            userId,
            type,
            amount,
            category,
            date: { $gte: sinceDate }
        });

        if (possibleDuplicate) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                message: "A similar transaction was recently added. Do you still want to continue?"
            });
        }

        await withTransaction(async (session) => {

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
                amount,
                category,
                description,
                paymentMethod,
                mood,
                ...(date ? { date } : {}),
                isRecurring,
                recurringInterval,
                nextExecutionDate
            });

            await transaction.save({ session });

            const balanceChange = type === 'income' ? amount : -amount;

            await User.findByIdAndUpdate(
                userId,
                { $inc: { walletBalance: balanceChange } },
                { session }
            );

            return res.status(201).json({
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
                    mood: transaction.mood,
                    isRecurring: transaction.isRecurring,
                    recurringInterval: transaction.recurringInterval
                }
            });

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
                const err = new Error('Transaction not found');
                err.status = 404;
                throw err;
            }

            const parsed = transactionSchema.partial().safeParse(req.body);
            if (!parsed.success) {
                const err = new Error(parsed.error.errors[0]?.message || 'Invalid input');
                err.status = 400;
                throw err;
            }

            const updateData = parsed.data;
            let balanceChange = 0;

            // Revert old effect
            if (oldTransaction.type === 'income') {
                balanceChange -= oldTransaction.amount;
            } else {
                balanceChange += oldTransaction.amount;
            }

            const newType = updateData.type || oldTransaction.type;
            const newAmount = updateData.amount !== undefined ? updateData.amount : oldTransaction.amount;

            // Apply new effect
            if (newType === 'income') {
                balanceChange += newAmount;
            } else {
                balanceChange -= newAmount;
            }

            // Apply updates
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    oldTransaction[key] = updateData[key];
                }
            });

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
