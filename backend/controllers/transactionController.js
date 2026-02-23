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
    recurringInterval
});

        // Duplicate Detection
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
                message: "A similar transaction was recently added."
            });
        }

        await withTransaction(async (session) => {
            if (isRecurring && recurringInterval) {
                const now = new Date();
                if (recurringInterval === "daily") now.setDate(now.getDate() + 1);
                else if (recurringInterval === "weekly") now.setDate(now.getDate() + 7);
                else if (recurringInterval === "monthly") now.setMonth(now.getMonth() + 1);
                transaction.nextExecutionDate = now;
            }

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
                transaction
            });
        });

    } catch (error) {
        console.error('Add transaction error:', error);

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
            limit = 10,
            cursor,
            type,
            startDate,
            endDate,
            search
        } = req.query;

        const query = { userId };
        // Recurring transactions are now processed by the dedicated centralized worker (worker.js)
        // Apply filters
        if (type && type !== 'all') {
            query.type = type;
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        if (search) {
            const { escapeRegex } = require('../utils/helpers');
            const safeSearch = escapeRegex(search);
            const searchRegex = new RegExp(safeSearch, 'i');
            query.$or = [
                { description: searchRegex },
                { category: searchRegex }
            ];
        }

        // Cursor logic
        const mongoose = require("mongoose");

if (cursor) {
    if (!mongoose.Types.ObjectId.isValid(cursor)) {
        return res.status(400).json({
            success: false,
            message: "Invalid cursor"
        });
    }

    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
}

        const transactions = await Transaction.find(query)
            .sort({ _id: -1 })
            .limit(parseInt(limit));

        let nextCursor = null;

        if (transactions.length === parseInt(limit)) {
            nextCursor = transactions[transactions.length - 1]._id;
        }

        res.json({
            success: true,
            transactions,
            pagination: {
                nextCursor,
                limit: parseInt(limit)
            }
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

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID format' });
        }
const oldTransaction = await Transaction.findOne({ _id: id, userId });

if (!oldTransaction) {
    return res.status(404).json({
        success: false,
        message: 'Transaction not found'
    });
}

const parsed = transactionSchema.partial().safeParse(req.body);

if (!parsed.success) {
    return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || 'Invalid input'
    });
}

const updateData = parsed.data;

Object.assign(oldTransaction, updateData);

await oldTransaction.save();

res.json({
    success: true,
    message: 'Transaction updated successfully',
    transaction: oldTransaction
});
       
    } catch (error) {
        console.error('Update transaction error:', error);
        if (!res.headersSent) {
            res.status(error.status || 500).json({ success: false, message: error.message || 'Error updating transaction' });
        }
    }
};

const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid transaction ID format'
            });
        }

        const transaction = await Transaction.findOneAndDelete({
            _id: id,
            userId
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // revert wallet balance
        const balanceChange =
            transaction.type === 'income'
                ? -transaction.amount
                : transaction.amount;

        await User.findByIdAndUpdate(userId, {
            $inc: { walletBalance: balanceChange }
        });

        res.json({
            success: true,
            message: 'Transaction deleted successfully',
            deletedTransaction: transaction
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

const skipNextOccurrence = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID format' });
        }

        const transaction = await Transaction.findOne({ _id: id, userId });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (!transaction.isRecurring || !transaction.nextExecutionDate) {
            return res.status(400).json({ success: false, message: 'Transaction is not recurring or has no next execution date' });
        }

        // Calculate the next occurrence date
        const currentNextDate = new Date(transaction.nextExecutionDate);
        let updatedNextDate = new Date(currentNextDate);

        if (transaction.recurringInterval === "daily") {
            updatedNextDate.setDate(updatedNextDate.getDate() + 1);
        } else if (transaction.recurringInterval === "weekly") {
            updatedNextDate.setDate(updatedNextDate.getDate() + 7);
        } else if (transaction.recurringInterval === "monthly") {
            updatedNextDate.setMonth(updatedNextDate.getMonth() + 1);
        }

        transaction.nextExecutionDate = updatedNextDate;
        await transaction.save();

        res.json({
            success: true,
            message: 'Next occurrence skipped successfully',
            newNextExecutionDate: transaction.nextExecutionDate
        });

    } catch (error) {
        console.error('Skip next occurrence error:', error);
        res.status(500).json({
            success: false,
            message: 'Error skipping next occurrence'
        });
    }
};

const undoTransaction = async (req, res) => {
    try {
        const userId = req.userId;
        const { deletedTransaction } = req.body;

        if (!deletedTransaction) {
            return res.status(400).json({
                success: false,
                message: 'No transaction data provided for undo'
            });
        }

        // Restore transaction
        const restored = new Transaction({
            userId,
            type: deletedTransaction.type,
            amount: deletedTransaction.amount,
            category: deletedTransaction.category,
            description: deletedTransaction.description,
            paymentMethod: deletedTransaction.paymentMethod,
            mood: deletedTransaction.mood,
            date: deletedTransaction.date || new Date()
        });

        await restored.save();

        // Restore wallet balance
        const balanceChange =
            restored.type === 'income'
                ? restored.amount
                : -restored.amount;

        await User.findByIdAndUpdate(userId, {
            $inc: { walletBalance: balanceChange }
        });

        res.json({
            success: true,
            message: 'Transaction restored successfully',
            transaction: restored
        });

    } catch (error) {
        console.error('Undo transaction error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
   addTransaction,
   getAllTransactions,
   updateTransaction,
   deleteTransaction,
   undoTransaction,
   skipNextOccurrence
};