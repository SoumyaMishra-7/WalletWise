const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const User = require('../models/User');

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
const { getHistoricalRate, roundCurrency, BASE_CURRENCY } = require('../utils/currencyConverter');

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
  currency: z.string().trim().min(3).max(3).optional(),
  originalAmount: z.preprocess(
    (val) => (val !== undefined && val !== null && val !== '' ? Number(val) : undefined),
    z.number().finite().positive().optional()
  ),
  originalCurrency: z.string().trim().min(3).max(3).optional(),
  exchangeRate: z.preprocess(
    (val) => (val !== undefined && val !== null && val !== '' ? Number(val) : undefined),
    z.number().finite().positive().optional()
  ),
  baseAmount: z.preprocess(
    (val) => (val !== undefined && val !== null && val !== '' ? Number(val) : undefined),
    z.number().finite().positive().optional()
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
    currency,
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

  // Determine base currency: from wallet (if wallet transaction) or user's preference or system default
  let baseCurrency = BASE_CURRENCY;
  if (walletId) {
    const Wallet = require('../models/Wallet');
    const wallet = await Wallet.findById(walletId).select('currency');
    if (wallet && wallet.currency) {
      baseCurrency = wallet.currency.toUpperCase();
    }
  } else if (userId) {
    const user = await User.findById(userId).select('currency');
    if (user && user.currency) {
      baseCurrency = user.currency.toUpperCase();
    }
  }

  const txCurrency = (currency || baseCurrency).toUpperCase();
  const txDate = date || new Date();

  let exchangeRate = 1;
  let baseAmount = amount;

  if (txCurrency === baseCurrency) {
    exchangeRate = 1;
    baseAmount = roundCurrency(amount);
  } else {
    exchangeRate = await getHistoricalRate(txCurrency, baseCurrency, txDate);
    baseAmount = roundCurrency(amount * exchangeRate);
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

    const balanceChange = type === 'income' ? baseAmount : -baseAmount;

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
      currency: txCurrency,
      originalAmount: amount,
      originalCurrency: txCurrency,
      exchangeRate,
      baseAmount,
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
      // Revert balance on failure
      if (walletId) {
        await require('../models/Wallet').findByIdAndUpdate(walletId, { $inc: { balance: -balanceChange } }, { session });
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

  // Process recurring transactions
  // For simplicity, recurring transactions are currently bound to personal userId.
  // If we want recurring inside shared wallets, we'll need to expand this query.
  const recurringTransactions = await Transaction.find({
    userId,
    isRecurring: true,
    nextExecutionDate: { $lte: new Date() },
    walletId: null // Process only personal recurring transactions for now
  });

  for (const rt of recurringTransactions) {
    await withTransaction(async (session) => {
      const rtBaseAmount = rt.baseAmount !== undefined ? rt.baseAmount : rt.amount;
      const balanceChange = rt.type === 'income' ? rtBaseAmount : -rtBaseAmount;
      
      const query = { _id: rt.userId };
      if (STRICT_MODE && balanceChange < 0) {
        query.walletBalance = { $gte: Math.abs(balanceChange) };
      }

      const updatedUser = await User.findOneAndUpdate(
        query,
        { $inc: { walletBalance: balanceChange } },
        { session, new: true }
      );

      if (!updatedUser) {
        // Skip this recurrence due to insufficient funds
        throw new AppError('Insufficient personal funds to process recurring transaction', 400);
      }

      const newTransaction = new Transaction({
        userId: rt.userId,
        type: rt.type,
        amount: rt.amount,
        currency: rt.currency || 'USD',
        originalAmount: rt.originalAmount !== undefined ? rt.originalAmount : rt.amount,
        originalCurrency: rt.originalCurrency || rt.currency || 'USD',
        exchangeRate: rt.exchangeRate !== undefined ? rt.exchangeRate : 1,
        baseAmount: rtBaseAmount,
        category: rt.category,
        description: rt.description,
        paymentMethod: rt.paymentMethod,
        mood: rt.mood,
        date: new Date()
      });

      try {
        await newTransaction.save({ session });
      } catch (error) {
        // Revert balance change
        await User.findByIdAndUpdate(rt.userId, { $inc: { walletBalance: -balanceChange } }, { session });
        throw error;
      }

      await logTransactionActivity({
        userId: rt.userId,
        transactionId: newTransaction._id,
        action: "CREATED"
      });

      let nextDate = new Date(rt.nextExecutionDate);

      if (rt.recurringInterval === "daily") nextDate.setDate(nextDate.getDate() + 1);
      else if (rt.recurringInterval === "weekly") nextDate.setDate(nextDate.getDate() + 7);
      else if (rt.recurringInterval === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);

      rt.nextExecutionDate = nextDate;
      await rt.save({ session });
    });
  }

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

  // Determine base currency
  let baseCurrency = BASE_CURRENCY;
  if (oldTransaction.walletId) {
    const Wallet = require('../models/Wallet');
    const wallet = await Wallet.findById(oldTransaction.walletId).select('currency');
    if (wallet && wallet.currency) baseCurrency = wallet.currency.toUpperCase();
  } else {
    const user = await User.findById(userId).select('currency');
    if (user && user.currency) baseCurrency = user.currency.toUpperCase();
  }

  const newAmount = updateData.amount !== undefined ? updateData.amount : oldTransaction.amount;
  const newCurrency = (updateData.currency || oldTransaction.currency || baseCurrency).toUpperCase();
  const newDate = updateData.date !== undefined ? updateData.date : oldTransaction.date;
  const newType = updateData.type || oldTransaction.type;

  let newExchangeRate = oldTransaction.exchangeRate !== undefined ? oldTransaction.exchangeRate : 1;
  let newBaseAmount = oldTransaction.baseAmount !== undefined ? oldTransaction.baseAmount : oldTransaction.amount;

  const oldDateStr = oldTransaction.date ? new Date(oldTransaction.date).toISOString().split('T')[0] : '';
  const newDateStr = newDate ? new Date(newDate).toISOString().split('T')[0] : '';
  const currencyChanged = updateData.currency && updateData.currency.toUpperCase() !== (oldTransaction.currency || '').toUpperCase();
  const dateChanged = updateData.date && newDateStr !== oldDateStr;
  const amountChanged = updateData.amount !== undefined && updateData.amount !== oldTransaction.amount;

  if (currencyChanged || dateChanged) {
    if (newCurrency === baseCurrency) {
      newExchangeRate = 1;
      newBaseAmount = roundCurrency(newAmount);
    } else {
      newExchangeRate = await getHistoricalRate(newCurrency, baseCurrency, newDate);
      newBaseAmount = roundCurrency(newAmount * newExchangeRate);
    }
  } else if (amountChanged) {
    // Retain snapshot exchange rate if amount changed without currency or date changes
    newBaseAmount = roundCurrency(newAmount * newExchangeRate);
  }

  updateData.currency = newCurrency;
  updateData.originalCurrency = newCurrency;
  updateData.originalAmount = newAmount;
  updateData.exchangeRate = newExchangeRate;
  updateData.baseAmount = newBaseAmount;

  // Adjust balance by net difference
  const oldBase = oldTransaction.baseAmount !== undefined ? oldTransaction.baseAmount : oldTransaction.amount;
  const oldBalanceEffect = oldTransaction.type === 'income' ? oldBase : -oldBase;
  const newBalanceEffect = newType === 'income' ? newBaseAmount : -newBaseAmount;
  const balanceDelta = newBalanceEffect - oldBalanceEffect;

  if (balanceDelta !== 0) {
    if (oldTransaction.walletId) {
      const query = { _id: oldTransaction.walletId };
      if (STRICT_MODE && balanceDelta < 0) {
        query.balance = { $gte: Math.abs(balanceDelta) };
      }
      const updatedWallet = await require('../models/Wallet').findOneAndUpdate(query, {
        $inc: { balance: balanceDelta }
      });
      if (!updatedWallet) {
        throw new AppError('Insufficient funds in shared wallet to apply update', 400);
      }
    } else {
      const query = { _id: userId };
      if (STRICT_MODE && balanceDelta < 0) {
        query.walletBalance = { $gte: Math.abs(balanceDelta) };
      }
      const updatedUser = await User.findOneAndUpdate(query, {
        $inc: { walletBalance: balanceDelta }
      });
      if (!updatedUser) {
        throw new AppError('Insufficient personal funds to apply update', 400);
      }
    }
  }

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

  const baseAmount =
    transaction.baseAmount !== undefined
      ? transaction.baseAmount
      : transaction.amount;

  const balanceChange =
    transaction.type === 'income'
      ? -baseAmount
      : baseAmount;

  if (transaction.walletId) {
    const query = { _id: transaction.walletId };
    if (STRICT_MODE && balanceChange < 0) {
      query.balance = { $gte: Math.abs(balanceChange) };
    }
    const Wallet = require('../models/Wallet');
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

  const baseAmount =
    deletedTransaction.baseAmount !== undefined
      ? deletedTransaction.baseAmount
      : deletedTransaction.amount;

  const balanceChange =
    deletedTransaction.type === 'income'
      ? baseAmount
      : -baseAmount;

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
    currency: deletedTransaction.currency || 'USD',
    originalAmount: deletedTransaction.originalAmount !== undefined ? deletedTransaction.originalAmount : deletedTransaction.amount,
    originalCurrency: deletedTransaction.originalCurrency || deletedTransaction.currency || 'USD',
    exchangeRate: deletedTransaction.exchangeRate !== undefined ? deletedTransaction.exchangeRate : 1,
    baseAmount: baseAmount,
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

module.exports = {
  addTransaction,
  getAllTransactions,
  updateTransaction,
  deleteTransaction,
  undoTransaction,
  skipNextOccurrence,
  getTransactionActivity
};
