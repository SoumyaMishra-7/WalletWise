const Transaction = require('../models/Transactions');

const AMOUNT_TOLERANCE = 0.01; // cents-level tolerance

function normalizeDescription(description) {
  return (description || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Groups transactions by (normalizedDescription + roundedAmount) and
 * returns those that appear in 2 or more distinct calendar months.
 * These are flagged as likely recurring.
 */
async function detectRecurringCandidates(userId) {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const transactions = await Transaction.find({
    userId,
    type: 'expense',
    isRecurring: false, // skip already-tagged recurring
    date: { $gte: threeMonthsAgo }
  }).select('description amount category date').lean();

  // Group by (normalizedDescription, amount)
  const groups = new Map();

  for (const tx of transactions) {
    const key = `${normalizeDescription(tx.description)}|${Math.round(tx.amount * 100) / 100}`;
    if (!groups.has(key)) {
      groups.set(key, { transactions: [], months: new Set() });
    }
    const entry = groups.get(key);
    entry.transactions.push(tx);
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
    entry.months.add(monthKey);
  }

  const suggestions = [];

  for (const [key, entry] of groups.entries()) {
    if (entry.months.size < 2) continue; // need ≥2 distinct months

    const [description, amountStr] = key.split('|');
    const amount = parseFloat(amountStr);
    const latestTx = entry.transactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    suggestions.push({
      description: latestTx.description || description,
      normalizedDescription: description,
      amount,
      category: latestTx.category,
      occurrences: entry.transactions.length,
      monthsDetected: entry.months.size,
      months: [...entry.months].sort(),
      latestTransactionId: latestTx._id,
      latestDate: latestTx.date,
    });
  }

  // Sort by occurrence count descending, then by amount
  return suggestions.sort((a, b) => b.occurrences - a.occurrences || b.amount - a.amount);
}

module.exports = { detectRecurringCandidates };
