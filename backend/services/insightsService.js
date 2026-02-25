const mongoose = require('mongoose');
const Transaction = require('../models/Transactions');
const Subscription = require('../models/Subscription');

/**
 * Normalizes text for comparison (lowercase, trimmed, Alphanumeric only)
 */
const normalizeText = (s) =>
    String(s || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');

/**
 * Calculates days between two dates
 */
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));

/**
 * Get start of week (Monday)
 */
const getStartOfWeek = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

const getInsightsSummary = async (userId) => {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 7 * 8);
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - 7 * 12);

    const currentWeekStart = getStartOfWeek(now);

    const pipeline = [
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                type: 'expense',
                date: { $gte: twelveMonthsAgo }
            }
        },
        {
            $project: {
                amount: 1,
                category: 1,
                date: 1,
                description: 1,
                isWeekend: {
                    $in: [{ $dayOfWeek: "$date" }, [1, 7]] // 1 is Sunday, 7 is Saturday in MongoDB
                },
                monthKey: { $dateToString: { format: "%Y-%m", date: "$date" } },
                weekStart: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: {
                            $dateSubtract: {
                                startDate: "$date",
                                unit: "day",
                                amount: { $subtract: [{ $dayOfWeek: "$date" }, 2] } // Adjusting to Monday start
                            }
                        }
                    }
                }
            }
        },
        {
            $facet: {
                seasonalByMonth: [
                    { $group: { _id: "$monthKey", total: { $sum: "$amount" } } },
                    { $sort: { _id: 1 } }
                ],
                seasonalByCategoryMonth: [
                    { $group: { _id: { category: "$category", month: "$monthKey" }, total: { $sum: "$amount" } } }
                ],
                weeklySpikes: [
                    { $match: { date: { $gte: eightWeeksAgo } } },
                    { $group: { _id: { category: "$category", weekStart: "$weekStart" }, total: { $sum: "$amount" } } }
                ],
                weekendVsWeekday: [
                    { $match: { date: { $gte: twelveWeeksAgo } } },
                    {
                        $group: {
                            _id: { category: "$category", isWeekend: "$isWeekend" },
                            total: { $sum: "$amount" },
                            count: { $sum: 1 }
                        }
                    }
                ],
                largeTransactionsStats: [
                    { $match: { date: { $gte: ninetyDaysAgo } } },
                    {
                        $group: {
                            _id: "$category",
                            mean: { $avg: "$amount" },
                            std: { $stdDevPop: "$amount" }
                        }
                    }
                ],
                largeTransactionsItems: [
                    { $match: { date: { $gte: ninetyDaysAgo }, amount: { $gte: 1000 } } },
                    { $project: { _id: 1, amount: 1, category: 1, date: 1 } }
                ],
                subscriptionTx: [
                    // Using subset of fields for sub matching to save memory
                    { $project: { amount: 1, date: 1, description: 1, category: 1 } }
                ]
            }
        }
    ];

    const [results] = await Transaction.aggregate(pipeline);

    // Post-processing logic (keep minimal)

    // 1. Anomalies - Weekly Spikes
    const spikes = [];
    const weeklyMap = new Map();
    results.weeklySpikes.forEach(item => {
        weeklyMap.set(`${item._id.weekStart}|${item._id.category}`, item.total);
    });

    const categories = [...new Set(results.weeklySpikes.map(i => i._id.category))];
    categories.forEach(cat => {
        const thisWeekKey = `${currentWeekStart.toISOString().slice(0, 10)}|${cat}`;
        const thisWeek = weeklyMap.get(thisWeekKey) || 0;

        const prevs = [];
        for (let i = 1; i <= 7; i++) {
            const ws = new Date(currentWeekStart);
            ws.setDate(ws.getDate() - 7 * i);
            const key = `${ws.toISOString().slice(0, 10)}|${cat}`;
            prevs.push(weeklyMap.get(key) || 0);
        }
        const avgPrev = prevs.length ? prevs.reduce((a, b) => a + b, 0) / prevs.length : 0;
        const ratio = avgPrev > 0 ? thisWeek / Math.max(1, avgPrev) : (thisWeek > 0 ? Infinity : 0);

        if (thisWeek >= 1 && ratio >= 2) {
            spikes.push({
                category: cat,
                thisWeek: Number(thisWeek.toFixed(2)),
                averageWeek: Number(avgPrev.toFixed(2)),
                ratio: Number((ratio === Infinity ? 99 : ratio).toFixed(2)),
                message: avgPrev > 0
                    ? `You spent ${ratio.toFixed(1)}x more on ${cat} this week`
                    : `You started spending on ${cat} this week`
            });
        }
    });

    // 2. Anomalies - Large Transactions
    const largeTransactions = [];
    const statsMap = new Map();
    results.largeTransactionsStats.forEach(s => statsMap.set(s._id, s));

    results.largeTransactionsItems.forEach(t => {
        const stat = statsMap.get(t.category);
        if (stat && stat.std > 0) {
            const z = (t.amount - stat.mean) / stat.std;
            if (z >= 2) {
                largeTransactions.push({
                    id: t._id,
                    amount: t.amount,
                    category: t.category,
                    date: t.date,
                    zScore: Number(z.toFixed(2)),
                    message: `Unusually large ${t.category} expense: ₹${t.amount.toFixed(0)}`
                });
            }
        }
    });

    // 3. Seasonal
    const monthlyTotals = results.seasonalByMonth.map(m => ({
        month: m._id,
        amount: Number(m.total.toFixed(2))
    }));

    const byCategory = new Map();
    results.seasonalByCategoryMonth.forEach(item => {
        const list = byCategory.get(item._id.category) || [];
        list.push({ month: item._id.month, amount: item.total });
        byCategory.set(item._id.category, list);
    });

    const categoryPeaks = [];
    byCategory.forEach((list, cat) => {
        const peak = list.reduce((max, cur) => (cur.amount > max.amount ? cur : max), { amount: -1 });
        if (peak && peak.amount > 0) {
            categoryPeaks.push({ category: cat, peakMonth: peak.month, amount: Number(peak.amount.toFixed(2)) });
        }
    });

    // 4. Weekend vs Weekday
    const catAvgMap = new Map();
    let weekendSum = 0, weekendCount = 0, weekdaySum = 0, weekdayCount = 0;

    results.weekendVsWeekday.forEach(item => {
        const cat = item._id.category;
        const isWk = item._id.isWeekend;
        const data = catAvgMap.get(cat) || { weekendSum: 0, weekendCount: 0, weekdaySum: 0, weekdayCount: 0 };

        if (isWk) {
            data.weekendSum += item.total;
            data.weekendCount += item.count;
            weekendSum += item.total;
            weekendCount += item.count;
        } else {
            data.weekdaySum += item.total;
            data.weekdayCount += item.count;
            weekdaySum += item.total;
            weekdayCount += item.count;
        }
        catAvgMap.set(cat, data);
    });

    const weekendVsWeekday = {
        overall: {
            weekendAvg: weekendCount ? Number((weekendSum / weekendCount).toFixed(2)) : 0,
            weekdayAvg: weekdayCount ? Number((weekdaySum / weekdayCount).toFixed(2)) : 0
        },
        byCategory: Array.from(catAvgMap.entries()).map(([category, v]) => ({
            category,
            weekendAvg: v.weekendCount ? Number((v.weekendSum / v.weekendCount).toFixed(2)) : 0,
            weekdayAvg: v.weekdayCount ? Number((v.weekdaySum / v.weekdayCount).toFixed(2)) : 0
        }))
    };

    // 5. Subscription Alerts
    const subs = await Subscription.find({ userId, isActive: true });
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);
    in7.setHours(23, 59, 59, 999);

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

    const cycleDays = (billingCycle) => {
        if (billingCycle === 'weekly') return 7;
        if (billingCycle === 'yearly') return 365;
        return 30;
    };

    const txTextIndex = results.subscriptionTx.map((t) => ({
        date: new Date(t.date),
        amount: Number(t.amount || 0),
        text: normalizeText(t.description || t.category)
    }));

    const possiblyUnused = [];
    subs.forEach((s) => {
        const key = normalizeText(`${s.provider || ''} ${s.name}`);
        const candidates = txTextIndex
            .filter((t) =>
                key && t.text &&
                (t.text.includes(normalizeText(s.name)) || (s.provider && t.text.includes(normalizeText(s.provider))))
            )
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

    return {
        anomalies: { weeklySpikes: spikes, largeTransactions },
        seasonal: { monthlyTotals, categoryPeaks },
        weekendVsWeekday,
        subscriptions: { dueSoon, possiblyUnused }
    };
};

module.exports = {
    getInsightsSummary,
    normalizeText,
    daysBetween
};
