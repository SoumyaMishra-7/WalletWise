import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/client';
import SavingGoal from './SavingGoal';
import AppNavbar from '../components/AppNavbar';
import {
  FaBook,
  FaBullseye,
  FaClock,
  FaGraduationCap,
  FaHome,
  FaLaptop,
  FaPlane,
  FaPlus,
  FaShieldAlt
} from 'react-icons/fa';
import './Goals.css';

const initialGoals = [
  {
    id: 'goal-1',
    title: 'Emergency Fund',
    type: 'Emergency Fund',
    target: 150000,
    current: 72000,
    targetDate: '2026-09-30',
    status: 'active'
  },
  {
    id: 'goal-2',
    title: 'Down Payment',
    type: 'Down Payment',
    target: 400000,
    current: 140000,
    targetDate: '2027-03-31',
    status: 'active'
  },
  {
    id: 'goal-3',
    title: 'Student Loan Payoff',
    type: 'Debt Reduction',
    target: 220000,
    current: 110000,
    targetDate: '2026-12-31',
    status: 'paused'
  },
  {
    id: 'goal-4',
    title: 'Vacation Escape',
    type: 'Savings Goal',
    target: 85000,
    current: 52000,
    targetDate: '2026-06-15',
    status: 'active'
  }
];

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [goalsError, setGoalsError] = useState('');
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addAmount, setAddAmount] = useState(0);
  const [addError, setAddError] = useState('');
  const [addingAmount, setAddingAmount] = useState(false);
  const location = useLocation();

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const formatDeadline = (date) => {
    if (!date) return 'No deadline';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const iconForGoal = (goal) => {
    const label = `${goal.type || ''} ${goal.title || ''}`.toLowerCase();
    if (label.includes('loan') || label.includes('student')) return FaGraduationCap;
    if (label.includes('tuition') || label.includes('books')) return FaBook;
    if (label.includes('laptop') || label.includes('tech')) return FaLaptop;
    if (label.includes('vacation') || label.includes('travel')) return FaPlane;
    if (label.includes('down payment') || label.includes('rent')) return FaHome;
    if (label.includes('emergency')) return FaShieldAlt;
    return FaBullseye;
  };

  const fetchGoals = useCallback(async () => {
    setLoadingGoals(true);
    setGoalsError('');

    try {
      const response = await api.get('/api/savings-goals');

      if (response.data?.success) {
        const mappedGoals = (response.data.goals || []).map((goal) => {
          const progress = goal.targetAmount > 0
            ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
            : 0;
          const status = progress >= 100 ? 'completed' : (goal.isActive ? 'active' : 'paused');

          return {
            id: goal._id || goal.id,
            title: goal.name,
            type: goal.category || 'Savings Goal',
            target: goal.targetAmount || 0,
            current: goal.currentAmount || 0,
            targetDate: goal.targetDate,
            status
          };
        });

        setGoals(mappedGoals);
      } else {
        setGoals(initialGoals);
        setGoalsError(response.data?.message || 'Failed to load goals');
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      setGoals(initialGoals);
      setGoalsError('Failed to load goals. Please try again.');
    } finally {
      setLoadingGoals(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [location.key, fetchGoals]);

  const progressForGoal = (goal) =>
    goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;

  const suggestedAmountForGoal = (goal) => {
    if (!goal) return 0;
    const remaining = Math.max(0, goal.target - goal.current);
    if (remaining === 0) return 0;
    if (goal.targetDate) {
      const now = new Date();
      const target = new Date(goal.targetDate);
      const months = Math.max(
        1,
        (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
      );
      const raw = Math.max(100, Math.round(remaining / months));
      return Math.min(remaining, Math.round(raw / 100) * 100);
    }
    return Math.min(remaining, Math.max(100, Math.round(remaining * 0.1)));
  };

  useEffect(() => {
    if (!selectedGoal) return;
    setAddAmount(suggestedAmountForGoal(selectedGoal));
    setAddError('');
  }, [selectedGoal]);

  const handleAddCustomAmount = async () => {
    if (!selectedGoal) return;
    const amountValue = Math.max(0, Number(addAmount || 0));
    if (!amountValue) return;
    setAddError('');
    setAddingAmount(true);

    try {
      const response = await api.patch(`/api/savings-goals/${selectedGoal.id}/add`, {
        amount: amountValue
      });

      if (!response.data?.success || !response.data?.goal) {
        throw new Error(response.data?.message || 'Failed to add amount');
      }

      const updatedGoal = {
        id: response.data.goal.id || response.data.goal._id,
        title: response.data.goal.name,
        type: response.data.goal.category || 'Savings Goal',
        target: response.data.goal.targetAmount || 0,
        current: response.data.goal.currentAmount || 0,
        targetDate: response.data.goal.targetDate,
        status: response.data.goal.isActive ? 'active' : 'paused'
      };

      setGoals((prev) =>
        prev.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal))
      );
      setSelectedGoal(updatedGoal);
      setAddAmount(suggestedAmountForGoal(updatedGoal));
    } catch (error) {
      console.error('Failed to add amount:', error);
      setAddError('Failed to add amount. Please try again.');
    } finally {
      setAddingAmount(false);
    }
  };

  const summary = useMemo(() => {
    const totalGoals = goals.length;
    const totalSaved = goals.reduce((sum, goal) => sum + (goal.current || 0), 0);
    const upcoming = goals
      .filter((goal) => goal.targetDate)
      .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))[0];

    return {
      totalGoals,
      totalSaved,
      nextDeadline: upcoming ? formatDeadline(upcoming.targetDate) : 'No upcoming deadlines'
    };
  }, [goals]);

  return (
    <div className="goals-page">
      <header className="goals-header">
        <div className="goals-header-content">
          <Link to="/dashboard" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="eyebrow">Student Goals</span>
          <h1>Make room for tuition, books, and the fun stuff.</h1>
          <p>Track every goal in one place and keep your savings on pace with deadlines.</p>
        </div>
      </header>

      <section className="goals-summary">
        <div className="summary-card">
          <div>
            <p className="summary-label">Goals Summary</p>
            <h2>{summary.totalGoals} goals in motion</h2>
          </div>
          <div className="summary-stats">
            <div>
              <span>Total Saved</span>
              <strong>{formatCurrency(summary.totalSaved)}</strong>
            </div>
            <div>
              <span>Next Deadline</span>
              <strong>{summary.nextDeadline}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="goals-grid">
        {loadingGoals ? (
          <div className="overview-card loading-card">
            <h3>Loading goals...</h3>
            <p>Fetching your latest goals.</p>
          </div>
        ) : goalsError ? (
          <div className="overview-card error-card">
            <h3>Could not load goals</h3>
            <p>{goalsError}</p>
            <button className="btn-secondary" onClick={fetchGoals}>Try again</button>
          </div>
        ) : goals.length === 0 ? (
          <div className="overview-card empty-card">
            <h3>No goals yet</h3>
            <p>Start with a small goal for textbooks or weekend plans.</p>
            <button className="btn-primary" onClick={() => setShowAddGoalModal(true)}>
              + Add your first goal
            </button>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = progressForGoal(goal);
            const GoalIcon = iconForGoal(goal);
            return (
              <div
                className={`goal-card ${goal.status}`}
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedGoal(goal)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedGoal(goal);
                  }
                }}
              >
                <div className="goal-card-top">
                  <div className="goal-icon">
                    <GoalIcon />
                  </div>
                  <div className="goal-text">
                    <span className="goal-type">{goal.type}</span>
                    <h3>{goal.title}</h3>
                  </div>
                  <div className="goal-deadline">
                    <FaClock />
                    {formatDeadline(goal.targetDate)}
                  </div>
                </div>

                <div className="goal-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="progress-meta">
                    <span>{progress}%</span>
                    <span>{formatCurrency(goal.current)} / {formatCurrency(goal.target)}</span>
                  </div>
                </div>

                <div className="goal-card-footer">
                  <div className="goal-amounts">
                    <span>Saved</span>
                    <strong>{formatCurrency(goal.current)}</strong>
                  </div>
                  <button
                    type="button"
                    className="quick-add"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedGoal(goal);
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <button className="floating-add" onClick={() => setShowAddGoalModal(true)} aria-label="Add goal">
        <FaPlus />
        Add Goal
      </button>

      {selectedGoal && (
        <div className="goal-modal-backdrop" onClick={() => setSelectedGoal(null)}>
          <div className="goal-modal" onClick={(event) => event.stopPropagation()}>
            <div className="goal-modal-header">
              <div className="goal-modal-icon">
                {React.createElement(iconForGoal(selectedGoal))}
              </div>
              <div>
                <p className="modal-label">{selectedGoal.type}</p>
                <h2>{selectedGoal.title}</h2>
                <span className="modal-deadline">Deadline: {formatDeadline(selectedGoal.targetDate)}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedGoal(null)} aria-label="Close">
                x
              </button>
            </div>
            <div className="goal-modal-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressForGoal(selectedGoal)}%` }}
                ></div>
              </div>
              <div className="progress-meta">
                <span>{progressForGoal(selectedGoal)}%</span>
                <span>{formatCurrency(selectedGoal.current)} / {formatCurrency(selectedGoal.target)}</span>
              </div>
            </div>
            <div className="goal-modal-stats">
              <div>
                <span>Saved</span>
                <strong>{formatCurrency(selectedGoal.current)}</strong>
              </div>
              <div>
                <span>Target</span>
                <strong>{formatCurrency(selectedGoal.target)}</strong>
              </div>
            </div>
            <div className="goal-modal-add">
              <div className="amount-field">
                <label htmlFor="goal-add-amount">Add amount</label>
                <input
                  id="goal-add-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={addAmount}
                  onChange={(event) => setAddAmount(Number(event.target.value))}
                />
              </div>
              <button
                className="btn-secondary"
                onClick={() => setAddAmount(suggestedAmountForGoal(selectedGoal))}
                disabled={addingAmount}
              >
                Use suggested {formatCurrency(suggestedAmountForGoal(selectedGoal))}
              </button>
            </div>
            {addError && <p className="add-error">{addError}</p>}
            <div className="goal-modal-actions">
              <button className="btn-primary" onClick={handleAddCustomAmount} disabled={addingAmount}>
                {addingAmount ? 'Adding...' : `Add ${formatCurrency(addAmount || 0)}`}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedGoal(null);
                  setShowAddGoalModal(true);
                }}
                disabled={addingAmount}
              >
                Edit Goal
              </button>
            </div>
          </div>
        </div>
      )}

      <SavingGoal
        isOpen={showAddGoalModal}
        onClose={() => setShowAddGoalModal(false)}
        onGoalCreated={() => {
          setShowAddGoalModal(false);
          fetchGoals();
        }}
      />
    </div>

  );
};

export default Goals;
