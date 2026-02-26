const Investment = require('../models/Investment');
const Transaction = require('../models/Transactions');
const SavingsGoal = require('../models/SavingsGoal');
const Budget = require('../models/Budget');

// Mock data for top student stocks
const STOCK_DATA = {
  AAPL: { name: 'Apple Inc.', price: 175.50 },
  MSFT: { name: 'Microsoft Corp.', price: 410.20 },
  TSLA: { name: 'Tesla Inc.', price: 180.75 },
  SPY: { name: 'SPDR S&P 500 ETF Trust', price: 512.30 },
  AMZN: { name: 'Amazon.com Inc.', price: 178.10 },
  GOOGL: { name: 'Alphabet Inc.', price: 155.40 }
};

// Calculate "Available to Invest" from leftover budget
const calculateAvailableToInvest = async (userId) => {
  // Simple logic: Leftover budget this month + past month leftovers
  // Here we just use an arbitrary safe surplus or derive from budgets minus expenses
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const budgets = await Budget.find({ userId });
  const totalBudget = budgets.map(b => b.amount).reduce((a, c) => a + c, 0) || 0; // if single budget doc

  const txs = await Transaction.find({
    userId,
    type: 'expense',
    date: { $gte: currentMonthStart }
  });
  const totalSpent = txs.reduce((a, t) => a + t.amount, 0);

  const currentMonthSurplus = totalBudget - totalSpent;
  return Math.max(currentMonthSurplus, 0) + 150; // +150 default starting virtual balance if none
};

exports.getPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const investments = await Investment.find({ userId });
    
    // Update with latest mock prices
    let totalPortfolioValue = 0;
    const updatedInvestments = investments.map(inv => {
      const latestPrice = STOCK_DATA[inv.symbol]?.price || inv.currentPrice;
      const currentValue = inv.quantity * latestPrice;
      const totalReturn = currentValue - (inv.quantity * inv.averageBuyPrice);
      const returnPercentage = inv.averageBuyPrice ? (totalReturn / (inv.quantity * inv.averageBuyPrice)) * 100 : 0;
      
      totalPortfolioValue += currentValue;
      
      return {
        ...inv.toObject(),
        currentPrice: latestPrice,
        currentValue,
        totalReturn,
        returnPercentage
      };
    });

    const availableToInvest = await calculateAvailableToInvest(userId);

    res.status(200).json({
      success: true,
      data: {
        portfolio: updatedInvestments,
        totalPortfolioValue,
        availableToInvest
      }
    });

  } catch (error) {
    console.error('getPortfolio error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getMarketData = async (req, res) => {
  try {
    // Return mock data for educational purposes
    const market = Object.keys(STOCK_DATA).map(symbol => ({
      symbol,
      ...STOCK_DATA[symbol],
      // simulate a random daily change between -3% and +3%
      dayChange: +(Math.random() * 6 - 3).toFixed(2)
    }));
    
    res.status(200).json({ success: true, data: market });
  } catch (error) {
    console.error('getMarketData error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.buyStock = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid symbol or quantity' });
    }

    const upperSymbol = symbol.toUpperCase();
    const stockPrice = STOCK_DATA[upperSymbol]?.price;

    if (!stockPrice) {
      return res.status(404).json({ success: false, message: 'Stock not found in simulator' });
    }

    const cost = stockPrice * quantity;
    const availableToInvest = await calculateAvailableToInvest(userId);

    // Instead of completely blocking on budget, we just warn or let it pass for simulation
    // But let's act like a real account:
    // Actually we don't persist "availableToInvest" as a separate model. It's derived. 
    // To deduct virtual balance, we could log a virtual "expense" transaction, but that ruins real analytics.
    // simpler: allow infinite virtual buying for education, but just log the simulation.
    // For realism, let's keep it simple and just allow the buy.

    let investment = await Investment.findOne({ userId, symbol: upperSymbol });

    if (investment) {
      // Calculate new average buy price
      const totalCostBefore = investment.quantity * investment.averageBuyPrice;
      const totalCostNew = cost;
      const newQuantity = investment.quantity + quantity;
      const newAveragePrice = (totalCostBefore + totalCostNew) / newQuantity;

      investment.quantity = newQuantity;
      investment.averageBuyPrice = newAveragePrice;
      investment.currentPrice = stockPrice;
      investment.lastUpdated = Date.now();
      await investment.save();
    } else {
      investment = new Investment({
        userId,
        symbol: upperSymbol,
        quantity,
        averageBuyPrice: stockPrice,
        currentPrice: stockPrice
      });
      await investment.save();
    }

    res.status(200).json({ success: true, message: `Successfully bought ${quantity} shares of ${upperSymbol}`, data: investment });

  } catch (error) {
    console.error('buyStock error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.sellStock = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, quantity } = req.body;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid symbol or quantity' });
    }

    const upperSymbol = symbol.toUpperCase();
    let investment = await Investment.findOne({ userId, symbol: upperSymbol });

    if (!investment || investment.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Not enough shares to sell' });
    }

    investment.quantity -= quantity;
    investment.lastUpdated = Date.now();

    if (investment.quantity === 0) {
      await investment.deleteOne();
    } else {
      await investment.save();
    }

    res.status(200).json({ success: true, message: `Successfully sold ${quantity} shares of ${upperSymbol}` });

  } catch (error) {
    console.error('sellStock error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
