const Transaction = require('../models/Transactions');
const Subscription = require('../models/Subscription');
const Budget = require('../models/Budget');
const insightsService = require('../services/insightsService');

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));


const getAnomalies = async (req, res) => {
  try {
    const summary = await insightsService.getInsightsSummary(req.userId);
    res.json({ success: true, anomalies: summary.anomalies });
  } catch (error) {
    console.error('getAnomalies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getSubscriptionAlerts = async (req, res) => {
  try {
    const summary = await insightsService.getInsightsSummary(req.userId);
    res.json({ success: true, subscriptions: summary.subscriptions });
  } catch (error) {
    console.error('getSubscriptionAlerts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getSeasonal = async (req, res) => {
  try {
    const summary = await insightsService.getInsightsSummary(req.userId);
    res.json({ success: true, seasonal: summary.seasonal });
  } catch (error) {
    console.error('getSeasonal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getWeekendWeekday = async (req, res) => {
  try {
    const summary = await insightsService.getInsightsSummary(req.userId);
    res.json({ success: true, weekendVsWeekday: summary.weekendVsWeekday });
  } catch (error) {
    console.error('getWeekendWeekday error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getInsightsSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const summary = await insightsService.getInsightsSummary(userId);
    res.json({ success: true, ...summary });
  } catch (error) {
    console.error('getInsightsSummary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const evaluatePurchase = async (req, res) => {
  try {
    const { itemName, category, cost, mood } = req.body;
    const userId = req.userId;
    const amount = Number(cost);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid purchase amount' });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [budget, txs, subs] = await Promise.all([
      Budget.findOne({ userId, month: currentMonth, isActive: true }),
      Transaction.find({ userId, type: 'expense', date: { $gte: startOfMonth } }),
      Subscription.find({ userId, isActive: true })
    ]);

    const totalSpent = txs.reduce((sum, t) => sum + (t.amount || 0), 0);
    const budgetLimit = budget ? budget.totalBudget : 0;
    const budgetLeft = budgetLimit - totalSpent;

    // Upcoming critical obligations (next 15 days)
    const today = new Date();
    const in15Days = new Date(today);
    in15Days.setDate(today.getDate() + 15);

    const upcomingBills = subs
      .filter(s => s.nextDueDate && s.nextDueDate >= today && s.nextDueDate <= in15Days)
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const safetyMargin = budgetLeft - upcomingBills;

    let status = 'Affordable';
    let color = 'emerald';
    let recommendation = '';
    let factors = [];

    if (amount > budgetLeft) {
      status = 'Not Recommended';
      color = 'rose';
      recommendation = `This exceeds your remaining budget of ${budgetLeft.toFixed(0)} for this month.`;
      factors.push('Exceeds monthly limit');
    } else if (amount > safetyMargin) {
      status = 'Risky';
      color = 'amber';
      recommendation = `You have enough now, but you have ${upcomingBills.toFixed(0)} in upcoming bills soon.`;
      factors.push('High impact on upcoming bills');
    } else {
      status = 'Affordable';
      color = 'emerald';
      recommendation = 'Your budget can comfortably handle this purchase.';
      factors.push('Within safe spending limits');
    }

    // Mood factoring
    const impulsiveMoods = ['stressed', 'bored', 'sad'];
    if (impulsiveMoods.includes(mood?.toLowerCase())) {
      recommendation += ' However, since you feel a bit low/impulsive, consider waiting 24 hours to see if you still want it.';
      factors.push('Impulsive mood detected');
    }

    res.json({
      success: true,
      evaluation: {
        status,
        color,
        recommendation,
        factors,
        metrics: {
          budgetLeft,
          upcomingBills,
          safetyMargin,
          purchaseImpact: (amount / (budgetLimit || 1)) * 100
        }
      }
    });
  } catch (error) {
    console.error('evaluatePurchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMoodCorrelation = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const txs = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: thirtyDaysAgo }
    });

    const IMPULSIVE_MOODS = ['stressed', 'bored', 'sad'];
    const INTENTIONAL_MOODS = ['happy', 'calm', 'neutral'];

    const moodMap = new Map();
    const impulsiveCategoryMap = new Map();
    let impulsiveTotal = 0;
    let impulsiveCount = 0;
    let intentionalTotal = 0;
    let intentionalCount = 0;
    let overallTotal = 0;

    txs.forEach((t) => {
      const amount = Number(t.amount || 0);
      const mood = (t.mood || 'neutral').toLowerCase();
      const category = t.category || 'other';

      overallTotal += amount;

      const rec = moodMap.get(mood) || { totalAmount: 0, count: 0 };
      rec.totalAmount += amount;
      rec.count += 1;
      moodMap.set(mood, rec);

      const isImpulsive = IMPULSIVE_MOODS.includes(mood);

      if (isImpulsive) {
        impulsiveTotal += amount;
        impulsiveCount += 1;

        const catKey = `${mood}|${category}`;
        const catRec = impulsiveCategoryMap.get(catKey) || { mood, category, totalAmount: 0, count: 0 };
        catRec.totalAmount += amount;
        catRec.count += 1;
        impulsiveCategoryMap.set(catKey, catRec);
      } else {
        intentionalTotal += amount;
        intentionalCount += 1;
      }
    });

    const impulsivePercentage = overallTotal > 0
      ? Number(((impulsiveTotal / overallTotal) * 100).toFixed(1))
      : 0;
    const intentionalPercentage = overallTotal > 0
      ? Number(((intentionalTotal / overallTotal) * 100).toFixed(1))
      : 0;

    const moodBreakdown = Array.from(moodMap.entries())
      .map(([mood, data]) => ({
        mood,
        totalAmount: Number(data.totalAmount.toFixed(2)),
        count: data.count,
        averageAmount: data.count > 0 ? Number((data.totalAmount / data.count).toFixed(2)) : 0,
        isImpulsive: IMPULSIVE_MOODS.includes(mood)
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const impulsiveCategoryBreakdown = Array.from(impulsiveCategoryMap.values())
      .map((rec) => ({
        mood: rec.mood,
        category: rec.category,
        totalAmount: Number(rec.totalAmount.toFixed(2)),
        count: rec.count
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const topTriggers = moodBreakdown
      .filter((m) => m.isImpulsive && m.count > 0)
      .map((m) => ({
        mood: m.mood,
        totalAmount: m.totalAmount,
        message: `${m.mood.charAt(0).toUpperCase() + m.mood.slice(1)} is a spending trigger (₹${m.totalAmount.toFixed(0)} in ${m.count} transaction${m.count > 1 ? 's' : ''})`
      }));

    const tips = [];
    if (overallTotal > 0 && impulsivePercentage > 0) {
      tips.push(
        `${impulsivePercentage}% of your spending in the last 30 days was driven by impulsive moods.`
      );
    }
    if (topTriggers.length > 0) {
      const top = topTriggers[0];
      tips.push(
        `Your biggest trigger is '${top.mood}' — consider a 24-hour cooling-off rule for purchases when feeling ${top.mood}.`
      );
    }
    if (impulsiveCategoryBreakdown.length > 0) {
      const topCat = impulsiveCategoryBreakdown[0];
      tips.push(
        `When ${topCat.mood}, you tend to spend the most on ${topCat.category} (₹${topCat.totalAmount.toFixed(0)}).`
      );
    }
    if (impulsivePercentage === 0 && overallTotal > 0) {
      tips.push('Great job! None of your recent spending appears to be driven by impulsive moods.');
    }
    if (txs.length === 0) {
      tips.push('No expense transactions found in the last 30 days to analyze.');
    }

    res.json({
      success: true,
      moodCorrelation: {
        period: 'last_30_days',
        totalTransactions: txs.length,
        totalSpent: Number(overallTotal.toFixed(2)),
        impulsiveVsIntentional: {
          impulsive: {
            total: Number(impulsiveTotal.toFixed(2)),
            count: impulsiveCount,
            average: impulsiveCount > 0 ? Number((impulsiveTotal / impulsiveCount).toFixed(2)) : 0,
            percentage: impulsivePercentage
          },
          intentional: {
            total: Number(intentionalTotal.toFixed(2)),
            count: intentionalCount,
            average: intentionalCount > 0 ? Number((intentionalTotal / intentionalCount).toFixed(2)) : 0,
            percentage: intentionalPercentage
          }
        },
        moodBreakdown,
        impulsiveCategoryBreakdown,
        topTriggers,
        tips
      }
    });
  } catch (error) {
    console.error('getMoodCorrelation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAnomalies,
  getSubscriptionAlerts,
  getSeasonal,
  getWeekendWeekday,
  getInsightsSummary,
  evaluatePurchase,
  getMoodCorrelation
};
