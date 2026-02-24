const express = require('express');
const router = express.Router();

const authRoutes = require('../authRoutes');
const budgetRoutes = require('../budgetRoutes');
const savingGoalRoutes = require('../savingGoalRoutes');
const transactionRoutes = require('../transactionRoutes');
const dashboardRoutes = require('../dashboardRoutes');
const subscriptionRoutes = require('../subscriptionRoutes');
const insightsRoutes = require('../insightsRoutes');
const analyticsRoutes = require('../analyticsRoutes');

// Health check inside v1
router.get('/health', (req, res) => {
    res.json({ status: 'v1 healthy' });
});

router.use('/auth', authRoutes);
router.use('/budget', budgetRoutes);
router.use('/savings-goals', savingGoalRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/insights', insightsRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
