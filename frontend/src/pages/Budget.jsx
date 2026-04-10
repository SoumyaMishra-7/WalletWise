import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import Spinner from '../components/Spinner';
import AddExpense from './AddExpense';
import AddIncome from './AddIncome';
import SetBudget from './SetBudget';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Budget.css';

const categoryPalette = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

const Budget = () => {
  const { user, reloadUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [weeklyExpenses, setWeeklyExpenses] = useState([]);

  const formatCurrency = useCallback((amount) => {
    const currency = user?.currency || 'USD';
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }, [user?.currency]);

  const loadBudgetData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [budgetRes, dashboardRes] = await Promise.allSettled([
        api.get('/api/budget/stats/summary'),
        api.get('/api/dashboard/summary')
      ]);

      if (budgetRes.status === 'fulfilled' && budgetRes.value?.data?.success) {
        setBudgetSummary(budgetRes.value.data.summary || null);
      } else {
        setBudgetSummary(null);
      }

      if (dashboardRes.status === 'fulfilled' && dashboardRes.value?.data?.success) {
        setDashboardStats(dashboardRes.value.data.stats || null);
        setWeeklyExpenses(dashboardRes.value.data.weeklyExpenses || []);
      } else {
        setDashboardStats(null);
        setWeeklyExpenses([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  const handleDataChange = useCallback(async () => {
    setShowExpenseModal(false);
    setShowIncomeModal(false);
    setShowBudgetModal(false);
    await reloadUser?.();
    await loadBudgetData(true);
  }, [loadBudgetData, reloadUser]);

  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(daysInMonth - dayOfMonth, 0);
  const weekSpent = weeklyExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totals = useMemo(() => {
    const monthlyBudget = Number(dashboardStats?.monthlyBudget ?? budgetSummary?.totalBudget ?? 0);
    const spent = Number(dashboardStats?.monthlyExpenses ?? budgetSummary?.spent ?? 0);
    const income = Number(dashboardStats?.monthlyIncome ?? 0);
    const walletBalance = Number(dashboardStats?.totalBalance ?? user?.walletBalance ?? 0);
    const remainingBudget = monthlyBudget > 0
      ? Number(dashboardStats?.budgetLeft ?? Math.max(monthlyBudget - spent, 0))
      : 0;
    const budgetUsed = monthlyBudget > 0 ? Math.min((spent / monthlyBudget) * 100, 100) : 0;
    const safeDailySpend = daysLeft > 0 ? remainingBudget / daysLeft : remainingBudget;
    const expectedSpendByToday = monthlyBudget > 0 ? (monthlyBudget / daysInMonth) * dayOfMonth : 0;
    const paceDelta = spent - expectedSpendByToday;

    return {
      monthlyBudget,
      spent,
      income,
      walletBalance,
      remainingBudget,
      budgetUsed,
      safeDailySpend,
      expectedSpendByToday,
      paceDelta
    };
  }, [budgetSummary, dashboardStats, dayOfMonth, daysInMonth, daysLeft, user?.walletBalance]);

  const weeklyBudgetTarget = useMemo(() => {
    if (!totals.monthlyBudget) return 0;
    return (totals.monthlyBudget / daysInMonth) * 7;
  }, [daysInMonth, totals.monthlyBudget]);

  const weeklyProgress = weeklyBudgetTarget > 0
    ? Math.min((weekSpent / weeklyBudgetTarget) * 100, 100)
    : 0;

  const topCategories = useMemo(() => {
    const categories = Array.isArray(budgetSummary?.categories) ? budgetSummary.categories : [];
    return categories
      .map((category, index) => ({
        id: `${category.name || 'category'}-${index}`,
        name: category.name || 'Other',
        spent: Number(category.spent || 0),
        allocated: Number(category.allocated || category.amount || 0),
        color: category.color || categoryPalette[index % categoryPalette.length]
      }))
      .filter((category) => category.allocated > 0 || category.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }, [budgetSummary]);

  const insights = useMemo(() => {
    const next = [];

    if (!totals.monthlyBudget) {
      next.push({
        emoji: '🪴',
        title: 'Start with a simple budget',
        text: 'Set one monthly budget and WalletWise will start giving you clearer pacing tips.'
      });
    } else if (totals.budgetUsed <= 50) {
      next.push({
        emoji: '😌',
        title: 'You are in a comfortable zone',
        text: `You have used ${Math.round(totals.budgetUsed)}% of your budget so far, so your pace looks steady.`
      });
    } else if (totals.budgetUsed <= 85) {
      next.push({
        emoji: '👀',
        title: 'Keep an eye on the pace',
        text: `You are at ${Math.round(totals.budgetUsed)}% used. Staying near ${formatCurrency(totals.safeDailySpend)} per day keeps things smooth.`
      });
    } else {
      next.push({
        emoji: '🚨',
        title: 'Budget is getting tight',
        text: `Only ${formatCurrency(totals.remainingBudget)} is left, so try to keep daily spend near ${formatCurrency(totals.safeDailySpend)}.`
      });
    }

    if (totals.monthlyBudget > 0) {
      if (totals.paceDelta > 0) {
        next.push({
          emoji: '📈',
          title: 'You are spending a bit faster than planned',
          text: `You are about ${formatCurrency(totals.paceDelta)} ahead of your ideal pace for this point in the month.`
        });
      } else {
        next.push({
          emoji: '✨',
          title: 'Your pace is under control',
          text: `You are about ${formatCurrency(Math.abs(totals.paceDelta))} below your ideal pace right now.`
        });
      }
    }

    if (topCategories[0]) {
      const leader = topCategories[0];
      const percentOfBudget = totals.monthlyBudget > 0
        ? Math.round((leader.spent / totals.monthlyBudget) * 100)
        : 0;
      next.push({
        emoji: '🧃',
        title: `${leader.name} is your biggest spend bucket`,
        text: `${formatCurrency(leader.spent)} spent here so far, about ${percentOfBudget}% of your monthly budget.`
      });
    }

    if (weeklyBudgetTarget > 0) {
      next.push({
        emoji: weekSpent > weeklyBudgetTarget ? '🛑' : '✅',
        title: weekSpent > weeklyBudgetTarget ? 'This week is running hot' : 'This week looks balanced',
        text: `${formatCurrency(weekSpent)} spent this week against a gentle target of ${formatCurrency(weeklyBudgetTarget)}.`
      });
    }

    return next.slice(0, 4);
  }, [formatCurrency, topCategories, totals, weekSpent, weeklyBudgetTarget]);

  const spendingTone = totals.budgetUsed >= 90
    ? 'danger'
    : totals.budgetUsed >= 70
      ? 'warning'
      : 'safe';

  if (loading) {
    return (
      <>
        <AppNavbar />
        <div className="budget-page budget-loading">
          <Spinner size={50} text="Loading your WalletWise budget..." />
        </div>
      </>
    );
  }

  return (
    <>
      <AppNavbar />
      <div className="budget-page">
        <div className="budget-shell">
          <header className="walletwise-budget-header">
            <div>
              <Link to="/dashboard" className="back-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </Link>
              <span className="budget-kicker">WalletWise Budget</span>
              <h1>Simple budget check-in for student life</h1>
              <p>Your numbers update as you add income, log expenses, or adjust your monthly budget.</p>
            </div>

            <button
              type="button"
              className={`refresh-chip ${refreshing ? 'refreshing' : ''}`}
              onClick={() => loadBudgetData(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh live data'}
            </button>
          </header>

          <section className="hero-card">
            <div className="hero-copy">
              <span className="hero-emoji">💸</span>
              <h2>{formatCurrency(totals.remainingBudget)} left to spend</h2>
              <p>
                {totals.monthlyBudget > 0
                  ? `You have used ${Math.round(totals.budgetUsed)}% of your ${formatCurrency(totals.monthlyBudget)} budget this month.`
                  : 'Set a monthly budget to start getting clearer pace feedback.'}
              </p>

              <div className="hero-metrics">
                <div className="metric-pill">
                  <span>Spending status</span>
                  <strong className={spendingTone}>
                    {spendingTone === 'safe' && '✅ Looking good'}
                    {spendingTone === 'warning' && '👀 Watch your pace'}
                    {spendingTone === 'danger' && '🚨 Tight budget'}
                  </strong>
                </div>

                <div className="metric-pill">
                  <span>Safe daily spend</span>
                  <strong>{formatCurrency(totals.safeDailySpend)}</strong>
                </div>

                <div className="metric-pill">
                  <span>Wallet balance</span>
                  <strong>{formatCurrency(totals.walletBalance)}</strong>
                </div>
              </div>
            </div>

            <div className="hero-side">
              <div className="hero-balance-card">
                <span>This month</span>
                <strong>{formatCurrency(totals.spent)}</strong>
                <small>{formatCurrency(totals.income)} income added</small>
              </div>

              <div className="hero-progress">
                <div className="hero-progress-label">
                  <span>Budget progress</span>
                  <strong>{Math.round(totals.budgetUsed)}%</strong>
                </div>
                <div className="progress-track large">
                  <div className={`progress-fill ${spendingTone}`} style={{ width: `${Math.min(totals.budgetUsed, 100)}%` }}></div>
                </div>
                <small>{daysLeft} days left in this month</small>
              </div>
            </div>
          </section>

          <section className="budget-grid">
            <div className="dashboard-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">Weekly check</span>
                  <h3>Weekly spending progress</h3>
                </div>
                <strong>{formatCurrency(weekSpent)}</strong>
              </div>

              <p className="section-copy">
                Try to stay around {formatCurrency(weeklyBudgetTarget)} this week for a comfortable monthly pace.
              </p>

              <div className="progress-track">
                <div
                  className={`progress-fill ${weekSpent > weeklyBudgetTarget ? 'danger' : weeklyProgress > 80 ? 'warning' : 'safe'}`}
                  style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
                ></div>
              </div>

              <div className="weekly-mini-grid">
                {weeklyExpenses.length > 0 ? weeklyExpenses.map((item) => (
                  <div key={item.day} className="mini-day-card">
                    <span>{item.day}</span>
                    <strong>{formatCurrency(item.amount)}</strong>
                  </div>
                )) : (
                  <div className="empty-state-inline">No weekly spending yet. Nice and calm 😌</div>
                )}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">Top buckets</span>
                  <h3>Category breakdown</h3>
                </div>
                <strong>{topCategories.length}/5</strong>
              </div>

              <div className="category-list">
                {topCategories.length > 0 ? topCategories.map((category) => {
                  const share = totals.spent > 0 ? Math.round((category.spent / totals.spent) * 100) : 0;
                  const utilization = category.allocated > 0 ? Math.min((category.spent / category.allocated) * 100, 100) : 0;

                  return (
                    <div key={category.id} className="category-row">
                      <div className="category-meta">
                        <span className="category-dot" style={{ backgroundColor: category.color }}></span>
                        <div>
                          <strong>{category.name}</strong>
                          <small>{formatCurrency(category.spent)} of {formatCurrency(category.allocated)}</small>
                        </div>
                      </div>

                      <div className="category-right">
                        <span>{share}%</span>
                        <div className="progress-track tiny">
                          <div className="progress-fill safe" style={{ width: `${utilization}%`, backgroundColor: category.color }}></div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="empty-state-inline">
                    Add a budget first and your top categories will show up here 🎯
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="budget-grid secondary">
            <div className="dashboard-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">Smart notes</span>
                  <h3>Helpful insights</h3>
                </div>
              </div>

              <div className="insight-list">
                {insights.map((insight) => (
                  <div key={insight.title} className="insight-card">
                    <span className="insight-emoji">{insight.emoji}</span>
                    <div>
                      <strong>{insight.title}</strong>
                      <p>{insight.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-card quick-actions-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">Do it now</span>
                  <h3>Quick actions</h3>
                </div>
              </div>

              <div className="quick-actions">
                <button type="button" className="quick-action expense" onClick={() => setShowExpenseModal(true)}>
                  <span>➖</span>
                  <div>
                    <strong>Add Expense</strong>
                    <small>Log spending right away</small>
                  </div>
                </button>

                <button type="button" className="quick-action income" onClick={() => setShowIncomeModal(true)}>
                  <span>➕</span>
                  <div>
                    <strong>Add Income</strong>
                    <small>Update your inflow instantly</small>
                  </div>
                </button>

                <button type="button" className="quick-action budget" onClick={() => setShowBudgetModal(true)}>
                  <span>🛠️</span>
                  <div>
                    <strong>Adjust Budget</strong>
                    <small>Tune your monthly plan</small>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>

        <AddExpense
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={handleDataChange}
        />

        <AddIncome
          isOpen={showIncomeModal}
          onClose={() => setShowIncomeModal(false)}
          onSuccess={handleDataChange}
        />

        <SetBudget
          isOpen={showBudgetModal}
          onClose={() => setShowBudgetModal(false)}
          onSetBudget={handleDataChange}
        />
      </div>
    </>
  );
};

export default Budget;
