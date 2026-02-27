/**
 * Container Bootstrap — wires up all services and repositories in the DI container.
 * 
 * This file is the single composition root for the application.
 * Import this in server.js to get a fully configured container.
 */

const Container = require('./container');

// Models (Mongoose)
const User = require('./models/User');
const Transaction = require('./models/Transactions');
const Budget = require('./models/Budget');
const SavingsGoal = require('./models/SavingGoal');
const Subscription = require('./models/Subscription');
const Investment = require('./models/Investment');
const Wallet = require('./models/Wallet');

// Interfaces / Defaults
const { ConsoleLogger } = require('./interfaces/ILogger');

// Services
const GamificationService = require('./services/GamificationService');
const TransactionService = require('./services/TransactionService');
const BudgetService = require('./services/BudgetService');
const SavingsGoalService = require('./services/SavingsGoalService');
const SubscriptionService = require('./services/SubscriptionService');
const DashboardService = require('./services/DashboardService');
const AnalyticsService = require('./services/AnalyticsService');
const insightsServiceModule = require('./services/insightsService');

/**
 * Create and configure the default application container.
 * @returns {Container}
 */
function createContainer() {
    const container = new Container();

    // ── Logger ──────────────────────────────────────────────
    container.register('logger', () => new ConsoleLogger());

    // ── Mongoose Models (registered as-is for DI access) ───
    container.register('UserModel', () => User);
    container.register('TransactionModel', () => Transaction);
    container.register('BudgetModel', () => Budget);
    container.register('SavingsGoalModel', () => SavingsGoal);
    container.register('SubscriptionModel', () => Subscription);
    container.register('InvestmentModel', () => Investment);
    container.register('WalletModel', () => Wallet);

    // ── Repositories (thin wrappers around Mongoose models) ─
    // For now, we pass models directly as repositories.
    // In the future, these can be replaced with proper repository classes.
    container.register('userRepository', (c) => {
        const UserModel = c.resolve('UserModel');
        return {
            findById: (id) => UserModel.findById(id),
            findOne: (query) => UserModel.findOne(query),
            create: (data) => UserModel.create(data),
            updateBalance: async (userId, delta) => {
                return UserModel.findByIdAndUpdate(
                    userId,
                    { $inc: { walletBalance: delta } },
                    { new: true }
                );
            },
            updateById: (id, data) => UserModel.findByIdAndUpdate(id, data, { new: true })
        };
    });

    container.register('transactionRepository', (c) => {
        const TxModel = c.resolve('TransactionModel');
        return {
            create: (data) => TxModel.create(data),
            findById: (id) => TxModel.findById(id),
            find: (query, options = {}) => {
                let q = TxModel.find(query);
                if (options.sort) q = q.sort(options.sort);
                if (options.skip) q = q.skip(options.skip);
                if (options.limit) q = q.limit(options.limit);
                return q;
            },
            findOne: (query) => TxModel.findOne(query),
            countDocuments: (query) => TxModel.countDocuments(query),
            updateById: (id, data) => TxModel.findByIdAndUpdate(id, data, { new: true }),
            deleteById: (id) => TxModel.findByIdAndDelete(id),
            aggregate: (pipeline) => TxModel.aggregate(pipeline),
            findOneAndUpdate: (filter, update, options) => TxModel.findOneAndUpdate(filter, update, options),
            insertMany: (docs) => TxModel.insertMany(docs)
        };
    });

    container.register('budgetRepository', (c) => {
        const BudgetModel = c.resolve('BudgetModel');
        return {
            create: (data) => BudgetModel.create(data),
            findOne: (query) => BudgetModel.findOne(query),
            find: (query, options = {}) => {
                let q = BudgetModel.find(query);
                if (options.sort) q = q.sort(options.sort);
                return q;
            },
            updateById: (id, data) => BudgetModel.findByIdAndUpdate(id, data, { new: true }),
            findById: (id) => BudgetModel.findById(id)
        };
    });

    // ── Services ────────────────────────────────────────────
    container.register('gamificationService', (c) => {
        return new GamificationService({
            userRepository: c.resolve('userRepository'),
            logger: c.resolve('logger')
        });
    });

    container.register('transactionService', (c) => {
        return new TransactionService({
            transactionRepository: c.resolve('transactionRepository'),
            userRepository: c.resolve('userRepository'),
            gamificationService: c.resolve('gamificationService'),
            logger: c.resolve('logger')
        });
    });

    container.register('budgetService', (c) => {
        return new BudgetService({
            budgetRepository: c.resolve('budgetRepository'),
            transactionRepository: c.resolve('transactionRepository'),
            gamificationService: c.resolve('gamificationService'),
            logger: c.resolve('logger')
        });
    });

    container.register('savingsGoalService', (c) => {
        return new SavingsGoalService({
            savingsGoalModel: c.resolve('SavingsGoalModel'),
            gamificationService: c.resolve('gamificationService'),
            logger: c.resolve('logger')
        });
    });

    container.register('subscriptionService', (c) => {
        return new SubscriptionService({
            subscriptionModel: c.resolve('SubscriptionModel'),
            transactionRepository: c.resolve('transactionRepository'),
            logger: c.resolve('logger')
        });
    });

    container.register('dashboardService', (c) => {
        return new DashboardService({
            userRepository: c.resolve('userRepository'),
            transactionRepository: c.resolve('transactionRepository'),
            budgetRepository: c.resolve('budgetRepository'),
            savingsGoalModel: c.resolve('SavingsGoalModel'),
            subscriptionModel: c.resolve('SubscriptionModel'),
            logger: c.resolve('logger')
        });
    });

    container.register('analyticsService', (c) => {
        return new AnalyticsService({
            transactionRepository: c.resolve('transactionRepository'),
            logger: c.resolve('logger')
        });
    });

    container.register('insightsService', () => insightsServiceModule);

    return container;
}

module.exports = { createContainer };
