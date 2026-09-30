const { z } = require('zod');
const AppError = require('../utils/appError');
const { isValidObjectId } = require('../utils/validation');
const { getHistoricalRate, roundCurrency, BASE_CURRENCY } = require('../utils/currencyConverter');

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

    category: z.string().min(1, "Category is required"),
    description: z.string().optional().default(''),
    paymentMethod: z.string().optional().default('cash'),
    mood: z.string().optional(),
    date: z.preprocess(
        (val) => (val ? new Date(val) : undefined),
        z.date().optional()
    ),

    isRecurring: z.boolean().optional().default(false),
    recurringInterval: z.enum(['daily', 'weekly', 'monthly']).optional(),
    forceDuplicate: z.boolean().optional().default(false),
    walletId: z.string().optional().nullable(),
    isEncrypted: z.boolean().optional().default(false),
    encryptedData: z.string().nullable().optional()
});

/**
 * TransactionService — extracted business logic from transactionController.
 * 
 * All data access goes through injected repositories. No direct model imports.
 * 
 * @param {Object} deps
 * @param {Object} deps.transactionRepository — ITransactionRepository
 * @param {Object} deps.userRepository — IUserRepository
 * @param {Object} deps.gamificationService — IGamificationService
 * @param {Object} deps.logger — ILogger
 */
class TransactionService {
    constructor({ transactionRepository, userRepository, gamificationService, logger }) {
        this.txRepo = transactionRepository;
        this.userRepo = userRepository;
        this.gamification = gamificationService;
        this.logger = logger;
        this.STRICT_MODE = process.env.STRICT_WALLET_BALANCE === "true";
    }

    /**
     * Add a new transaction.
     * @param {string} userId
     * @param {Object} data — raw request body
     * @returns {Promise<Object>} — { transaction, gamification }
     */
    async addTransaction(userId, data) {
        const parsed = transactionSchema.safeParse(data);
        if (!parsed.success) {
            const messages = parsed.error.errors.map(e => e.message).join(', ');
            throw new AppError(messages, 400);
        }

        const {
            type, amount, currency, category, description, paymentMethod,
            mood, date, isRecurring, recurringInterval,
            forceDuplicate, walletId, isEncrypted, encryptedData
        } = parsed.data;

        // Duplicate check (within 24 hours)
        if (!forceDuplicate) {
            const sinceDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const possibleDuplicate = await this.txRepo.findOne({
                userId,
                type,
                amount,
                category,
                date: { $gte: sinceDate }
            });

            if (possibleDuplicate) {
                return { duplicate: true };
            }
        }

        let nextExecutionDate = null;
        if (isRecurring && recurringInterval) {
            const now = new Date();
            if (recurringInterval === "daily") now.setDate(now.getDate() + 1);
            else if (recurringInterval === "weekly") now.setDate(now.getDate() + 7);
            else if (recurringInterval === "monthly") now.setMonth(now.getMonth() + 1);
            nextExecutionDate = now;
        }

        const user = await this.userRepo.findById(userId);
        const baseCurrency = (user?.currency || BASE_CURRENCY || 'USD').toUpperCase();
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

        // Create the transaction
        const transaction = await this.txRepo.create({
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
            ...(walletId ? { walletId } : {}),
            isEncrypted,
            encryptedData
        });

        // Update user balance using baseAmount
        const balanceDelta = type === 'income' ? baseAmount : -baseAmount;

        if (user) {
            if (this.STRICT_MODE && type === 'expense' && user.walletBalance < baseAmount) {
                throw new AppError('Insufficient balance', 400);
            }
            user.walletBalance = (user.walletBalance || 0) + balanceDelta;
            await user.save();
        }

        // Gamification: record activity & check for first transaction badge
        const gamificationResult = await this.gamification.recordUserActivity(userId);
        let badgeAwarded = null;
        const count = await this.txRepo.countDocuments({ userId });
        if (count === 1) {
            badgeAwarded = await this.gamification.awardBadge(userId, 'FIRST_TRANSACTION');
        }

        return {
            duplicate: false,
            transaction,
            gamification: {
                activity: gamificationResult,
                badge: badgeAwarded
            }
        };
    }

