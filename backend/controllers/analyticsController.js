const mongoose = require("mongoose");
const Transaction = require("../models/Transactions");

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const categoryTotals = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: "expense",
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const formatted = categoryTotals.map(c => ({
      category: c._id,
      total: c.total
    }));

// 6 Month Trend

const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

const monthlyTrends = await Transaction.aggregate([
  {
    $match: {
      userId: userObjectId,
      type: "expense",
      date: { $gte: sixMonthsAgo }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$date" },
        month: { $month: "$date" }
      },
      total: { $sum: "$amount" }
    }
  },
  {
    $sort: { "_id.year": 1, "_id.month": 1 }
  }
]);

const formattedTrends = monthlyTrends.map(t => ({
  year: t._id.year,
  month: t._id.month,
  total: t.total
}));

// Sort trends by year then month (oldest → newest)
formattedTrends.sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
});


// Fetch last 6 months transactions for recurring detection

const recentTransactions = await Transaction.find({
  userId: userObjectId,
  type: "expense",
  date: { $gte: sixMonthsAgo }
}).sort({ date: 1 });

const recurringMap = {};

recentTransactions.forEach(tx => {
  const key = tx.description?.toLowerCase().trim();
  if (!key) return;

  if (!recurringMap[key]) {
    recurringMap[key] = [];
  }

  recurringMap[key].push(tx);
});

const recurring = [];

for (const [desc, transactions] of Object.entries(recurringMap)) {

  if (transactions.length < 3) continue; // at least 3 occurrences

  const amounts = transactions.map(t => t.amount);
  const firstAmount = amounts[0];

  const similarAmounts = amounts.every(a =>
    Math.abs(a - firstAmount) <= firstAmount * 0.1
  );

  if (!similarAmounts) continue;

  recurring.push({
    description: desc,
    averageAmount: Math.round(
      amounts.reduce((a, b) => a + b, 0) / amounts.length
    ),
    occurrences: transactions.length
  });
}

// Last 3 months average per category

const threeMonthsAgo = new Date(startOfMonth);
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

const last3MonthsData = await Transaction.aggregate([
  {
    $match: {
      userId: userObjectId,
      type: "expense",
      date: {
        $gte: threeMonthsAgo,
        $lt: startOfMonth  
      }
    }
  },
  {
    $group: {
      _id: "$category",
      average: { $avg: "$amount" }
    }
  }
]);


const anomalies = [];

formatted.forEach(currentCategory => {
  const avgData = last3MonthsData.find(
    item => item._id === currentCategory.category
  );

  if (!avgData) return;

  const average = avgData.average;

  if (currentCategory.total > average * 1.5) {
    anomalies.push({
      category: currentCategory.category,
      currentTotal: currentCategory.total,
      averageLast3Months: Math.round(average),
      threshold: Math.round(average * 1.5)
    });
  }
});

// Sort recurring by highest frequency
recurring.sort((a, b) => b.occurrences - a.occurrences);


    res.json({
  categoryTotals: formatted,
  trends: formattedTrends,
  recurring,
  anomalies
});


  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics error" });
  }
};

exports.getForecast = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Look back 3 months for base forecasting
    const threeMonthsAgo = new Date(startOfCurrentMonth);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // 1. Category-wise Monthly Aggregation (Last 3 Months)
    const historicalData = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: "expense",
          date: { $gte: threeMonthsAgo, $lt: startOfCurrentMonth }
        }
      },
      {
        $group: {
          _id: {
            category: "$category",
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          monthlyTotal: { $sum: "$amount" }
        }
      },
      {
        $group: {
          _id: "$_id.category",
          averageSpending: { $avg: "$monthlyTotal" },
          monthlyHistory: {
            $push: {
              year: "$_id.year",
              month: "$_id.month",
              total: "$monthlyTotal"
            }
          }
        }
      }
    ]);

    // 2. Current Month Spending & Velocity
    const currentMonthExpenses = await Transaction.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: "expense",
          date: { $gte: startOfCurrentMonth }
        }
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const monthCompletionRatio = Math.max(currentDay / daysInMonth, 0.01); // Avoid division by zero

    const forecasts = historicalData.map(hist => {
      const current = currentMonthExpenses.find(c => c._id === hist._id) || { total: 0 };
      
      // Calculate trend (last month vs average)
      hist.monthlyHistory.sort((a,b) => (a.year*12 + a.month) - (b.year*12 + b.month));
      const lastMonth = hist.monthlyHistory[hist.monthlyHistory.length - 1]?.total || 0;
      const trend = lastMonth > hist.averageSpending ? "increasing" : "decreasing";

      // Prediction for next month (using average + slight trend weight)
      const prediction = Math.round(hist.averageSpending * 1.05); // 5% buffer for safety

      // Current Velocity Projection
      const projectedEndTotal = Math.round(current.total / monthCompletionRatio);
      const isAheadOfSchedule = projectedEndTotal > hist.averageSpending * 1.2;

      return {
        category: hist._id,
        averageHistorical: Math.round(hist.averageSpending),
        predictedNextMonth: prediction,
        trend,
        currentMonth: {
          spent: current.total,
          projected: projectedEndTotal,
          isAheadOfSchedule,
          warning: isAheadOfSchedule ? `At your current rate, you will exceed your average '${hist._id}' spending by $${projectedEndTotal - Math.round(hist.averageSpending)}` : null
        }
      };
    });

    res.json({
      forecasts,
      overallSuggestion: Math.round(forecasts.reduce((acc, f) => acc + f.predictedNextMonth, 0))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Forecasting error" });
  }
};
