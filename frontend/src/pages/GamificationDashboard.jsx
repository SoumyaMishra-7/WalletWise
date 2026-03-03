import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { toast } from 'react-hot-toast';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaFireAlt,
  FaHeart,
  FaLock,
  FaMedal,
  FaPiggyBank
} from 'react-icons/fa';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import './GamificationDashboard.css';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateKey = (dateLike) => {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toCents = (value) => Math.round(Number(value || 0) * 100);

const GamificationDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [gamification, setGamification] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingBoost, setSendingBoost] = useState(false);
  const today = useMemo(() => new Date(), []);

  const formatCurrency = (amount) => {
    const currency = user?.currency || 'USD';
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount || 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statusRes, txRes, budgetRes] = await Promise.allSettled([
          api.get('/api/gamification/status'),
          api.get('/api/transactions?limit=500'),
          api.get('/api/budget/current')
        ]);

        if (statusRes.status === 'fulfilled' && statusRes.value?.data?.success) {
          const data = statusRes.value.data.data;
          setGamification(data);

          if (data.level > 1) {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.8 },
              colors: ['#FFD700', '#FFA500', '#FF8C42']
            });
          }
        } else {
          setError('Could not load achievements.');
        }

        if (txRes.status === 'fulfilled') {
          setTransactions(txRes.value?.data?.transactions || []);
        }

        if (budgetRes.status === 'fulfilled' && budgetRes.value?.data?.success) {
          setBudget(budgetRes.value?.data?.budget || null);
        } else {
          setBudget(null);
        }
      } catch (err) {
        setError('Could not load achievements.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const dailyNet = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => {
      const key = toDateKey(tx.date);
      const amount = Number(tx.amount || 0);
      if (!map[key]) map[key] = { income: 0, expense: 0, net: 0 };
      if (tx.type === 'income') map[key].income += amount;
      if (tx.type === 'expense') map[key].expense += amount;
      map[key].net = map[key].income - map[key].expense;
    });
    return map;
  }, [transactions]);

  const todayKey = toDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  const todaySaved = Math.max(0, dailyNet[todayKey]?.net || 0);
  const yesterdaySaved = Math.max(0, dailyNet[yesterdayKey]?.net || 0);
  const isTwoDaySavingStreak = todaySaved > 0 && yesterdaySaved > 0;
  const twoDayBoostAmount = todaySaved + yesterdaySaved;

  const savedDatesSet = useMemo(() => {
    const set = new Set();
    Object.entries(dailyNet).forEach(([key, value]) => {
      if ((value?.net || 0) > 0) set.add(key);
    });
    return set;
  }, [dailyNet]);

  const calendarMeta = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayStartOffset = (firstDate.getDay() + 6) % 7;
    return { year, month, daysInMonth, mondayStartOffset };
  }, [today]);

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < calendarMeta.mondayStartOffset; i += 1) cells.push(null);
    for (let day = 1; day <= calendarMeta.daysInMonth; day += 1) cells.push(day);
    return cells;
  }, [calendarMeta]);

  const suggestionData = useMemo(() => {
    const thisMonthExpenses = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return tx.type === 'expense' &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    });
    const thisMonthTotal = thisMonthExpenses.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const avgDailyExpense = thisMonthTotal / Math.max(today.getDate(), 1);
    const microSave = Math.max(1, Math.round(avgDailyExpense * 0.1));
    const remainingDays = Math.max(1, calendarMeta.daysInMonth - today.getDate() + 1);
    const monthImpact = microSave * remainingDays;

    const categoryTotals = {};
    thisMonthExpenses.forEach((tx) => {
      const cat = tx.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount || 0);
    });
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    return {
      microSave,
      monthImpact,
      topCategory
    };
  }, [transactions, today, calendarMeta.daysInMonth]);

  const handleSendTwoDayBoost = async () => {
    if (!isTwoDaySavingStreak || twoDayBoostAmount <= 0) {
      toast.error('Complete 2 days of positive savings first.');
      return;
    }
    if (!budget?.id || !Array.isArray(budget.categories) || budget.categories.length === 0) {
      toast.error('Set a monthly budget first to receive this boost.');
      return;
    }

    try {
      setSendingBoost(true);

      const boostCents = toCents(twoDayBoostAmount);
      const currentTotalCents = toCents(budget.totalBudget);
      const newTotalCents = currentTotalCents + boostCents;

      const categoriesCents = budget.categories.map((cat) => ({
        ...cat,
        amountCents: toCents(cat.amount)
      }));

      let targetIndex = categoriesCents.findIndex((cat) =>
        String(cat.name || '').toLowerCase().includes('saving')
      );
      if (targetIndex === -1) {
        targetIndex = categoriesCents.reduce(
          (best, cat, idx, arr) => (cat.amountCents > arr[best].amountCents ? idx : best),
          0
        );
      }

      categoriesCents[targetIndex].amountCents += boostCents;

      let updatedCategories = categoriesCents.map((cat) => ({
        name: cat.name,
        categoryType: cat.categoryType,
        color: cat.color,
        amount: Number((cat.amountCents / 100).toFixed(2)),
        percentage: Number(((cat.amountCents / Math.max(1, newTotalCents)) * 100).toFixed(2))
      }));

      const totalPercentage = updatedCategories.reduce((sum, cat) => sum + cat.percentage, 0);
      const diff = Number((100 - totalPercentage).toFixed(2));
      updatedCategories[targetIndex] = {
        ...updatedCategories[targetIndex],
        percentage: Number((updatedCategories[targetIndex].percentage + diff).toFixed(2))
      };

      await api.put(`/api/budget/${budget.id}`, {
        totalBudget: Number((newTotalCents / 100).toFixed(2)),
        categories: updatedCategories
      });

      setBudget((prev) => prev ? {
        ...prev,
        totalBudget: Number((newTotalCents / 100).toFixed(2)),
        categories: updatedCategories
      } : prev);

      toast.success(`Added ${formatCurrency(twoDayBoostAmount)} to your budget pool.`);
    } catch (err) {
      toast.error('Could not send savings boost to budget.');
    } finally {
      setSendingBoost(false);
    }
  };

  if (loading) {
    return (
      <div className="gamification-container loading">
        <div className="spinner"></div>
        <p>Loading your achievements...</p>
      </div>
    );
  }

  if (error || !gamification) {
    return (
      <div className="gamification-container error">
        <h2>Oops!</h2>
        <p>{error || 'Could not load achievements.'}</p>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>Go Back</button>
      </div>
    );
  }

  const { level, totalXP, progress, nextLevelXP, currentStreak, highestStreak, unlockedBadges, allBadges } = gamification;

  return (
    <div className="gamification-container">
      <header className="gami-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h1>Your Financial Journey</h1>
        <p>Turn good habits into great rewards.</p>
      </header>

      <div className="stats-hero">
        <div className="level-ring">
          <div className="level-number">
            <span>Lvl</span>
            <h2>{level}</h2>
          </div>
          <svg viewBox="0 0 36 36" className="circular-chart orange">
            <path
              className="circle-bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="circle"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>

        <div className="xp-details">
          <h3>{totalXP} XP <span>Total Experience</span></h3>
          <p>{Math.max(0, nextLevelXP - totalXP)} XP to Level {level + 1}</p>
          <div className="xp-bar-container">
            <div className="xp-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="streak-box">
          <FaFireAlt className={`streak-icon ${currentStreak > 0 ? 'active' : ''}`} />
          <div className="streak-text">
            <h3>{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</h3>
            <p>Current Streak</p>
            <small>Best: {highestStreak} days</small>
          </div>
        </div>
      </div>

      <section className="savings-cute-section">
        <div className="savings-cute-header">
          <div>
            <h2><FaHeart /> Daily Savings Love</h2>
            <p>Small saves every day become your emergency superpower.</p>
          </div>
          <div className={`savings-streak-chip ${isTwoDaySavingStreak ? 'ready' : ''}`}>
            {isTwoDaySavingStreak ? <FaCheckCircle /> : <FaPiggyBank />}
            {isTwoDaySavingStreak ? '2-day streak unlocked' : 'Keep saving daily'}
          </div>
        </div>

        <div className="savings-cute-grid">
          <div className="calendar-card">
            <div className="calendar-title">
              <h3>{monthNames[calendarMeta.month]} {calendarMeta.year}</h3>
              <span>Auto-checks when daily savings are positive</span>
            </div>
            <div className="calendar-weekdays">
              {weekdayNames.map((name) => <span key={name}>{name}</span>)}
            </div>
            <div className="calendar-days">
              {calendarCells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="day-cell empty"></div>;
                const key = toDateKey(new Date(calendarMeta.year, calendarMeta.month, day));
                const isSavedDay = savedDatesSet.has(key);
                const isToday = key === todayKey;
                return (
                  <div key={key} className={`day-cell ${isSavedDay ? 'saved' : ''} ${isToday ? 'today' : ''}`}>
                    <span>{day}</span>
                    {isSavedDay && <FaCheckCircle className="tick-icon" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reflection-card">
            <h3>Real-time saving reflection</h3>
            <div className="reflection-list">
              <div className="reflection-item">
                <strong>Micro-save idea</strong>
                <p>If you save {formatCurrency(suggestionData.microSave)} daily, you can build {formatCurrency(suggestionData.monthImpact)} more this month.</p>
              </div>
              <div className="reflection-item">
                <strong>When you need it most</strong>
                <p>Consistent small savings can absorb surprise transport, medical, or utility bills without stress.</p>
              </div>
              <div className="reflection-item">
                <strong>Top spending cue</strong>
                <p>
                  {suggestionData.topCategory
                    ? `Your biggest spend is ${suggestionData.topCategory[0]} (${formatCurrency(suggestionData.topCategory[1])}). A 10% trim there helps fast.`
                    : 'Add a few transactions to unlock your top personalized cue.'}
                </p>
              </div>
            </div>

            <div className="boost-box">
              <p>
                2-day savings boost:
                <strong> {formatCurrency(twoDayBoostAmount)}</strong>
              </p>
              <button
                className="btn-primary boost-btn"
                type="button"
                onClick={handleSendTwoDayBoost}
                disabled={!isTwoDaySavingStreak || sendingBoost}
              >
                {sendingBoost ? 'Sending...' : 'Send to Budget'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="badges-section">
        <div className="section-title">
          <h2><FaMedal /> Badges Gallery</h2>
          <span>{unlockedBadges.length} / {allBadges.length} Unlocked</span>
        </div>

        <div className="badges-grid">
          {allBadges.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <div key={badge.id} className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                <div className="badge-icon-wrapper">
                  {isUnlocked ? (
                    <span className="badge-emoji">{badge.icon}</span>
                  ) : (
                    <FaLock className="lock-icon" />
                  )}
                </div>
                <h4>{badge.name}</h4>
                <p>{badge.description}</p>
                {isUnlocked && <div className="unlocked-label">Achieved</div>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default GamificationDashboard;