    /**
     * Get all transactions for a user with filtering & pagination.
     * Also processes overdue recurring transactions.
     * @param {string} userId
     * @param {Object} queryParams
     * @returns {Promise<Object>}
     */
    async getAllTransactions(userId, queryParams) {
        const {
            page = 1,
            limit = 10,
            search,
            type,
            startDate,
            endDate,
            sort = 'newest',
            walletId
        } = queryParams;

        // Process overdue recurring transactions
        const recurringTransactions = await this.txRepo.find({
            userId,
            isRecurring: true,
            nextExecutionDate: { $lte: new Date() },
            walletId: null
        });

        for (const rt of recurringTransactions) {
            const rtBaseAmount = rt.baseAmount !== undefined ? rt.baseAmount : rt.amount;
            const newTransaction = await this.txRepo.create({
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
                isRecurring: false,
                walletId: null
            });

            // Update user balance
            const user = await this.userRepo.findById(userId);
            if (user) {
                const delta = rt.type === 'income' ? rtBaseAmount : -rtBaseAmount;
                user.walletBalance = (user.walletBalance || 0) + delta;
                await user.save();
            }

            // Advance next execution date
            const nextDate = new Date(rt.nextExecutionDate);
            if (rt.recurringInterval === "daily") nextDate.setDate(nextDate.getDate() + 1);
            else if (rt.recurringInterval === "weekly") nextDate.setDate(nextDate.getDate() + 7);
            else if (rt.recurringInterval === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
            rt.nextExecutionDate = nextDate;
            await rt.save();
        }

        // Build query
        const query = {};
        query.userId = userId;
        if (walletId) query.walletId = walletId;
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
            const { escapeRegex } = require('../utils/helpers');
            const safeSearch = escapeRegex(search);
            query.$or = [
                { description: { $regex: safeSearch, $options: 'i' } },
                { category: { $regex: safeSearch, $options: 'i' } }
            ];
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        let sortOption = { date: -1 };
        if (sort === 'oldest') sortOption = { date: 1 };
        else if (sort === 'amount-high') sortOption = { amount: -1 };
        else if (sort === 'amount-low') sortOption = { amount: 1 };

        const transactions = await this.txRepo.find(query, { sort: sortOption, skip, limit: limitNum });
        const total = await this.txRepo.countDocuments(query);

        return {
            transactions,
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum),
                limit: limitNum
            }
        };
    }

    /**
     * Update a transaction.
     * @param {string} userId
     * @param {string} transactionId
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    async updateTransaction(userId, transactionId, updateData) {
        if (!isValidObjectId(transactionId)) {
            throw new AppError('Invalid transaction ID format', 400);
        }

        const oldTransaction = await this.txRepo.findOne({ _id: transactionId, userId });
        if (!oldTransaction) {
            throw new AppError('Transaction not found', 404);
        }

        const user = await this.userRepo.findById(userId);
        const baseCurrency = (user?.currency || BASE_CURRENCY || 'USD').toUpperCase();

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
            newBaseAmount = roundCurrency(newAmount * newExchangeRate);
        }

        updateData.currency = newCurrency;
        updateData.originalCurrency = newCurrency;
        updateData.originalAmount = newAmount;
        updateData.exchangeRate = newExchangeRate;
        updateData.baseAmount = newBaseAmount;

        // Revert old balance effect and apply new one
        if (user) {
            const oldBase = oldTransaction.baseAmount !== undefined ? oldTransaction.baseAmount : oldTransaction.amount;
            const revert = oldTransaction.type === 'income' ? -oldBase : oldBase;
            const apply = newType === 'income' ? newBaseAmount : -newBaseAmount;
            user.walletBalance = (user.walletBalance || 0) + revert + apply;
            await user.save();
        }

        // Update the transaction
        Object.assign(oldTransaction, updateData);
        await oldTransaction.save();

        return oldTransaction;
    }

    /**
     * Delete a transaction.
     * @param {string} userId
     * @param {string} transactionId
     * @returns {Promise<Object>}
     */
    async deleteTransaction(userId, transactionId) {
        if (!isValidObjectId(transactionId)) {
            throw new AppError('Invalid transaction ID format', 400);
        }

        const transaction = await this.txRepo.findOne({ _id: transactionId, userId });
        if (!transaction) {
            throw new AppError('Transaction not found', 404);
        }

        // Revert balance
        const user = await this.userRepo.findById(userId);
        if (user) {
            const baseAmount = transaction.baseAmount !== undefined ? transaction.baseAmount : transaction.amount;
            const revert = transaction.type === 'income' ? -baseAmount : baseAmount;
            user.walletBalance = (user.walletBalance || 0) + revert;
            await user.save();
        }

        await transaction.deleteOne();
        return transaction;
    }
}

module.exports = TransactionService;
