const Transaction = require('../models/Transactions');
const Subscription = require('../models/Subscription');

const startOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const isWeekend = (date) => {
  const d = new Date(date).getDay();
  return d === 0 || d === 6;
};

const toMonthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const meanStd = (arr) => {
  if (!arr.length) return { mean: 0, std: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
  return { mean, std: Math.sqrt(variance) };
};

const normalizeText = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');

const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));

const getAnomalies = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 7 * 8);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const [recent, last90] = await Promise.all([
      Transaction.find({ userId, type: 'expense', date: { $gte: eightWeeksAgo } }),
      Transaction.find({ userId, type: 'expense', date: { $gte: ninetyDaysAgo } })
    ]);

    const currentWeekStart = startOfWeek(now);
    const weeklyByCategory = new Map();

    recent.forEach((t) => {
      const ws = startOfWeek(t.date).toISOString().slice(0, 10);
      const key = `${ws}|${t.category || 'other'}`;
      weeklyByCategory.set(key, (weeklyByCategory.get(key) || 0) + Number(t.amount || 0));
    });

    const categories = new Set(recent.map((t) => t.category || 'other'));
    const spikes = [];
    categories.forEach((cat) => {
      const thisWeekKey = `${currentWeekStart.toISOString().slice(0, 10)}|${cat}`;
      const thisWeek = weeklyByCategory.get(thisWeekKey) || 0;

      const prevs = [];
      for (let i = 1; i <= 7; i += 1) {
        const ws = new Date(currentWeekStart);
        ws.setDate(ws.getDate() - 7 * i);
        const key = `${ws.toISOString().slice(0, 10)}|${cat}`;
        prevs.push(weeklyByCategory.get(key) || 0);
      }
      const avgPrev = prevs.length ? prevs.reduce((a, b) => a + b, 0) / prevs.length : 0;
      const ratio = avgPrev > 0 ? thisWeek / Math.max(1, avgPrev) : (thisWeek > 0 ? Infinity : 0);

      if (thisWeek >= 1 && ratio >= 2) {
        spikes.push({
          category: cat,
          thisWeek: Number(thisWeek.toFixed(2)),
          averageWeek: Number(avgPrev.toFixed(2)),
          ratio: Number((ratio === Infinity ? 99 : ratio).toFixed(2)),
          message:
            avgPrev > 0
              ? `You spent ${(ratio).toFixed(1)}x more on ${cat} this week`
              : `You started spending on ${cat} this week`
        });
      }
    });

    const byCat = new Map();
    last90.forEach((t) => {
      const key = t.category || 'other';
      const list = byCat.get(key) || [];
      list.push(t);
      byCat.set(key, list);
    });
    const largeTransactions = [];
    byCat.forEach((list, cat) => {
      const amounts = list.map((t) => Number(t.amount || 0));
      const { mean, std } = meanStd(amounts);
      if (std === 0) return;
      list.forEach((t) => {
        const z = (t.amount - mean) / std;
        if (z >= 2 && t.amount >= 1000) {
          largeTransactions.push({
            id: t._id,
            amount: t.amount,
            category: cat,
            date: t.date,
            zScore: Number(z.toFixed(2)),
            message: `Unusually large ${cat} expense: ₹${t.amount.toFixed(0)}`
          });
        }
      });
    });

    res.json({ success: true, anomalies: { weeklySpikes: spikes, largeTransactions } });
  } catch (error) {
    console.error('getAnomalies error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSubscriptionAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);
    in7.setHours(23, 59, 59, 999);

    const [subs, txs] = await Promise.all([
      Subscription.find({ userId, isActive: true }),
      Transaction.find({ userId, type: 'expense', date: { $gte: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()) } })
    ]);

    const dueSoon = subs
      .filter((s) => s.nextDueDate && s.nextDueDate >= today && s.nextDueDate <= in7)
      .map((s) => ({
        id: s._id,
        name: s.name,
        dueDate: s.nextDueDate,
        dueInDays: daysBetween(today, s.nextDueDate),
        amount: s.amount,
        message: `${s.name} renews in ${daysBetween(today, s.nextDueDate)} day(s)`
      }))
      .sort((a, b) => a.dueInDays - b.dueInDays);

    // Possibly unused subscriptions: no matching charge for > 1.5x cycle length
    const txTextIndex = txs.map((t) => ({
      date: new Date(t.date),
      amount: Number(t.amount || 0),
      text: normalizeText(t.description || t.category)
    }));

    const cycleDays = (billingCycle) => {
      if (billingCycle === 'weekly') return 7;
      if (billingCycle === 'yearly') return 365;
      return 30;
    };

    const possiblyUnused = [];
    subs.forEach((s) => {
      const key = normalizeText(`${s.provider || ''} ${s.name}`);
      const candidates = txTextIndex
        .filter((t) => key && t.text && (t.text.includes(normalizeText(s.name)) || (s.provider && t.text.includes(normalizeText(s.provider)))))
        .sort((a, b) => b.date - a.date);
      const lastSeen = candidates[0]?.date;
      const multiplier = 1.5;
      const thresholdDays = Math.round(cycleDays(s.billingCycle) * multiplier);
      const refDate = lastSeen || new Date(s.createdAt || today);
      const daysSince = daysBetween(refDate, today);
      if (daysSince > thresholdDays) {
        possiblyUnused.push({
          id: s._id,
          name: s.name,
          lastSeen: lastSeen || null,
          billingCycle: s.billingCycle,
          daysSince: daysSince,
          message: `${s.name} seems unused for ${daysSince} days`
        });
      }
    });

    res.json({ success: true, subscriptions: { dueSoon, possiblyUnused } });
  } catch (error) {
    console.error('getSubscriptionAlerts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSeasonal = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const txs = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: twelveMonthsAgo }
    });

    const monthlyTotalsMap = new Map();
    const byCategoryMonth = new Map(); // key: category|YYYY-MM
    txs.forEach((t) => {
      const month = toMonthKey(t.date);
      const cat = t.category || 'other';
      monthlyTotalsMap.set(month, (monthlyTotalsMap.get(month) || 0) + Number(t.amount || 0));
      const key = `${cat}|${month}`;
      byCategoryMonth.set(key, (byCategoryMonth.get(key) || 0) + Number(t.amount || 0));
    });

    const monthlyTotals = Array.from(monthlyTotalsMap.entries())
      .map(([month, amount]) => ({ month, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => (a.month < b.month ? -1 : 1));

    // Find peak month per category
    const byCategory = new Map();
    byCategoryMonth.forEach((amount, key) => {
      const [cat, month] = key.split('|');
      const rec = byCategory.get(cat) || [];
      rec.push({ month, amount });
      byCategory.set(cat, rec);
    });
    const categoryPeaks = [];
    byCategory.forEach((list, cat) => {
      const peak = list.reduce((max, cur) => (cur.amount > max.amount ? cur : max), { amount: -1 });
      if (peak && peak.amount > 0) {
        categoryPeaks.push({ category: cat, peakMonth: peak.month, amount: Number(peak.amount.toFixed(2)) });
      }
    });

    res.json({ success: true, seasonal: { monthlyTotals, categoryPeaks } });
  } catch (error) {
    console.error('getSeasonal error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getWeekendWeekday = async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - 7 * 12);

    const txs = await Transaction.find({
      userId,
      type: 'expense',
      date: { $gte: twelveWeeksAgo }
    });

    let weekendSum = 0;
    let weekendCount = 0;
    let weekdaySum = 0;
    let weekdayCount = 0;
    const byCategory = new Map();

    txs.forEach((t) => {
      const w = isWeekend(t.date);
      if (w) {
        weekendSum += Number(t.amount || 0);
        weekendCount += 1;
      } else {
        weekdaySum += Number(t.amount || 0);
        weekdayCount += 1;
      }
      const cat = t.category || 'other';
      const rec = byCategory.get(cat) || { weekendSum: 0, weekendCount: 0, weekdaySum: 0, weekdayCount: 0 };
      if (w) {
        rec.weekendSum += Number(t.amount || 0);
        rec.weekendCount += 1;
      } else {
        rec.weekdaySum += Number(t.amount || 0);
        rec.weekdayCount += 1;
      }
      byCategory.set(cat, rec);
    });

    const overall = {
      weekendAvg: weekendCount ? Number((weekendSum / weekendCount).toFixed(2)) : 0,
      weekdayAvg: weekdayCount ? Number((weekdaySum / weekdayCount).toFixed(2)) : 0
    };

    const byCategoryAverages = Array.from(byCategory.entries()).map(([category, v]) => ({
      category,
      weekendAvg: v.weekendCount ? Number((v.weekendSum / v.weekendCount).toFixed(2)) : 0,
      weekdayAvg: v.weekdayCount ? Number((v.weekdaySum / v.weekdayCount).toFixed(2)) : 0
    }));

    res.json({ success: true, weekendVsWeekday: { overall, byCategory: byCategoryAverages } });
  } catch (error) {
    console.error('getWeekendWeekday error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getInsightsSummary = async (req, res) => {
  try {
    // Run sub-computations in parallel
    const [anomaliesRes, subsRes, seasonalRes, weekendRes] = await Promise.all([
      (async () => {
        const fakeReq = { ...req };
        return new Promise((resolve) => {
          // Reuse logic synchronously
          resolve(null);
        });
      })(),
      (async () => null)(),
      (async () => null)(),
      (async () => null)()
    ]);

    // Call internal functions directly to avoid request/response overhead
    const anomalies = await (async () => {
      const mockRes = { json: (v) => v };
      const reqLike = { userId: req.userId };
      const now = new Date();
      const eightWeeksAgo = new Date(now);
      eightWeeksAgo.setDate(now.getDate() - 7 * 8);
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      const [recent, last90] = await Promise.all([
        Transaction.find({ userId: reqLike.userId, type: 'expense', date: { $gte: eightWeeksAgo } }),
        Transaction.find({ userId: reqLike.userId, type: 'expense', date: { $gte: ninetyDaysAgo } })
      ]);
      const currentWeekStart = startOfWeek(now);
      const weeklyByCategory = new Map();
      recent.forEach((t) => {
        const ws = startOfWeek(t.date).toISOString().slice(0, 10);
        const key = `${ws}|${t.category || 'other'}`;
        weeklyByCategory.set(key, (weeklyByCategory.get(key) || 0) + Number(t.amount || 0));
      });
      const categories = new Set(recent.map((t) => t.category || 'other'));
      const spikes = [];
      categories.forEach((cat) => {
        const thisWeekKey = `${currentWeekStart.toISOString().slice(0, 10)}|${cat}`;
        const thisWeek = weeklyByCategory.get(thisWeekKey) || 0;
        const prevs = [];
        for (let i = 1; i <= 7; i += 1) {
          const ws = new Date(currentWeekStart);
          ws.setDate(ws.getDate() - 7 * i);
          const key = `${ws.toISOString().slice(0, 10)}|${cat}`;
          prevs.push(weeklyByCategory.get(key) || 0);
        }
        const avgPrev = prevs.length ? prevs.reduce((a, b) => a + b, 0) / prevs.length : 0;
        const ratio = avgPrev > 0 ? thisWeek / Math.max(1, avgPrev) : (thisWeek > 0 ? Infinity : 0);
        if (thisWeek >= 1 && ratio >= 2) {
          spikes.push({
            category: cat,
            thisWeek: Number(thisWeek.toFixed(2)),
            averageWeek: Number(avgPrev.toFixed(2)),
            ratio: Number((ratio === Infinity ? 99 : ratio).toFixed(2)),
            message:
              avgPrev > 0
                ? `You spent ${(ratio).toFixed(1)}x more on ${cat} this week`
                : `You started spending on ${cat} this week`
          });
        }
      });
      const byCat = new Map();
      last90.forEach((t) => {
        const key = t.category || 'other';
        const list = byCat.get(key) || [];
        list.push(t);
        byCat.set(key, list);
      });
      const largeTransactions = [];
      byCat.forEach((list, cat) => {
        const amounts = list.map((t) => Number(t.amount || 0));
        const { mean, std } = meanStd(amounts);
        if (std === 0) return;
        list.forEach((t) => {
          const z = (t.amount - mean) / std;
          if (z >= 2 && t.amount >= 1000) {
            largeTransactions.push({
              id: t._id,
              amount: t.amount,
              category: cat,
              date: t.date,
              zScore: Number(z.toFixed(2)),
              message: `Unusually large ${cat} expense: ₹${t.amount.toFixed(0)}`
            });
          }
        });
      });
      return { weeklySpikes: spikes, largeTransactions };
    })();

    const subscriptions = await (async () => {
      const userId = req.userId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in7 = new Date(today);
      in7.setDate(today.getDate() + 7);
      in7.setHours(23, 59, 59, 999);
      const [subs, txs] = await Promise.all([
        Subscription.find({ userId, isActive: true }),
        Transaction.find({ userId, type: 'expense', date: { $gte: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()) } })
      ]);
      const dueSoon = subs
        .filter((s) => s.nextDueDate && s.nextDueDate >= today && s.nextDueDate <= in7)
        .map((s) => ({
          id: s._id, name: s.name, dueDate: s.nextDueDate, dueInDays: daysBetween(today, s.nextDueDate), amount: s.amount,
          message: `${s.name} renews in ${daysBetween(today, s.nextDueDate)} day(s)`
        }))
        .sort((a, b) => a.dueInDays - b.dueInDays);
      const txTextIndex = txs.map((t) => ({
        date: new Date(t.date),
        amount: Number(t.amount || 0),
        text: normalizeText(t.description || t.category)
      }));
      const cycleDays = (billingCycle) => {
        if (billingCycle === 'weekly') return 7;
        if (billingCycle === 'yearly') return 365;
        return 30;
      };
      const possiblyUnused = [];
      subs.forEach((s) => {
        const key = normalizeText(`${s.provider || ''} ${s.name}`);
        const candidates = txTextIndex
          .filter((t) => key && t.text && (t.text.includes(normalizeText(s.name)) || (s.provider && t.text.includes(normalizeText(s.provider)))))
          .sort((a, b) => b.date - a.date);
        const lastSeen = candidates[0]?.date;
        const multiplier = 1.5;
        const thresholdDays = Math.round(cycleDays(s.billingCycle) * multiplier);
        const refDate = lastSeen || new Date(s.createdAt || today);
        const daysSince = daysBetween(refDate, today);
        if (daysSince > thresholdDays) {
          possiblyUnused.push({
            id: s._id,
            name: s.name,
            lastSeen: lastSeen || null,
            billingCycle: s.billingCycle,
            daysSince,
            message: `${s.name} seems unused for ${daysSince} days`
          });
        }
      });
      return { dueSoon, possiblyUnused };
    })();

    const seasonal = await (async () => {
      const userId = req.userId;
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const txs = await Transaction.find({ userId, type: 'expense', date: { $gte: twelveMonthsAgo } });
      const monthlyTotalsMap = new Map();
      const byCategoryMonth = new Map();
      txs.forEach((t) => {
        const month = toMonthKey(t.date);
        const cat = t.category || 'other';
        monthlyTotalsMap.set(month, (monthlyTotalsMap.get(month) || 0) + Number(t.amount || 0));
        const key = `${cat}|${month}`;
        byCategoryMonth.set(key, (byCategoryMonth.get(key) || 0) + Number(t.amount || 0));
      });
      const monthlyTotals = Array.from(monthlyTotalsMap.entries())
        .map(([month, amount]) => ({ month, amount: Number(amount.toFixed(2)) }))
        .sort((a, b) => (a.month < b.month ? -1 : 1));
      const byCategory = new Map();
      byCategoryMonth.forEach((amount, key) => {
        const [cat, month] = key.split('|');
        const rec = byCategory.get(cat) || [];
        rec.push({ month, amount });
        byCategory.set(cat, rec);
      });
      const categoryPeaks = [];
      byCategory.forEach((list, cat) => {
        const peak = list.reduce((max, cur) => (cur.amount > max.amount ? cur : max), { amount: -1 });
        if (peak && peak.amount > 0) {
          categoryPeaks.push({ category: cat, peakMonth: peak.month, amount: Number(peak.amount.toFixed(2)) });
        }
      });
      return { monthlyTotals, categoryPeaks };
    })();

    const weekendVsWeekday = await (async () => {
      const userId = req.userId;
      const now = new Date();
      const twelveWeeksAgo = new Date(now);
      twelveWeeksAgo.setDate(now.getDate() - 7 * 12);
      const txs = await Transaction.find({ userId, type: 'expense', date: { $gte: twelveWeeksAgo } });
      let weekendSum = 0, weekendCount = 0, weekdaySum = 0, weekdayCount = 0;
      const byCategory = new Map();
      txs.forEach((t) => {
        const w = isWeekend(t.date);
        if (w) {
          weekendSum += Number(t.amount || 0); weekendCount += 1;
        } else {
          weekdaySum += Number(t.amount || 0); weekdayCount += 1;
        }
        const cat = t.category || 'other';
        const rec = byCategory.get(cat) || { weekendSum: 0, weekendCount: 0, weekdaySum: 0, weekdayCount: 0 };
        if (w) { rec.weekendSum += Number(t.amount || 0); rec.weekendCount += 1; }
        else { rec.weekdaySum += Number(t.amount || 0); rec.weekdayCount += 1; }
        byCategory.set(cat, rec);
      });
      const overall = {
        weekendAvg: weekendCount ? Number((weekendSum / weekendCount).toFixed(2)) : 0,
        weekdayAvg: weekdayCount ? Number((weekdaySum / weekdayCount).toFixed(2)) : 0
      };
      const byCategoryAverages = Array.from(byCategory.entries()).map(([category, v]) => ({
        category,
        weekendAvg: v.weekendCount ? Number((v.weekendSum / v.weekendCount).toFixed(2)) : 0,
        weekdayAvg: v.weekdayCount ? Number((v.weekdaySum / v.weekdayCount).toFixed(2)) : 0
      }));
      return { overall, byCategory: byCategoryAverages };
    })();

    res.json({ success: true, anomalies, subscriptions, seasonal, weekendVsWeekday });
  } catch (error) {
    console.error('getInsightsSummary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAnomalies,
  getSubscriptionAlerts,
  getSeasonal,
  getWeekendWeekday,
  getInsightsSummary
};

