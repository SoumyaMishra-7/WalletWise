
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transactions');
const { isValidObjectId } = require('../utils/validation');

// Get all active subscriptions
const getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ userId: req.userId, isActive: true }).sort({ nextDueDate: 1 });
        res.json({ success: true, subscriptions });
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Add a manual subscription
const addSubscription = async (req, res) => {
    try {
        const { name, amount, billingCycle, nextDueDate, category, provider } = req.body;

        const subscription = new Subscription({
            userId: req.userId,
            name,
            amount,
            billingCycle,
            nextDueDate,
            category,
            provider
        });

        await subscription.save();
        res.status(201).json({ success: true, subscription });
    } catch (error) {
        console.error('Error adding subscription:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete/Deactivate subscription
const deleteSubscription = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid subscription ID format' });
        }

        const subscription = await Subscription.findOneAndUpdate(
            { _id: id, userId: req.userId },
            { isActive: false },
            { new: true }
        );

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        res.json({ success: true, message: 'Subscription removed' });
    } catch (error) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Detect subscriptions from transaction history
const detectSubscriptions = async (req, res) => {
    try {
        const userId = req.userId;
        // Look back 90 days to find recurring patterns
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

        const transactions = await Transaction.find({
            userId,
            type: 'expense',
            date: { $gte: threeMonthsAgo }
        }).sort({ date: 1 });

        // Helper to escape regex
        const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        // 1. Fetch ALL active subscriptions for this user (Batch Query - Fixes N+1)
        const existingSubscriptions = await Subscription.find({
            userId,
            isActive: true
        });

        const candidates = [];
        const grouped = {};

        // Group by normalized description (e.g. "Netflix" from "Netflix.com", "Netflix Inc")
        // Simple normalization: convert to lowercase, take first word or major service name
        transactions.forEach(t => {
            let key = t.description ? t.description.toLowerCase().trim() : t.category.toLowerCase();
            // Heuristic: remove common suffixes/prefixes if needed, but simple grouping works for now

            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        // Analyze groups
        for (const key of Object.keys(grouped)) {
            const txs = grouped[key];
            if (txs.length < 2) continue; // Need at least 2 to form a pattern

            // Check amount consistency (within 10% variance)
            const amounts = txs.map(t => t.amount);
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const isConsistentAmount = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

            if (!isConsistentAmount) continue;

            // Check interval consistency (roughly monthly = 25-35 days)
            let isMonthly = true;
            for (let i = 1; i < txs.length; i++) {
                const diffTime = Math.abs(txs[i].date - txs[i - 1].date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Allow variance: 25-35 days for monthly
                if (diffDays < 20 || diffDays > 40) {
                    isMonthly = false;
                    break;
                }
            }

            if (isMonthly) {
                // High confidence subscription
                const lastTx = txs[txs.length - 1];
                const nextDue = new Date(lastTx.date);
                nextDue.setDate(nextDue.getDate() + 30); // Project next month

                // 2. In-Memory Check (Fixes Unsafe Regex + N+1)
                // Sanitize key before creating regex
                const safeKey = escapeRegExp(key);
                const regex = new RegExp(safeKey, 'i');

                const exists = existingSubscriptions.some(sub => regex.test(sub.name));

                if (!exists) {
                    candidates.push({
                        name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize
                        amount: avgAmount,
                        billingCycle: 'monthly',
                        nextDueDate: nextDue,
                        category: txs[0].category,
                        confidence: 'high'
                    });
                }
            }
        }

        res.json({ success: true, candidates });
    } catch (error) {
        console.error('Error detecting subscriptions:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getSubscriptions,
    addSubscription,
    deleteSubscription,
    detectSubscriptions
};
