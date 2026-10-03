const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const User = require('../models/User');
const AppError = require('../utils/appError');
const { withTransaction } = require('../utils/catchAsync');
const { logTransactionActivity } = require('../utils/logActivity');

const STRICT_MODE = process.env.STRICT_WALLET_BALANCE === 'true';

const getNextExecutionDate = (currentDate, interval) => {
  const next = new Date(currentDate);
  if (interval === 'daily') next.setDate(next.getDate() + 1);
  else if (interval === 'weekly') next.setDate(next.getDate() + 7);
  else if (interval === 'monthly') next.setMonth(next.getMonth() + 1);
  else return null;
  return next;
};

class RecurringTransactionService {
  async processRecurringTransactions() {
    const now = new Date();
    const failedRecurringIds = [];

    while (true) {
      const candidate = await Transaction.findOne({
        _id: { $nin: failedRecurringIds },
        isRecurring: true,
        nextExecutionDate: { $lte: now },
        walletId: null,
      }).sort({ nextExecutionDate: 1 });

      if (!candidate) break;

      const dueDate = candidate.nextExecutionDate;
      const nextDate = getNextExecutionDate(dueDate, candidate.recurringInterval);

      if (!nextDate) {
        failedRecurringIds.push(candidate._id);
        continue;
      }

      // Atomic claim
      const rt = await Transaction.findOneAndUpdate(
        { _id: candidate._id, nextExecutionDate: dueDate },
        { $set: { nextExecutionDate: nextDate } },
        { new: false }
      );

      if (!rt) continue; // lost race

      try {
        await withTransaction(async (session) => {
          const balanceChange = rt.type === 'income' ? rt.amount : -rt.amount;

          const userQuery = { _id: rt.userId };
          if (STRICT_MODE && balanceChange < 0) {
            userQuery.walletBalance = { $gte: Math.abs(balanceChange) };
          }

          const updatedUser = await User.findOneAndUpdate(
            userQuery,
            { $inc: { walletBalance: balanceChange } },
            { session, new: true }
          );

          if (!updatedUser) {
            throw new AppError('Insufficient personal funds to process recurring transaction', 400);
          }

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
        });
      } catch (error) {
        // Roll the claim back
        await Transaction.updateOne(
          { _id: rt._id, nextExecutionDate: nextDate },
          { $set: { nextExecutionDate: dueDate } }
        );
        failedRecurringIds.push(rt._id);
        console.error(`Recurring transaction ${rt._id} skipped: ${error.message}`);
      }
    }
  }
}

module.exports = new RecurringTransactionService();
