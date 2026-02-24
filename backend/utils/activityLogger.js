const TransactionActivity = require("../models/TransactionActivity");

const logTransactionActivity = async ({
  userId,
  transactionId,
  action,
  changes = {},
}) => {
  try {
    await TransactionActivity.create({
      userId,
      transactionId,
      action,
      changes,
    });
  } catch (error) {
    console.error("Activity Log Error:", error.message);
  }
};

module.exports = logTransactionActivity;