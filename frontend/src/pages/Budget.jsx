import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { Link } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import AppNavbar from '../components/AppNavbar';
import './Budget.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const initialCategories = [
  { id: 'housing', name: 'Housing', budget: 18000, spent: 14000, type: 'needs' },
  { id: 'groceries', name: 'Groceries', budget: 6500, spent: 4200, type: 'needs' },
  { id: 'transport', name: 'Transport', budget: 4500, spent: 3800, type: 'needs' },
  { id: 'dining', name: 'Dining Out', budget: 3500, spent: 2900, type: 'wants' },
  { id: 'shopping', name: 'Shopping', budget: 5000, spent: 5200, type: 'wants' },
  { id: 'savings', name: 'Savings', budget: 8000, spent: 6000, type: 'savings' }
];

const allocationPreset = [
  { id: 'needs', label: 'Needs', value: 55 },
  { id: 'wants', label: 'Wants', value: 30 },
  { id: 'savings', label: 'Savings', value: 15 }
];

const categoryTypeMap = {
  needs: ['housing', 'rent', 'utilities', 'food', 'groceries', 'transport', 'education', 'health'],
  wants: ['entertainment', 'shopping', 'dining', 'travel', 'subscriptions', 'fun'],
  savings: ['savings', 'investment', 'emergency']
};

