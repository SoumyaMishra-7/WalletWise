const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

const STRICT_MODE = process.env.STRICT_WALLET_BALANCE === "true";
const { z } = require('zod');
const { isValidObjectId } = require('../utils/validation');
const logTransactionActivity = require("../utils/activityLogger");
const TransactionActivity = require("../models/TransactionActivity");
const { processEvent } = require("../utils/gamificationEngine");
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const gamification = require('../utils/gamification');
const { escapeRegex } = require('../utils/helpers');
const { processDueRecurringTransactions } = require('../services/RecurringTransactionService');

// Local development fallback (no MongoDB replica set)
const withTransaction = async (operation) => {
  return await operation(null);
};

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? Number(val) : val),
    z.number().finite().positive("Amount must be greater than 0")
  ),
  category: z.string().trim().min(1, "Category is required").toLowerCase(),
  description: z.string().trim().optional().default(''),
  paymentMethod: z.string().trim().optional().default('cash'),
  mood: z.string().trim().optional().default('neutral'),
  date: z.preprocess(
    (val) => (val ? new Date(val) : undefined),
    z.date().optional()
  ),
  isRecurring: z.boolean().optional().default(false),
  recurringInterval: z.enum(['daily', 'weekly', 'monthly']).nullable().optional(),
  walletId: z.string().nullable().optional(),
  isEncrypted: z.boolean().optional().default(false),
  encryptedData: z.string().nullable().optional()
});

// ================= ADD TRANSACTION =================
const addTransaction = catchAsync(async (req, res, next) => {
  const userId = req.userId;

  if (!userId) {
    return next(new AppError('Unauthorized', 401));
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
    recurringInterval,
    walletId,
    isEncrypted,
    encryptedData
  } = parsed.data;

  if (walletId) {
    if (!isValidObjectId(walletId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet ID format'
      });
    }

    const wallet = await Wallet.findOne({
      _id: walletId,
      'members.user': userId
    });

    if (!wallet) {
      return res.status(403).json({
        success: false,
        message: 'Wallet not found or access denied'
      });
    }
  }

  // Duplicate Detection (24 hour window)
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

  const result = await withTransaction(async (session) => {
    let nextExecutionDate = null;

    if (isRecurring && recurringInterval) {
      const now = new Date();
      if (recurringInterval === "daily") now.setDate(now.getDate() + 1);
      else if (recurringInterval === "weekly") now.setDate(now.getDate() + 7);
      else if (recurringInterval === "monthly") now.setMonth(now.getMonth() + 1);
      nextExecutionDate = now;
    }

    const balanceChange = type === 'income' ? amount : -amount;

    if (walletId) {
      // Conditional atomic update
      const query = { _id: walletId };
      if (STRICT_MODE && balanceChange < 0) {
        query.balance = { $gte: Math.abs(balanceChange) };
      }
      
      const updatedWallet = await require('../models/Wallet').findOneAndUpdate(
        query,
        { $inc: { balance: balanceChange } },
        { session, new: true }
      );

      if (!updatedWallet) {
        throw new AppError('Insufficient funds in shared wallet or wallet not found', 400);
      }
    } else {
      const query = { _id: userId };
      if (STRICT_MODE && balanceChange < 0) {
        query.walletBalance = { $gte: Math.abs(balanceChange) };
      }

      const updatedUser = await User.findOneAndUpdate(
        query,
        { $inc: { walletBalance: balanceChange } },
        { session, new: true }
      );

      if (!updatedUser) {
        throw new AppError('Insufficient personal funds or user not found', 400);
      }
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
      nextExecutionDate,
      walletId: walletId || null,
      paidBy: walletId ? userId : null,
      isEncrypted,
      encryptedData
    });

    try {
      await transaction.save({ session });
    } catch (error) {
      // Revert the balance change applied above if the write fails
      if (walletId) {
        await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -balanceChange } }, { session });
      } else {
        await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -balanceChange } }, { session });
      }
      throw error;
    }

    // Log Activity
    await logTransactionActivity({
      userId,
      transactionId: transaction._id,
      action: "CREATED"
    });

    // Gamification Hook
    const gamificationResult = await gamification.recordUserActivity(userId);
    let badgeAwarded = null;

    // Check for "First Transaction" badge
    const count = await Transaction.countDocuments({ userId });
    if (count === 1) {
      badgeAwarded = await gamification.awardBadge(userId, 'FIRST_TRANSACTION');
    }

    return { transaction, gamificationResult, badgeAwarded };
  });

  return res.status(201).json({
    success: true,
    message: 'Transaction added successfully',
    transaction: result.transaction,
    gamification: {
      activity: result.gamificationResult,
      badge: result.badgeAwarded
    }
  });
});

