const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const User = require('../models/User');
const { z } = require('zod');
const { isValidObjectId } = require('../utils/validation');
const logTransactionActivity = require("../utils/activityLogger");
const TransactionActivity = require("../models/TransactionActivity");
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { escapeRegex } = require('../utils/helpers');

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
  isEncrypted: z.boolean().optional().default(false),
  encryptedData: z.string().nullable().optional()
});

const withTransaction = async (operation) => {
  // Local development fallback (no MongoDB replica set)
  return await operation(null);
};

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
    isEncrypted,
    encryptedData
  } = parsed.data;

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
      isEncrypted,
      encryptedData
    });

    await transaction.save({ session });

    // Update wallet balance
    const balanceChange = type === 'income' ? amount : -amount;
    await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: balanceChange } },
      { session }
    );

    // Log Activity
    await logTransactionActivity({
      userId,
      transactionId: transaction._id,
      action: "CREATED"
    });

    return transaction;
  });

  return res.status(201).json({
    success: true,
    message: 'Transaction added successfully',
    transaction: result
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
    sort = 'newest'
  } = req.query;

  const query = { userId };

  // Process recurring transactions
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

    await logTransactionActivity({
      userId,
      transactionId: newTransaction._id,
      action: "CREATED"
    });

    // Update next execution date
    let nextDate = new Date(rt.nextExecutionDate);
    if (rt.recurringInterval === "daily") nextDate.setDate(nextDate.getDate() + 1);
    else if (rt.recurringInterval === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    else if (rt.recurringInterval === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);

    rt.nextExecutionDate = nextDate;
    await rt.save();
  }

  // Filters
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
    const regex = new RegExp(search, 'i');
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

// ================= UPDATE TRANSACTION =================
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
  Object.assign(oldTransaction, updateData);

  await oldTransaction.save();

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

// ================= DELETE TRANSACTION =================
const deleteTransaction = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!isValidObjectId(id)) {
    throw new AppError('Invalid transaction ID format', 400);
  }

  const transaction = await Transaction.findOneAndDelete({ _id: id, userId });

  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }

  const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;

  await User.findByIdAndUpdate(userId, {
    $inc: { walletBalance: balanceChange }
  });

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

  if (!transaction) {
    throw new AppError('Transaction not found', 404);
  }

  if (!transaction.isRecurring || !transaction.nextExecutionDate) {
    throw new AppError('Transaction is not recurring or has no next execution date', 400);
  }

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
});

// ================= UNDO TRANSACTION =================
const undoTransaction = catchAsync(async (req, res) => {
  const userId = req.userId;
  const { deletedTransaction } = req.body;

  if (!deletedTransaction) {
    throw new AppError('No transaction data provided for undo', 400);
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

  await restored.save();

  await logTransactionActivity({
    userId,
    transactionId: restored._id,
    action: "RESTORED"
  });

  const balanceChange = restored.type === 'income' ? restored.amount : -restored.amount;

  await User.findByIdAndUpdate(userId, {
    $inc: { walletBalance: balanceChange }
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

module.exports = {
  addTransaction,
  getAllTransactions,
  updateTransaction,
  deleteTransaction,
  undoTransaction,
  skipNextOccurrence,
  getTransactionActivity
};