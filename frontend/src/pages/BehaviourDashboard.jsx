import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LucideArrowUpRight,
  LucideArrowDownRight,
  LucideBrain,
  LucideCheckCircle2,
  LucideClock,
  LucideCompass,
  LucideGauge,
  LucideLightbulb,
  LucideRadar,
  LucideShieldAlert,
  LucideSparkles,
  LucideTag,
  LucideTrendingUp
} from 'lucide-react';
import api from '../api/client';
import './BehaviourDashboard.css';

const categoryToneMap = {
  groceries: 'tone-emerald',
  food: 'tone-emerald',
  dining: 'tone-rose',
  entertainment: 'tone-violet',
  transport: 'tone-sky',
  travel: 'tone-sky',
  education: 'tone-violet',
  savings: 'tone-emerald',
  health: 'tone-rose',
  shopping: 'tone-violet'
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const normalizeMerchant = (transaction) => {
  const raw = `${transaction.description || transaction.category || 'Unknown'}`.trim();
  if (!raw) return 'Unknown';
  return raw.replace(/\s+/g, ' ');
};

const BehaviourDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [summaryRes, txRes, insightsRes] = await Promise.all([
          api.get('/api/dashboard/summary'),
          api.get('/api/transactions'),
          api.get('/api/insights/summary')
        ]);

        if (!isMounted) return;
        setSummary(summaryRes.data || null);
        setTransactions(txRes.data?.transactions || []);
        setInsights(insightsRes.data || null);
      } catch (err) {
        if (!isMounted) return;
        setError('Unable to load AI analysis data right now.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = summary?.stats || {};
  const savingsGoals = useMemo(() => summary?.savingsGoals || [], [summary]);
  const categorySpending = summary?.categorySpending || [];

  const confidenceScore = useMemo(() => {
    if (!transactions.length) return null;
    const withCategory = transactions.filter((t) => t.category).length;
    return Math.round((withCategory / transactions.length) * 100);
  }, [transactions]);

  const autoTagged = useMemo(() => {
    const topTransactions = transactions.slice(0, 4);
    return topTransactions.map((t) => {
      const merchant = normalizeMerchant(t);
      const category = t.category || 'Uncategorized';
      const confidence = category && category !== 'Uncategorized'
        ? Math.min(95, Math.max(70, Math.round((confidenceScore || 80))))
        : Math.max(50, Math.round((confidenceScore || 70) - 20));
      const tone =
        categoryToneMap[`${category}`.toLowerCase()] ||
        categoryToneMap[`${merchant}`.toLowerCase()] ||
        'tone-emerald';
      return {
        id: t.id,
        merchant,
        code: t.paymentMethod || t.description || t.category || 'N/A',
        amount: t.amount,
        category,
        color: tone,
        confidence
      };
    });
  }, [transactions, confidenceScore]);

  const patternHighlights = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    if (expenses.length === 0) {
      return ['No spending patterns yet. Add a few transactions to see AI insights.'];
    }

    const byMerchant = new Map();
    expenses.forEach((t) => {
      const merchant = normalizeMerchant(t);
      const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' });
      const key = `${merchant}::${day}`;
      const entry = byMerchant.get(key) || { merchant, day, total: 0, count: 0 };
      entry.total += Number(t.amount || 0);
      entry.count += 1;
      byMerchant.set(key, entry);
    });

    const merchantPattern = Array.from(byMerchant.values())
      .filter((entry) => entry.count >= 2)
      .sort((a, b) => b.count - a.count)[0];

    const highlights = [];
    if (merchantPattern) {
      const avg = merchantPattern.total / merchantPattern.count;
      highlights.push(
        `You often spend ${formatCurrency(avg)} at ${merchantPattern.merchant} on ${merchantPattern.day}s.`
      );
    }

    const dayTotals = expenses.reduce((acc, t) => {
      const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + Number(t.amount || 0);
      return acc;
    }, {});
    const topDay = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
    if (topDay) {
      highlights.push(`Your highest spending day is ${topDay[0]} (${formatCurrency(topDay[1])}).`);
    }

    if (stats.monthlyExpenses) {
      const today = new Date();
      const dailyAvg = stats.monthlyExpenses / Math.max(today.getDate(), 1);
      highlights.push(`Average daily spend this month: ${formatCurrency(dailyAvg)}.`);
    }

    return highlights.slice(0, 3);
  }, [transactions, stats.monthlyExpenses]);

  const totalMonthlyContribution = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + Number(goal.monthlyContribution || 0), 0),
    [savingsGoals]
  );

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const dailyBurn = stats.monthlyExpenses ? stats.monthlyExpenses / Math.max(dayOfMonth, 1) : 0;
  const projectedSpend = dailyBurn * daysInMonth;
  const overspend = Math.max(0, projectedSpend - (stats.monthlyBudget || 0));
  const availableNow = stats.budgetLeft ?? stats.totalBalance ?? 0;

  const pulseStatus = stats.budgetUsedPercentage >= 90
    ? 'Needs Attention'
    : stats.budgetUsedPercentage >= 70
      ? 'Watchful'
      : 'Healthy';

  const pulseTone = stats.budgetUsedPercentage >= 90 ? 'danger' : stats.budgetUsedPercentage >= 70 ? 'warning' : 'healthy';

  const vitalSigns = [
    {
      id: 'available',
      label: 'Available Now',
      value: formatCurrency(availableNow),
      delta: stats.expenseTrend ? `${stats.expenseTrend > 0 ? '+' : ''}${stats.expenseTrend}%` : '0%',
      trend: stats.expenseTrend > 0 ? 'down' : 'up'
    },
    {
      id: 'burn',
      label: 'Daily Burn',
      value: formatCurrency(dailyBurn),
      delta: stats.expenseTrend ? `${stats.expenseTrend > 0 ? '+' : ''}${stats.expenseTrend}%` : '0%',
      trend: stats.expenseTrend > 0 ? 'up' : 'down'
    },
    {
      id: 'income',
      label: 'Income Pulse',
      value: formatCurrency(stats.monthlyIncome || 0),
      delta: stats.monthlyIncome >= stats.monthlyExpenses ? '+Healthy' : '-Lagging',
      trend: stats.monthlyIncome >= stats.monthlyExpenses ? 'up' : 'down'
    },
    {
      id: 'bills',
      label: 'Committed (30d)',
      value: formatCurrency(totalMonthlyContribution),
      delta: totalMonthlyContribution ? '+Active goals' : '0',
      trend: totalMonthlyContribution ? 'up' : 'down'
    }
  ];

  const topCategory = categorySpending[0];
  const opportunityItems = topCategory
    ? [
      {
        id: 1,
        label: `Cut ${topCategory.name} by 10%`,
        savings: formatCurrency(topCategory.amount * 0.1)
      }
    ]
    : [];

  const scenarios = [
    {
      id: 1,
      title: 'If you continue',
      detail: `Spending hits ${formatCurrency(projectedSpend)} by month-end.`,
      tone: 'scenario-dark'
    },
    topCategory
      ? {
        id: 2,
        title: `If you adjust ${topCategory.name}`,
        detail: `Save about ${formatCurrency(topCategory.amount * 0.1)} this month.`,
        tone: 'scenario-success'
      }
      : {
        id: 2,
        title: 'If you set a budget',
        detail: 'Create a budget to unlock projections.',
        tone: 'scenario-success'
      }
  ];

  const progressTrackers = savingsGoals.slice(0, 3).map((goal) => {
    const progress = goal.progress
      ? Math.round(goal.progress)
      : goal.targetAmount
        ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
        : 0;
    return {
      id: goal.id,
      label: goal.name,
      impact: `Target ${formatCurrency(goal.targetAmount)}`,
      progress
    };
  });

  const priorityAction = topCategory
    ? {
      title: `Reduce ${topCategory.name} spend`,
      detail: `You are already at ${formatCurrency(topCategory.amount)} in ${topCategory.name} this month.`,
      impact: `Save ${formatCurrency(topCategory.amount * 0.1)}`
    }
    : null;

  const insightMessages = useMemo(() => {
    if (!insights?.success) return [];
    const msgs = [];
    const an = insights.anomalies || {};
    (an.weeklySpikes || []).slice(0, 3).forEach((s) => msgs.push(s.message));
    (an.largeTransactions || []).slice(0, 3).forEach((t) => msgs.push(t.message));
    const subs = insights.subscriptions || {};
    (subs.dueSoon || []).slice(0, 3).forEach((d) => msgs.push(d.message));
    (subs.possiblyUnused || []).slice(0, 3).forEach((u) => msgs.push(u.message));
    const w = insights.weekendVsWeekday?.overall;
    if (w && (w.weekendAvg || w.weekdayAvg)) {
      const bias =
        w.weekendAvg > w.weekdayAvg
          ? `weekends (+${formatCurrency(w.weekendAvg - w.weekdayAvg)} per txn)`
          : w.weekendAvg < w.weekdayAvg
            ? `weekdays (+${formatCurrency(w.weekdayAvg - w.weekendAvg)} per txn)`
            : 'both equally';
      msgs.push(`Spending skews towards ${bias}.`);
    }
    const peaks = insights.seasonal?.categoryPeaks || [];
    peaks.slice(0, 2).forEach((p) => msgs.push(`${p.category} peaked in ${p.peakMonth}.`));
    return msgs.slice(0, 8);
  }, [insights]);

  if (loading) {
    return (
      <div className="ai-page">
        <div className="ai-content">
          <div className="ai-card">Loading AI analysis…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-page">
        <div className="ai-content">
          <div className="ai-card">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-page">
      <header className="ai-header">
        <div className="ai-header-top">
          <button className="back-link" onClick={() => navigate(-1)} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="ai-badge">
            <LucideBrain size={16} className="ai-badge-icon" />
            AI Analysis
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="ai-hero"
        >
          <div className="ai-hero-copy">
            <h1>Your money, decoded in real time.</h1>
            <p>
              Automatically tagged transactions, live health signals, and action-ready guidance — all tuned to your habits.
            </p>
          </div>
          <div className="ai-status-card">
            <div className="ai-status-text">
              <p className="ai-eyebrow">Quick status</p>
              <p className="ai-status-value">{pulseStatus}</p>
              <p className="ai-status-subtitle">
                AI confidence: {confidenceScore !== null ? `${confidenceScore}%` : 'N/A'}
              </p>
            </div>
            <div className="ai-status-icon">
              <LucideShieldAlert size={28} />
            </div>
          </div>
        </motion.div>
      </header>

      <main className="ai-content">
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } }
          }}
          className="ai-grid ai-grid-two"
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="ai-card"
          >
            <div className="ai-card-header">
              <div>
                <p className="ai-eyebrow">Auto-tagging</p>
                <h2>Transactions tagged by AI</h2>
              </div>
              <div className="ai-icon-pill ai-icon-indigo">
                <LucideTag size={18} />
              </div>
            </div>
            <div className="ai-stack">
              {autoTagged.length === 0 ? (
                <div className="ai-pattern-card">No transactions yet.</div>
              ) : (
                autoTagged.map((tx) => (
                  <div key={tx.id} className="ai-transaction-card">
                    <div className="ai-transaction-top">
                      <div className="ai-merchant">
                        <div className={`ai-merchant-avatar ${tx.color}`}>
                          {tx.merchant.slice(0, 1)}
                        </div>
                        <div>
                          <p className="ai-merchant-name">{tx.merchant}</p>
                          <p className="ai-merchant-subtitle">{tx.code} · {tx.category}</p>
                        </div>
                      </div>
                      <div className="ai-transaction-value">
                        <p>{formatCurrency(tx.amount)}</p>
                        <p>{tx.confidence}% confidence</p>
                      </div>
                    </div>
                    <div className="ai-confidence-track">
                      <div className="ai-confidence-fill" style={{ width: `${tx.confidence}%` }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="ai-card ai-card-contrast"
          >
            <div className="ai-card-header">
              <div>
                <p className="ai-eyebrow">Pattern highlights</p>
                <h2>Spending signatures</h2>
              </div>
              <div className="ai-icon-pill ai-icon-sky">
                <LucideRadar size={18} />
              </div>
            </div>
            <div className="ai-stack">
              {patternHighlights.map((item, idx) => (
                <div key={`${item}-${idx}`} className="ai-pattern-card">
                  <p>{item}</p>
                  <div className="ai-pattern-meta">
                    <LucideClock size={14} />
                    Pattern #{idx + 1} observed this month
                  </div>
                </div>
              ))}
              <div className="ai-highlight-card">
                <p>Merchant recognition enabled — bank codes are replaced with trusted names.</p>
                <div className="ai-highlight-meta">
                  <LucideCheckCircle2 size={14} />
                  {transactions.length ? 'Live merchant mapping active' : 'Awaiting transaction data'}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="ai-card"
        >
          <div className="ai-card-header">
            <div>
              <p className="ai-eyebrow">Smart feed</p>
              <h2>AI Insights</h2>
            </div>
            <div className="ai-icon-pill ai-icon-indigo">
              <LucideLightbulb size={18} />
            </div>
          </div>
          <div className="ai-stack">
            {insightMessages.length === 0 ? (
              <div className="ai-pattern-card">No insights yet. Add more transactions to unlock analysis.</div>
            ) : (
              insightMessages.map((msg, idx) => (
                <div key={`insight-${idx}`} className="ai-pattern-card">
                  <p>{msg}</p>
                </div>
              ))
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="ai-card ai-card-large"
        >
          <div className="ai-card-header">
            <div>
              <p className="ai-eyebrow">Real-time financial pulse</p>
              <h2>Vital signs dashboard</h2>
            </div>
            <div className="ai-icon-pill ai-icon-emerald">
              <LucideGauge size={18} />
            </div>
          </div>
          <div className="ai-metric-grid">
            {vitalSigns.map((item) => (
              <div key={item.id} className="ai-metric-card">
                <p>{item.label}</p>
                <h3>{item.value}</h3>
                <div className="ai-trend">
                  {item.trend === 'up' ? (
                    <LucideArrowUpRight size={14} className="trend-up" />
                  ) : (
                    <LucideArrowDownRight size={14} className="trend-down" />
                  )}
                  <span>{item.delta} vs last month</span>
                </div>
              </div>
            ))}
          </div>
          <div className="ai-subgrid">
            <div className="ai-snapshot-card">
              <div className="ai-snapshot-top">
                <p>Right now snapshot</p>
                <span>Available vs committed</span>
              </div>
              <div className="ai-snapshot-bar">
                <div className="ai-snapshot-labels">
                  <span>Available {formatCurrency(availableNow)}</span>
                  <span>Committed {formatCurrency(totalMonthlyContribution)}</span>
                </div>
                <div className="ai-progress">
                  <div
                    className="ai-progress-fill"
                    style={{
                      width: `${availableNow + totalMonthlyContribution > 0
                        ? Math.min((availableNow / (availableNow + totalMonthlyContribution)) * 100, 100)
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className={`ai-status-pill ${pulseTone}`}>
              <p className="ai-eyebrow">Quick status</p>
              <h3>{pulseStatus}</h3>
              <p>
                {pulseStatus === 'Healthy' && 'Spending is on pace with your budget.'}
                {pulseStatus === 'Watchful' && 'You are approaching your budget limits.'}
                {pulseStatus === 'Needs Attention' && 'Spending is above your budget pace.'}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="ai-grid ai-grid-two"
        >
          <div className="ai-card">
            <div className="ai-card-header">
              <div>
                <p className="ai-eyebrow">Predictive insights</p>
                <h2>30-day forecast bar</h2>
              </div>
              <div className="ai-icon-pill ai-icon-indigo">
                <LucideTrendingUp size={18} />
              </div>
            </div>
            <div className="ai-forecast">
              <div className="ai-forecast-labels">
                <span>Now</span>
                <span>Day {Math.min(15, daysInMonth)}</span>
                <span>Day {daysInMonth}</span>
              </div>
              <div className="ai-forecast-bar">
                <div
                  className="ai-forecast-fill"
                  style={{
                    width: `${stats.monthlyBudget
                      ? Math.min((projectedSpend / stats.monthlyBudget) * 100, 100)
                      : Math.min((stats.monthlyExpenses / Math.max(stats.monthlyIncome || 1, 1)) * 100, 100)}%`
                  }}
                ></div>
              </div>
              <div className="ai-scenarios">
                {scenarios.map((item) => (
                  <div key={item.id} className={`ai-scenario-card ${item.tone}`}>
                    <p className="ai-eyebrow">{item.title}</p>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ai-stack">
            <div className="ai-alert-card ai-alert-danger">
              <div className="ai-alert-title">
                <LucideShieldAlert size={18} />
                <p>Early warning system</p>
              </div>
              <p>
                {stats.monthlyBudget
                  ? overspend > 0
                    ? `On track to overspend by ${formatCurrency(overspend)}.`
                    : 'Spending is within your monthly budget.'
                  : 'Set a monthly budget to unlock alerts.'}
              </p>
            </div>
            <div className="ai-alert-card ai-alert-success">
              <div className="ai-alert-title">
                <LucideLightbulb size={18} />
                <p>Opportunity spots</p>
              </div>
              <div className="ai-opportunity-list">
                {opportunityItems.length === 0 ? (
                  <div className="ai-opportunity-item">
                    <span>No opportunities yet</span>
                    <span className="impact-strong">--</span>
                  </div>
                ) : (
                  opportunityItems.map((item) => (
                    <div key={item.id} className="ai-opportunity-item">
                      <span>{item.label}</span>
                      <span className="impact-strong">{item.savings}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="ai-card ai-card-gradient"
        >
          <div className="ai-card-header">
            <div>
              <p className="ai-eyebrow">Action-first recommendations</p>
              <h2>Do this today</h2>
            </div>
            <div className="ai-icon-pill ai-icon-glass">
              <LucideSparkles size={18} />
            </div>
          </div>
          <div className="ai-grid ai-grid-two">
            <div className="ai-priority-card">
              <p className="ai-eyebrow">Priority action</p>
              <h3>{priorityAction ? priorityAction.title : 'Add goals to unlock priority actions'}</h3>
              <p>{priorityAction ? priorityAction.detail : 'Create savings goals or budgets to receive tailored actions.'}</p>
              <div className="ai-impact-preview">
                <span>Impact preview</span>
                <span className="impact-strong">{priorityAction ? priorityAction.impact : 'N/A'}</span>
              </div>
              <button className="ai-primary-btn" type="button">
                {priorityAction ? 'Set action reminder' : 'Create a budget'}
              </button>
            </div>

            <div className="ai-stack">
              <div className="ai-card ai-card-subtle">
                <div className="ai-card-title-row">
                  <p>One-tap solutions</p>
                  <LucideCompass size={16} className="ai-muted-icon" />
                </div>
                <div className="ai-stack">
                  <button className="ai-action-btn" type="button">
                    Review top spending categories
                  </button>
                  <button className="ai-action-btn" type="button">
                    Move funds to a savings goal
                  </button>
                </div>
              </div>

              <div className="ai-card ai-card-subtle">
                <p className="ai-card-title">Progress trackers</p>
                <div className="ai-stack">
                  {progressTrackers.length === 0 ? (
                    <div className="ai-progress-item">
                      <div className="ai-progress-header">
                        <span>No active goals</span>
                        <span className="impact-strong">0%</span>
                      </div>
                      <div className="ai-progress">
                        <div className="ai-progress-fill ai-progress-fill-indigo" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  ) : (
                    progressTrackers.map((item) => (
                      <div key={item.id} className="ai-progress-item">
                        <div className="ai-progress-header">
                          <span>{item.label}</span>
                          <span className="impact-strong">{item.impact}</span>
                        </div>
                        <div className="ai-progress">
                          <div
                            className="ai-progress-fill ai-progress-fill-indigo"
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default BehaviourDashboard;
