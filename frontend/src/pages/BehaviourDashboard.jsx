import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Spinner from '../components/Spinner';
import AddExpense from './AddExpense';
import AddIncome from './AddIncome';
import SetBudget from './SetBudget';
import { useAuth } from '../context/AuthContext';
import './BehaviourDashboard.css';

const categoryColors = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

const BehaviourDashboard = () => {
  const navigate = useNavigate();
  const { user, reloadUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const formatCurrency = useCallback((amount) => {
    const currency = user?.currency || 'USD';
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }, [user?.currency]);

  const fetchCoachData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [summaryRes, txRes] = await Promise.allSettled([
        api.get('/api/dashboard/summary'),
        api.get('/api/transactions?limit=200')
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data?.success) {
        setSummary(summaryRes.value.data);
      } else {
        setSummary(null);
      }

      if (txRes.status === 'fulfilled') {
        setTransactions(txRes.value?.data?.transactions || []);
      } else {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  const handleMoneyChange = useCallback(async () => {
    setShowExpenseModal(false);
    setShowIncomeModal(false);
    setShowBudgetModal(false);
    await reloadUser?.();
    await fetchCoachData(true);
  }, [fetchCoachData, reloadUser]);

  const stats = useMemo(() => summary?.stats || {}, [summary]);
  const goals = useMemo(() => summary?.savingsGoals || [], [summary]);
  const categorySpending = useMemo(() => summary?.categorySpending || [], [summary]);
  const today = useMemo(() => new Date(), []);
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(daysInMonth - dayOfMonth, 0);

  const coach = useMemo(() => {
    const monthlyBudget = Number(stats.monthlyBudget || 0);
    const spent = Number(stats.monthlyExpenses || 0);
    const income = Number(stats.monthlyIncome || 0);
    const balance = Number(stats.totalBalance || user?.walletBalance || 0);
    const remaining = monthlyBudget > 0 ? Math.max(monthlyBudget - spent, 0) : balance;
    const budgetUsed = monthlyBudget > 0 ? Math.min((spent / monthlyBudget) * 100, 100) : 0;
    const safeDailySpend = daysLeft > 0 ? remaining / daysLeft : remaining;
    const idealSpendToday = monthlyBudget > 0 ? (monthlyBudget / daysInMonth) * dayOfMonth : 0;
    const overspendingBy = Math.max(0, spent - idealSpendToday);
    const projectedSpend = dayOfMonth > 0 ? (spent / dayOfMonth) * daysInMonth : 0;
    const projectedOver = monthlyBudget > 0 ? Math.max(projectedSpend - monthlyBudget, 0) : 0;

    return {
      monthlyBudget,
      spent,
      income,
      balance,
      remaining,
      budgetUsed,
      safeDailySpend,
      overspendingBy,
      projectedSpend,
      projectedOver
    };
  }, [dayOfMonth, daysInMonth, daysLeft, stats, user?.walletBalance]);

  const spendingStatus = coach.monthlyBudget === 0
    ? { tone: 'neutral', label: 'Set a budget to unlock my best advice', emoji: '🪴' }
    : coach.budgetUsed >= 90
      ? { tone: 'danger', label: 'Slow down today', emoji: '🚨' }
      : coach.budgetUsed >= 70
        ? { tone: 'warning', label: 'Be careful for a few days', emoji: '👀' }
        : { tone: 'safe', label: 'You are doing okay', emoji: '✅' };

  const topCategories = useMemo(() => categorySpending
    .map((category, index) => ({
      id: `${category.name || 'category'}-${index}`,
      name: category.name || 'Other',
      amount: Number(category.amount || 0),
      color: categoryColors[index % categoryColors.length]
    }))
    .filter((category) => category.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3), [categorySpending]);

  const topGoal = useMemo(() => {
    if (!goals.length) return null;
    return [...goals]
      .map((goal) => {
        const target = Number(goal.targetAmount || 0);
        const current = Number(goal.currentAmount || 0);
        const progress = goal.progress
          ? Math.round(goal.progress)
          : target > 0
            ? Math.min(100, Math.round((current / target) * 100))
            : 0;

        return {
          id: goal.id || goal._id || goal.name,
          name: goal.name || 'Savings goal',
          target,
          current,
          progress
        };
      })
      .sort((a, b) => b.progress - a.progress)[0];
  }, [goals]);

  const recentExpenses = useMemo(() => transactions
    .filter((transaction) => transaction.type === 'expense')
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [transactions]);

  const alertMessage = useMemo(() => {
    const top = topCategories[0];

    if (!coach.monthlyBudget) {
      return {
        emoji: '🌱',
        title: 'I need one budget number first',
        text: 'Set your monthly budget and I will tell you exactly what is safe to spend each day.'
      };
    }

    if (coach.projectedOver > 0) {
      return {
        emoji: '🚧',
        title: 'You may cross your budget this month',
        text: `At this pace, you may go over by about ${formatCurrency(coach.projectedOver)}. Today, keep spending near ${formatCurrency(coach.safeDailySpend)}.`
      };
    }

    if (coach.overspendingBy > 0) {
      return {
        emoji: '⚠️',
        title: 'You spent a little faster than planned',
        text: `You are about ${formatCurrency(coach.overspendingBy)} ahead of the ideal pace. A low-spend day can bring you back.`
      };
    }

    if (top) {
      return {
        emoji: '🙂',
        title: 'Your spending looks manageable',
        text: `${top.name} is your biggest spend area, but your overall budget still looks under control.`
      };
    }

    return {
      emoji: '😌',
      title: 'No spending pressure right now',
      text: 'No major expense pattern yet. Add expenses as they happen and I will guide you.'
    };
  }, [coach, formatCurrency, topCategories]);

  const suggestions = useMemo(() => {
    const top = topCategories[0];
    const hasTodayExpense = recentExpenses.some((transaction) => {
      const date = new Date(transaction.date);
      return date.toDateString() === today.toDateString();
    });

    const items = [];

    if (top) {
      items.push({
        emoji: '✂️',
        title: `Trim ${top.name} just a bit`,
        text: `Try saving ${formatCurrency(top.amount * 0.1)} from ${top.name} this month. Small cuts count.`
      });
    }

    items.push({
      emoji: '🍱',
      title: 'Pick one planned spend today',
      text: `Keep today's spending close to ${formatCurrency(coach.safeDailySpend)} so tomorrow stays easy.`
    });

    if (!hasTodayExpense) {
      items.push({
        emoji: '📝',
        title: 'Log spending as soon as it happens',
        text: 'You have not logged an expense today. Quick logging keeps my advice accurate.'
      });
    }

    if (topGoal && topGoal.progress < 100) {
      items.push({
        emoji: '🎯',
        title: `Protect your ${topGoal.name} goal`,
        text: `Even a small transfer helps. You are already ${topGoal.progress}% there.`
      });
    }

    return items.slice(0, 4);
  }, [coach.safeDailySpend, formatCurrency, recentExpenses, today, topCategories, topGoal]);

  if (loading) {
    return (
      <div className="coach-page coach-loading">
        <Spinner size={60} text="AI Money Coach is checking your money..." />
      </div>
    );
  }

  return (
    <div className="coach-page">
      <div className="coach-shell">
        <header className="coach-header">
          <button className="back-link" onClick={() => navigate('/dashboard')} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <div className="coach-header-row">
            <div>
              <span className="coach-kicker">AI Money Coach</span>
              <h1>Here is what to do with your money today.</h1>
              <p>No complex charts. Just a clear plan based on your budget, income, expenses, and goals.</p>
            </div>

            <button
              className="coach-refresh"
              type="button"
              onClick={() => fetchCoachData(true)}
              disabled={refreshing}
            >
              {refreshing ? 'Updating...' : 'Refresh advice'}
            </button>
          </div>
        </header>

        <section className={`coach-hero ${spendingStatus.tone}`}>
          <div>
            <span className="hero-bubble">{spendingStatus.emoji}</span>
            <p className="coach-kicker">Money left</p>
            <h2>{formatCurrency(coach.remaining)}</h2>
            <p className="hero-text">
              {coach.monthlyBudget
                ? `${Math.round(coach.budgetUsed)}% of your monthly budget is used. ${spendingStatus.label}.`
                : `Your wallet balance is ${formatCurrency(coach.balance)}. Set a budget so I can coach you better.`}
            </p>
          </div>

          <div className="hero-plan-card">
            <span>Safe to spend today</span>
            <strong>{formatCurrency(coach.safeDailySpend)}</strong>
            <small>{daysLeft} days left this month</small>
            <div className="coach-progress">
              <div style={{ width: `${Math.min(coach.budgetUsed, 100)}%` }}></div>
            </div>
          </div>
        </section>

        <section className="coach-grid">
          <article className="coach-card alert-card">
            <span className="card-emoji">{alertMessage.emoji}</span>
            <div>
              <p className="coach-kicker">Personal alert</p>
              <h3>{alertMessage.title}</h3>
              <p>{alertMessage.text}</p>
            </div>
          </article>

          <article className="coach-card daily-card">
            <p className="coach-kicker">Today’s plan</p>
            <h3>Spend up to {formatCurrency(coach.safeDailySpend)}</h3>
            <p>
              If you need to spend more, try moving one non-urgent purchase to another day.
            </p>
            <div className="plan-row">
              <span>Income this month</span>
              <strong>{formatCurrency(coach.income)}</strong>
            </div>
            <div className="plan-row">
              <span>Spent this month</span>
              <strong>{formatCurrency(coach.spent)}</strong>
            </div>
          </article>
        </section>

        <section className="coach-grid lower">
          <article className="coach-card">
            <div className="card-heading">
              <div>
                <p className="coach-kicker">Top 3 spend areas</p>
                <h3>Where your money went</h3>
              </div>
            </div>

            <div className="top-category-list">
              {topCategories.length ? topCategories.map((category) => {
                const share = coach.spent > 0 ? Math.round((category.amount / coach.spent) * 100) : 0;
                return (
                  <div className="top-category" key={category.id}>
                    <div>
                      <span className="category-dot" style={{ background: category.color }}></span>
                      <strong>{category.name}</strong>
                    </div>
                    <span>{formatCurrency(category.amount)}</span>
                    <div className="mini-track">
                      <div style={{ width: `${share}%`, background: category.color }}></div>
                    </div>
                  </div>
                );
              }) : (
                <div className="coach-empty">No expenses yet. Add one and I will spot the pattern.</div>
              )}
            </div>
          </article>

          <article className="coach-card">
            <p className="coach-kicker">Smart suggestions</p>
            <h3>Small actions that help</h3>
            <div className="suggestion-list">
              {suggestions.map((item) => (
                <div className="suggestion-item" key={item.title}>
                  <span>{item.emoji}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="coach-grid lower">
          <article className="coach-card goal-card-coach">
            <p className="coach-kicker">Goal tracker</p>
            {topGoal ? (
              <>
                <h3>{topGoal.name}</h3>
                <p>{formatCurrency(topGoal.current)} saved of {formatCurrency(topGoal.target)}</p>
                <div className="goal-progress-track">
                  <div style={{ width: `${topGoal.progress}%` }}></div>
                </div>
                <strong>{topGoal.progress}% complete</strong>
              </>
            ) : (
              <>
                <h3>No savings goal yet</h3>
                <p>Create a goal for books, fees, travel, or an emergency fund.</p>
                <button type="button" className="coach-secondary-btn" onClick={() => navigate('/goals')}>
                  Create goal
                </button>
              </>
            )}
          </article>

          <article className="coach-card quick-card">
            <p className="coach-kicker">Update my advice</p>
            <h3>Quick actions</h3>
            <div className="coach-actions">
              <button type="button" onClick={() => setShowExpenseModal(true)}>
                <span>➖</span>
                Add Expense
              </button>
              <button type="button" onClick={() => setShowIncomeModal(true)}>
                <span>➕</span>
                Add Income
              </button>
              <button type="button" onClick={() => setShowBudgetModal(true)}>
                <span>🛠️</span>
                Adjust Budget
              </button>
            </div>
          </article>
        </section>
      </div>

      <AddExpense
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={handleMoneyChange}
      />

      <AddIncome
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        onSuccess={handleMoneyChange}
      />

      <SetBudget
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        onSetBudget={handleMoneyChange}
      />
    </div>
  );
};

export default BehaviourDashboard;
