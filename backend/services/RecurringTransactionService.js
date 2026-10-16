const Transaction = require('../models/Transactions');
const User = require('../models/User');
const logTransactionActivity = require('../utils/activityLogger');
const AppError = require('../utils/appError');

const STRICT_MODE = process.env.STRICT_WALLET_BALANCE === "true";

// Local development fallback (no MongoDB replica set)
const withTransaction = async (operation) => {
  return await operation(null);
};

// Returns the date following `from` for a recurrence interval, or null if the
// interval is not recognised.
const getNextExecutionDate = (from, interval) => {
  const next = new Date(from);
  if (interval === "daily") next.setDate(next.getDate() + 1);
  else if (interval === "weekly") next.setDate(next.getDate() + 7);
  else if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  else return null;
  return next;
};

/**
 * Execute every recurring transaction that is due.
 *
 * Each occurrence is claimed with a compare-and-set on nextExecutionDate: the
 * schedule is advanced to its real next date *before* the occurrence runs, so
 * two concurrent callers can never execute the same occurrence twice. If
 * executing fails (insufficient funds in STRICT mode, validation error) the
 * claim is rolled back, so the occurrence stays due and is retried later
 * instead of being lost, and one bad item never stops the remaining ones.
 *
 * @param {Object}  [options]
 * @param {String}  [options.userId] Restrict the run to a single user. Omit it
 *                                   to process every user's due items.
 * @returns {Promise<{processed: number, failed: number}>}
 */
const processDueRecurringTransactions = async ({ userId } = {}) => {
  const now = new Date();
  const failedRecurringIds = [];
  let processed = 0;

  while (true) {
    const filter = {
      _id: { $nin: failedRecurringIds },
      isRecurring: true,
      nextExecutionDate: { $lte: now },
      walletId: null,
    };

    if (userId) {
      filter.userId = userId;
    }

    const candidate = await Transaction.findOne(filter).sort({ nextExecutionDate: 1 });

    if (!candidate) break;

    const dueDate = candidate.nextExecutionDate;
    const nextDate = getNextExecutionDate(dueDate, candidate.recurringInterval);

    if (!nextDate) {
      // Misconfigured recurrence (unknown interval) - never loop on it.
      failedRecurringIds.push(candidate._id);
      continue;
    }

    // Atomic claim: only succeeds if nobody else advanced this occurrence.
    const rt = await Transaction.findOneAndUpdate(
      { _id: candidate._id, nextExecutionDate: dueDate },
      { $set: { nextExecutionDate: nextDate } },
      { new: false }
    );

    if (!rt) continue; // lost the race to a concurrent caller

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

      processed++;
    } catch (error) {
      // Roll the claim back (only if nobody changed the schedule since) so the
      // occurrence is retried on a later run instead of being lost.
      await Transaction.updateOne(
        { _id: rt._id, nextExecutionDate: nextDate },
        { $set: { nextExecutionDate: dueDate } }
      );
      failedRecurringIds.push(rt._id);
      console.error(`Recurring transaction ${rt._id} skipped: ${error.message}`);
    }
  }

  return { processed, failed: failedRecurringIds.length };
};

module.exports = {
  processDueRecurringTransactions,
  getNextExecutionDate
};
