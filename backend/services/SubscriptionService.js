const { isValidObjectId } = require('../utils/validation');
const { escapeRegex } = require('../utils/helpers');

/**
 * SubscriptionService — extracted from subscriptionController.
 * 
 * @param {Object} deps
 * @param {Object} deps.subscriptionModel — Mongoose Subscription model
 * @param {Object} deps.transactionRepository — ITransactionRepository
 * @param {Object} deps.logger — ILogger
 */
class SubscriptionService {
    constructor({ subscriptionModel, transactionRepository, logger }) {
        this.Subscription = subscriptionModel;
        this.txRepo = transactionRepository;
        this.logger = logger;
    }

    /**
     * Get all active subscriptions for a user.
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async getSubscriptions(userId) {
        return this.Subscription.find({ userId, isActive: true }).sort({ nextDueDate: 1 });
    }

    /**
     * Add a new subscription.
     * @param {string} userId
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    async addSubscription(userId, data) {
        const { name, amount, billingCycle, nextDueDate, category, provider } = data;
        const subscription = new this.Subscription({
            userId, name, amount, billingCycle, nextDueDate, category, provider
        });
        await subscription.save();
        return subscription;
    }

    /**
     * Deactivate a subscription (soft delete).
     * @param {string} userId
     * @param {string} subscriptionId
     * @returns {Promise<Object>}
     */
    async deleteSubscription(userId, subscriptionId) {
        if (!isValidObjectId(subscriptionId)) {
            return { error: 'Invalid subscription ID format', status: 400 };
        }

        const subscription = await this.Subscription.findOneAndUpdate(
            { _id: subscriptionId, userId },
            { isActive: false },
            { new: true }
        );

        if (!subscription) {
            return { error: 'Subscription not found', status: 404 };
        }

        return { success: true };
    }

    /**
     * Detect recurring subscription patterns from transaction history.
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async detectSubscriptions(userId) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

        const transactions = await this.txRepo.find({
            userId,
            type: 'expense',
            date: { $gte: threeMonthsAgo }
        }, { sort: { date: 1 } });

        const existingSubscriptions = await this.Subscription.find({ userId, isActive: true });

        const candidates = [];
        const grouped = {};

        transactions.forEach(t => {
            let key = t.description ? t.description.toLowerCase().trim() : t.category.toLowerCase();
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        for (const key of Object.keys(grouped)) {
            const txs = grouped[key];
            if (txs.length < 2) continue;

            const amounts = txs.map(t => t.amount);
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const isConsistentAmount = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

            if (!isConsistentAmount) continue;

            let isMonthly = true;
            for (let i = 1; i < txs.length; i++) {
                const diffTime = Math.abs(txs[i].date - txs[i - 1].date);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 20 || diffDays > 40) {
                    isMonthly = false;
                    break;
                }
            }

            if (isMonthly) {
                const lastTx = txs[txs.length - 1];
                const nextDue = new Date(lastTx.date);
                nextDue.setDate(nextDue.getDate() + 30);

                const safeKey = escapeRegex(key);
                const regex = new RegExp(safeKey, 'i');
                const exists = existingSubscriptions.some(sub => regex.test(sub.name));

                if (!exists) {
                    candidates.push({
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        amount: avgAmount,
                        billingCycle: 'monthly',
                        nextDueDate: nextDue,
                        category: txs[0].category,
                        confidence: 'high'
                    });
                }
            }
        }

        return candidates;
    }
}

module.exports = SubscriptionService;