// ================= GET ALL TRANSACTIONS =================
const getAllTransactions = catchAsync(async (req, res) => {
  const userId = req.userId;

  const {
    page = 1,
    limit = 10,
    search,
    type,
    startDate,
    endDate,
    sort = 'newest',
    walletId
  } = req.query;

  const query = {};
  if (walletId) {
    query.walletId = walletId;
  } else {
    query.userId = userId;
    query.walletId = null; // Only personal transactions
  }

  // Recurring transactions used to be executed right here, inside this read.
  // That is handled by the background worker instead; see
  // services/RecurringTransactionService.js and the process-recurring route.

  if (type && type !== 'all') query.type = type;

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
    // Escape regex metacharacters so user input is treated as a literal
    // substring, preventing regex-injection and ReDoS via crafted patterns.
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    query.$or = [{ description: regex }, { category: regex }];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  let sortOptions = { date: -1 };
  if (sort === 'oldest') sortOptions = { date: 1 };
  else if (sort === 'amount-high') sortOptions = { amount: -1 };
  else if (sort === 'amount-low') sortOptions = { amount: 1 };

  const transactions = await Transaction.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const total = await Transaction.countDocuments(query);

  res.json({
    success: true,
    transactions,
    pagination: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum
    }
  });
});

// ================= UPDATE =================
const updateTransaction = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!isValidObjectId(id)) {
    throw new AppError('Invalid transaction ID format', 400);
  }

  const oldTransaction = await Transaction.findOne({ _id: id, userId });

  if (!oldTransaction) {
    throw new AppError('Transaction not found', 404);
  }

  const parsed = transactionSchema.partial().safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400);
  }

  const updateData = parsed.data;

  // Compute old contribution to wallet balance before mutating the document
  const oldBalanceEffect = oldTransaction.type === 'income'
    ? oldTransaction.amount
    : -oldTransaction.amount;

  Object.assign(oldTransaction, updateData);
  await oldTransaction.save();

  // Recompute new balance effect and apply the difference
  const newBalanceEffect = oldTransaction.type === 'income'
    ? oldTransaction.amount
    : -oldTransaction.amount;

  const balanceDelta = newBalanceEffect - oldBalanceEffect;

  if (balanceDelta !== 0) {
    if (oldTransaction.walletId) {
      const Wallet = require('../models/Wallet');
      await Wallet.findByIdAndUpdate(oldTransaction.walletId, { $inc: { balance: balanceDelta } });
    } else {
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: balanceDelta } });
    }
  }

  await logTransactionActivity({
    userId,
    transactionId: oldTransaction._id,
    action: "UPDATED",
    changes: updateData
  });

  res.json({
    success: true,
    message: 'Transaction updated successfully',
    transaction: oldTransaction
  });
});