const getCategoryType = (name) => {
  const normalized = (name || '').toLowerCase();
  if (categoryTypeMap.savings.some((item) => normalized.includes(item))) return 'savings';
  if (categoryTypeMap.wants.some((item) => normalized.includes(item))) return 'wants';
  return 'needs';
};

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const Budget = () => {
  const [categories, setCategories] = useState(initialCategories);
  const [method, setMethod] = useState('copy');
  const [allocations, setAllocations] = useState(allocationPreset);
  const [rolloverEnabled, setRolloverEnabled] = useState(true);
  const [irregularIncome, setIrregularIncome] = useState(false);
  const [seasonalAdjustments, setSeasonalAdjustments] = useState(false);
  const [scenarioCategory, setScenarioCategory] = useState('housing');
  const [scenarioDelta, setScenarioDelta] = useState(5);
  const [scenarioIncome, setScenarioIncome] = useState(50000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardBudget, setWizardBudget] = useState(25000);
  const [wizardPreset, setWizardPreset] = useState('balanced');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summaryTotals, setSummaryTotals] = useState({ totalBudget: 0, totalSpent: 0 });

  useEffect(() => {
    const fetchBudgetSummary = async () => {
      setLoading(true);
      setError('');

      const mapBudget = (budgetData) => {
        const mapped = (budgetData?.categories || []).map((category) => ({
          id: slugify(category.name),
          name: category.name,
          budget: Number(category.amount ?? category.allocated ?? 0),
          spent: Number(category.spent ?? 0),
          type: getCategoryType(category.name),
          color: category.color
        }));
        setCategories(mapped);
        const totalBudget = Number(budgetData?.totalBudget ?? 0);
        const totalSpent = Number(budgetData?.spent ?? 0);
        setSummaryTotals({ totalBudget, totalSpent });
      };

      try {
        const { data } = await api.get('/api/budget/stats/summary');

        if (data?.success && data?.hasBudget) {
          mapBudget(data.summary);
        } else if (data?.success && !data?.hasBudget) {
          try {
            const current = await api.get('/api/budget/current');
            if (current?.data?.success && current?.data?.budget) {
              mapBudget(current.data.budget);
            } else {
              setCategories([]);
              setSummaryTotals({
                totalBudget: Number(data?.summary?.totalBudget ?? 0),
                totalSpent: Number(data?.summary?.spent ?? 0)
              });
            }
          } catch (fallbackError) {
            console.error('Failed to load current budget:', fallbackError);
            setCategories([]);
            setSummaryTotals({
              totalBudget: Number(data?.summary?.totalBudget ?? 0),
              totalSpent: Number(data?.summary?.spent ?? 0)
            });
          }
        }
      } catch (err) {
        console.error('Failed to load budget summary:', err);
        try {
          const current = await api.get('/api/budget/current');
          if (current?.data?.success && current?.data?.budget) {
            mapBudget(current.data.budget);
          } else if (err.response?.status === 401) {
            setError('Please log in to view your budget.');
          } else {
            setError('Failed to load budget data. Please try again.');
          }
        } catch (fallbackError) {
          if (err.response?.status === 401 || fallbackError.response?.status === 401) {
            setError('Please log in to view your budget.');
          } else {
            setError('Failed to load budget data. Please try again.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetSummary();
  }, []);

  useEffect(() => {
    if (categories.length === 0) {
      setScenarioCategory('');
      return;
    }

    const exists = categories.some((category) => category.id === scenarioCategory);
    if (!exists) {
      setScenarioCategory(categories[0].id);
    }
  }, [categories, scenarioCategory]);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;

  const totals = useMemo(() => {
    const categoryBudget = categories.reduce((sum, c) => sum + c.budget, 0);
    const categorySpent = categories.reduce((sum, c) => sum + c.spent, 0);
    const totalBudget = summaryTotals.totalBudget || categoryBudget;
    const totalSpent = summaryTotals.totalSpent || categorySpent;
    const percentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const dailyRate = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
    const recommendedDaily = totalBudget / daysInMonth;
    const projection = Math.round(dailyRate * daysInMonth - totalBudget);

    return {
      totalBudget,
      totalSpent,
      percentUsed,
      dailyRate,
      recommendedDaily,
      projection
    };
  }, [categories, dayOfMonth, daysInMonth, summaryTotals]);

  const needsTotal = categories.filter((c) => c.type === 'needs').reduce((sum, c) => sum + c.budget, 0);
  const wantsTotal = categories.filter((c) => c.type === 'wants').reduce((sum, c) => sum + c.budget, 0);
  const savingsTotal = categories.filter((c) => c.type === 'savings').reduce((sum, c) => sum + c.budget, 0);

  const allocationTotal = allocations.reduce((sum, item) => sum + item.value, 0);

  const needsWidth = totals.totalBudget > 0 ? (needsTotal / totals.totalBudget) * 100 : 0;
  const wantsWidth = totals.totalBudget > 0 ? (wantsTotal / totals.totalBudget) * 100 : 0;
  const savingsWidth = totals.totalBudget > 0 ? (savingsTotal / totals.totalBudget) * 100 : 0;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const getStatus = (percent) => {
    if (percent <= 75) return 'safe';
    if (percent <= 95) return 'warning';
    return 'danger';
  };

  const updateBudget = (id, multiplier) => {
    setCategories((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, budget: Math.max(0, Math.round(item.budget * multiplier)) } : item
      )
    );
  };

  const updateAllocation = (id, value) => {
    setAllocations((prev) => prev.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const scenarioImpact = useMemo(() => {
    const base = categories.find((c) => c.id === scenarioCategory);
    const deltaBudget = base ? Math.round((base.budget * scenarioDelta) / 100) : 0;
    const remainingIncome = scenarioIncome - totals.totalBudget - deltaBudget;
    return { deltaBudget, remainingIncome };
  }, [categories, scenarioCategory, scenarioDelta, scenarioIncome, totals.totalBudget]);

  const pieChartData = useMemo(() => {
    const labels = categories.map((category) => category.name);
    const data = categories.map((category) => category.budget);
    const fallbackColors = ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
    const colors = categories.map((category, index) => category.color || fallbackColors[index % fallbackColors.length]);
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    };
  }, [categories]);

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 14,
          padding: 12,
          color: '#334155'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed || 0;
            const percentage = totals.totalBudget > 0 ? Math.round((value / totals.totalBudget) * 100) : 0;
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <>
        <AppNavbar />
        <div className="budget-page">
          <div className="overview-grid">
            <div className="overview-card">
              <h3>Loading budget...</h3>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppNavbar />
        <div className="budget-page">
          <div className="overview-grid">
            <div className="overview-card">
              <h3>{error}</h3>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="budget-page">
      <header className="budget-header">
        <div>
          <Link to="/dashboard" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="eyebrow">Student Budget</span>
          <h1>Keep it simple, stay on track</h1>
          <p>See your pace, visualize your categories, and set a monthly budget in minutes.</p>
        </div>
        <div className="header-actions">
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced((prev) => !prev)}
            aria-label="Toggle advanced tools"
            title="Advanced tools"
          >
            ⚙️
          </button>
        </div>
      </header>

      <section className="overview-grid">
        <div className="overview-card">
          <h3>Monthly Overview</h3>
          <p>{totals.percentUsed}% used of {formatCurrency(totals.totalBudget)}</p>
          <div className="progress-bar">
            <div
              className={`progress-fill ${getStatus(totals.percentUsed)}`}
              style={{ width: `${Math.min(totals.percentUsed, 100)}%` }}
            ></div>
          </div>
          <span className="hint">{formatCurrency(totals.totalSpent)} spent</span>
        </div>
        <div className="overview-card">
          <h3>Spending Pace</h3>
          <strong>{formatCurrency(totals.dailyRate)} / day</strong>
          <p>Recommended {formatCurrency(totals.recommendedDaily)} / day</p>
          <span className="hint">{daysRemaining} days left</span>
        </div>
        <div className="overview-card">
          <h3>Projected Outcome</h3>
          <strong className={totals.projection > 0 ? 'danger' : 'safe'}>
            {totals.projection > 0
              ? `⚠️ Overspend ${formatCurrency(totals.projection)}`
              : `💰 Save ${formatCurrency(Math.abs(totals.projection))}`}
          </strong>
          <p>If your pace continues</p>
        </div>
      </section>

      <section className="pie-section">
        <div className="section-heading">
          <h2>Where your money goes</h2>
          <p>Category share of your monthly budget.</p>
        </div>
        <div className="pie-card">
          {categories.length === 0 ? (
            <div className="pie-empty">
              <h3>No budget set yet</h3>
              <p>Set your monthly budget to see the pie chart.</p>
            </div>
          ) : (
            <>
              <div className="pie-chart">
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
              <div className="pie-legend">
                {categories.map((category) => {
                  const percentage = totals.totalBudget > 0
                    ? Math.round((category.budget / totals.totalBudget) * 100)
                    : 0;
                  return (
                    <div key={category.id} className="pie-legend-item">
                      <span className="legend-dot" style={{ backgroundColor: category.color || '#2563eb' }}></span>
                      <div>
                        <strong>{category.name}</strong>
                        <span>{percentage}% • {formatCurrency(category.budget)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="budget-action">
        <button
          className="set-budget-cta"
          onClick={() => setShowWizard((prev) => !prev)}
        >
          + Set Monthly Budget
        </button>
        {showWizard && (
          <div className="wizard-card">
            <div className="wizard-steps">
              <button
                className={wizardStep === 1 ? 'active' : ''}
                onClick={() => setWizardStep(1)}
              >
                1. Budget
              </button>
              <button
                className={wizardStep === 2 ? 'active' : ''}
                onClick={() => setWizardStep(2)}
              >
                2. Style
              </button>
              <button
                className={wizardStep === 3 ? 'active' : ''}
                onClick={() => setWizardStep(3)}
              >
                3. Review
              </button>
            </div>

            {wizardStep === 1 && (
              <div className="wizard-step">
                <label>
                  Monthly budget amount
                  <input
                    type="number"
                    min="0"
                    value={wizardBudget}
                    onChange={(e) => setWizardBudget(Number(e.target.value))}
                  />
                </label>
                <button className="wizard-next" onClick={() => setWizardStep(2)}>
                  Next →
                </button>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="wizard-step">
                <p>Pick a quick style:</p>
                <div className="wizard-presets">
                  {[
                    { id: 'student', label: 'Student Saver' },
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'saver', label: 'Goal Focused' }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      className={wizardPreset === preset.id ? 'active' : ''}
                      onClick={() => setWizardPreset(preset.id)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <button className="wizard-next" onClick={() => setWizardStep(3)}>
                  Next →
                </button>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="wizard-step">
                <h3>Quick review</h3>
                <p>Budget: {formatCurrency(wizardBudget)}</p>
                <p>Style: {wizardPreset}</p>
                <div className="wizard-actions">
                  <Link to="/dashboard" className="btn-secondary">
                    Open full budget setup
                  </Link>
                  <button className="wizard-next" onClick={() => setShowWizard(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {showAdvanced && (
        <section className="advanced-drawer">
          <div className="section-heading">
            <h2>Advanced Tools</h2>
            <p>All detailed controls live here for when you need them.</p>
          </div>

          <section className="category-section">
            <div className="section-heading">
              <h2>Category Breakdown</h2>
              <p>Track every bucket with progress and quick adjustments.</p>
            </div>
            <div className="category-grid">
              {categories.length === 0 ? (
                <div className="category-card">
                  <div className="category-header">
                    <h3>No budget set yet</h3>
                  </div>
                  <p>Set your monthly budget from the Dashboard to see details here.</p>
                </div>
              ) : (
                categories.map((category) => {
                  const percentUsed = category.budget > 0 ? Math.round((category.spent / category.budget) * 100) : 0;
                  const status = getStatus(percentUsed);
                  return (
                    <div className="category-card" key={category.id}>
                      <div className="category-header">
                        <h3>{category.name}</h3>
                        <span className={`status-pill ${status}`}>{percentUsed}% used</span>
                      </div>
                      <div className="category-stats">
                        <div>
                          <span>Allocated</span>
                          <strong>{formatCurrency(category.budget)}</strong>
                        </div>
                        <div>
                          <span>Spent</span>
                          <strong>{formatCurrency(category.spent)}</strong>
                        </div>
                        <div>
                          <span>Remaining</span>
                          <strong>{formatCurrency(category.budget - category.spent)}</strong>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${status}`} style={{ width: `${Math.min(percentUsed, 100)}%` }}></div>
                      </div>
                      <div className="adjust-actions">
                        <button onClick={() => updateBudget(category.id, 0.9)}>-10%</button>
                        <button onClick={() => updateBudget(category.id, 1.1)}>+10%</button>
                        <button onClick={() => updateBudget(category.id, 1.2)}>+20%</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="creation-flow">
            <div className="section-heading">
              <h2>Budget Creation Flow</h2>
              <p>Select a method, allocate percentages, and visualize needs vs wants.</p>
            </div>
            <div className="method-grid">
              {[
                { id: 'copy', label: 'Copy last month' },
                { id: 'zero', label: 'Zero-based budgeting' },
                { id: 'rule', label: '50/30/20 auto-suggest' },
                { id: 'custom', label: 'Custom from scratch' }
              ].map((item) => (
                <button
                  key={item.id}
                  className={`method-card ${method === item.id ? 'active' : ''}`}
                  onClick={() => setMethod(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="allocation-grid">
              {allocations.map((item) => (
                <div key={item.id} className="allocation-card">
                  <div className="allocation-header">
                    <h3>{item.label}</h3>
                    <span>{item.value}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={item.value}
                    onChange={(e) => updateAllocation(item.id, Number(e.target.value))}
                  />
                </div>
              ))}
              <div className={`allocation-total ${allocationTotal === 100 ? 'ok' : 'warn'}`}>
                Total allocation: {allocationTotal}%
              </div>
            </div>

            <div className="needs-wants">
              <div>
                <h3>Needs vs Wants</h3>
                <p>Balance essentials with lifestyle spending and savings goals.</p>
              </div>
              <div className="needs-wants-bar">
                <span style={{ width: `${needsWidth}%` }}>Needs</span>
                <span style={{ width: `${wantsWidth}%` }}>Wants</span>
                <span style={{ width: `${savingsWidth}%` }}>Savings</span>
              </div>
            </div>
          </section>

          <section className="advanced-options">
            <div className="section-heading">
              <h2>Advanced Options</h2>
              <p>Switch on extra controls for complex budget needs.</p>
            </div>
            <div className="options-grid">
              <label>
                <input type="checkbox" checked={rolloverEnabled} onChange={(e) => setRolloverEnabled(e.target.checked)} />
                Rollover unused funds
              </label>
              <label>
                <input type="checkbox" checked={irregularIncome} onChange={(e) => setIrregularIncome(e.target.checked)} />
                Irregular income handling
              </label>
              <label>
                <input type="checkbox" checked={seasonalAdjustments} onChange={(e) => setSeasonalAdjustments(e.target.checked)} />
                Seasonal adjustments
              </label>
            </div>
          </section>

          <section className="health-metrics">
            <div className="section-heading">
              <h2>Budget Health Metrics</h2>
              <p>Highlights to keep your plan on track.</p>
            </div>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Overspending Alerts</h3>
                <p>{categories.some((c) => c.spent > c.budget) ? '2 categories over budget' : 'All categories within limits'}</p>
              </div>
              <div className="metric-card">
                <h3>Category Trends</h3>
                <p>Dining and shopping rising over last 3 months</p>
              </div>
              <div className="metric-card">
                <h3>Budget Burn Rate</h3>
                <p>{totals.percentUsed}% of budget used with {Math.round((dayOfMonth / daysInMonth) * 100)}% of time passed</p>
              </div>
              <div className="metric-card">
                <h3>Flexibility Score</h3>
                <p>{totals.totalBudget > 0 ? Math.round(((wantsTotal + savingsTotal) / totals.totalBudget) * 100) : 0}% adjustable</p>
              </div>
            </div>
          </section>

          <section className="scenario-tools">
            <div className="section-heading">
              <h2>Scenario Planning</h2>
              <p>Test income changes and category adjustments before committing.</p>
            </div>
            <div className="scenario-grid">
              <div className="scenario-card">
                <h3>What-if Calculator</h3>
                <label>
                  Category
                  <select
                    value={scenarioCategory}
                    onChange={(e) => setScenarioCategory(e.target.value)}
                    disabled={categories.length === 0}
                  >
                    {categories.length === 0 ? (
                      <option value="">No categories</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </select>
                </label>
                <label>
                  Adjust by %
                  <input type="number" value={scenarioDelta} onChange={(e) => setScenarioDelta(Number(e.target.value))} />
                </label>
                <p>Impact: {formatCurrency(scenarioImpact.deltaBudget)} change</p>
              </div>
              <div className="scenario-card">
                <h3>Income Simulator</h3>
                <label>
                  Monthly income
                  <input type="number" value={scenarioIncome} onChange={(e) => setScenarioIncome(Number(e.target.value))} />
                </label>
                <p>Remaining after budget: {formatCurrency(scenarioImpact.remainingIncome)}</p>
              </div>
              <div className="scenario-card">
                <h3>Goal Timeline</h3>
                <p>At current savings, emergency fund target is 6 months away.</p>
              </div>
              <div className="scenario-card">
                <h3>Emergency Fund Coverage</h3>
                <p>{totals.totalBudget > 0 ? Math.round((savingsTotal / (totals.totalBudget / daysInMonth))) : 0} days covered</p>
              </div>
            </div>
          </section>
        </section>
      )}
    </div>

  );
};

export default Budget;
