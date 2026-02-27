const mongoose = require("mongoose");

const transactionActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: true,
  },
  action: {
    type: String,
    enum: ["CREATED", "UPDATED", "DELETED", "RESTORED"],
    required: true,
  },
  changes: {
    type: Object,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "TransactionActivity",
  transactionActivitySchema
);