// ================= DELETE =================
const deleteTransaction = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!isValidObjectId(id)) {
    throw new AppError('Invalid transaction ID format', 400);
  }

  const transaction = await Transaction.findOne({ _id: id, userId });

  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }

  const balanceChange =
    transaction.type === 'income'
      ? -transaction.amount
      : transaction.amount;

  if (transaction.walletId) {
    const query = { _id: transaction.walletId };
    if (STRICT_MODE && balanceChange < 0) {
      query.balance = { $gte: Math.abs(balanceChange) };
    }
    const updatedWallet = await Wallet.findOneAndUpdate(query, {
      $inc: { balance: balanceChange }
    });
    if (!updatedWallet) {
      throw new AppError('Cannot delete income transaction: Insufficient funds in shared wallet to cover deduction', 400);
    }
  } else {
    const query = { _id: userId };
    if (STRICT_MODE && balanceChange < 0) {
      query.walletBalance = { $gte: Math.abs(balanceChange) };
    }
    const updatedUser = await User.findOneAndUpdate(query, {
      $inc: { walletBalance: balanceChange }
    });
    if (!updatedUser) {
      throw new AppError('Cannot delete income transaction: Insufficient personal funds to cover deduction', 400);
    }
  }

  try {
    await Transaction.findByIdAndDelete(id);
  } catch(e) {
    // revert
    if (transaction.walletId) {
      await require('../models/Wallet').findByIdAndUpdate(transaction.walletId, { $inc: { balance: -balanceChange } });
    } else {
      await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -balanceChange } });
    }
    throw e;
  }

  await logTransactionActivity({
    userId,
    transactionId: transaction._id,
    action: "DELETED"
  });

  res.json({
    success: true,
    message: 'Transaction deleted successfully',
    deletedTransaction: transaction
  });
});

// ================= SKIP OCCURRENCE =================
const skipNextOccurrence = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!isValidObjectId(id)) {
    throw new AppError('Invalid transaction ID format', 400);
  }

  const transaction = await Transaction.findOne({ _id: id, userId });

  if (!transaction || !transaction.isRecurring || !transaction.nextExecutionDate) {
    throw new AppError('Transaction is not recurring or has no next execution date', 400);
  }

  let updatedNextDate = new Date(transaction.nextExecutionDate);

  if (transaction.recurringInterval === "daily")
    updatedNextDate.setDate(updatedNextDate.getDate() + 1);
  else if (transaction.recurringInterval === "weekly")
    updatedNextDate.setDate(updatedNextDate.getDate() + 7);
  else if (transaction.recurringInterval === "monthly")
    updatedNextDate.setMonth(updatedNextDate.getMonth() + 1);

  transaction.nextExecutionDate = updatedNextDate;
  await transaction.save();

  res.json({
    success: true,
    message: 'Next occurrence skipped successfully',
    newNextExecutionDate: updatedNextDate
  });
});

// ================= UNDO TRANSACTION =================
const undoTransaction = catchAsync(async (req, res) => {
  const userId = req.userId;
  const { deletedTransaction } = req.body;

  if (!deletedTransaction) {
    throw new AppError('No transaction data provided for undo', 400);
  }

  const balanceChange =
    deletedTransaction.type === 'income'
      ? deletedTransaction.amount
      : -deletedTransaction.amount;

  const query = { _id: userId };
  if (STRICT_MODE && balanceChange < 0) {
    query.walletBalance = { $gte: Math.abs(balanceChange) };
  }

  const updatedUser = await User.findOneAndUpdate(query, {
    $inc: { walletBalance: balanceChange }
  });

  if (!updatedUser) {
    throw new AppError('Cannot undo expense: Insufficient personal funds', 400);
  }

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

  try {
    await restored.save();
  } catch(e) {
    await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -balanceChange } });
    throw e;
  }

  await logTransactionActivity({
    userId,
    transactionId: restored._id,
    action: "RESTORED"
  });

  res.json({
    success: true,
    message: 'Transaction restored successfully',
    transaction: restored
  });
});

// ================= GET ACTIVITY =================
const getTransactionActivity = catchAsync(async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.userId;

  if (!isValidObjectId(transactionId)) {
    throw new AppError("Invalid transaction ID", 400);
  }

  const activities = await TransactionActivity.find({
    transactionId,
    userId
  }).sort({ timestamp: -1 });

  res.json({
    success: true,
    activities
  });
});

// ============ PROCESS RECURRING (explicit trigger) ============
// A dedicated write endpoint, so recurring transactions can still be flushed
// on demand without putting mutations inside a GET request.
const processRecurringNow = catchAsync(async (req, res) => {
  const { processed, failed } = await processDueRecurringTransactions({
    userId: req.userId
  });

  res.json({
    success: true,
    message: 'Recurring transactions processed',
    processed,
    failed
  });
});

module.exports = {
  addTransaction,
  getAllTransactions,
  processRecurringNow,
  updateTransaction,
  deleteTransaction,
  undoTransaction,
  skipNextOccurrence,
  getTransactionActivity
};
