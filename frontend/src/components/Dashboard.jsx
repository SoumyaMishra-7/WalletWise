// src/components/Dashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DashboardSkeleton } from './SkeletonLoader';
import './dashboard.css';
import AddExpense from '../pages/AddExpense';
import AddIncome from '../pages/AddIncome';
import SetBudget from '../pages/SetBudget';
import SavingGoal from '../pages/SavingGoal';
import { useTheme } from '../context/ThemeContext';
import { useVault } from '../context/VaultContext';
import { decryptNote } from '../services/encryption';
import VaultUnlock from './Vault/VaultUnlock';
import {
  FaWallet, FaSignOutAlt, FaUserCircle, FaChevronDown,
  FaMoneyBillWave, FaChartLine, FaPiggyBank,
  FaHandHoldingUsd, FaBullseye, FaChartBar, FaExclamationTriangle,
  FaBrain, FaArrowUp, FaCalendarAlt,
  FaSync, FaHome, FaExchangeAlt,
  FaCog, FaChartPie,
  FaMagic, FaTrophy, FaSun, FaMoon
  FaMagic, FaSun, FaMoon
  FaMagic, FaTrophy, FaSun, FaMoon, FaLock, FaUnlock
} from 'react-icons/fa';
import { Line, Pie } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';
import { handleGamificationReward } from '../utils/RewardCelebration';
import { calculateLevel } from '../utils/gamificationConstants';
import { FaFire, FaStar, FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBalance: 0,
    spentThisMonth: 0,
    incomeThisMonth: 0,
    budgetLeft: 0,
    savings: 0,
    monthlyBudget: 0,
    budgetUsedPercentage: 0,
    expenseTrend: 0,
  });
  const [timeOfDay, setTimeOfDay] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  // const { isDark, toggleTheme } = useTheme(); // CACHE BUST TEMPORARY COMMENT

  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, loading: authLoading, logout, reloadUser } = useAuth();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll Lock for Mobile Menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Modal states
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [showSetBudgetModal, setShowSetBudgetModal] = useState(false);
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);
  const [showVaultUnlock, setShowVaultUnlock] = useState(false);

  // Vault mechanics
  const { isVaultEnabled, isUnlocked, cryptoKey } = useVault();
  const [decryptedNotes, setDecryptedNotes] = useState({}); // { txId: "Decrypted Text" }

  const handleUnlockVaultSuccess = async () => {
    // Automatic decryption handled by a useEffect relying on cryptoKey state change 
    // or we could manually iterate. We'll leave it to user interaction for now.
  };

  const handleDecryptClick = async (tx) => {
    if (!isUnlocked || !cryptoKey) {
      setShowVaultUnlock(true);
      return;
    }
    try {
      const plainText = await decryptNote(tx.encryptedData, cryptoKey);
      setDecryptedNotes(prev => ({ ...prev, [tx._id]: plainText }));
    } catch (err) {
      toast.error("Decryption failed. Invalid vault session.");
    }
  };

  // Data states
  // const [stats, setStats] = useState({
  //   totalBalance: 0,
  //   spentThisMonth: 0,
  //   incomeThisMonth: 0,
  //   budgetLeft: 0,
  //   savings: 0,
  //   monthlyBudget: 0,
  //   budgetUsedPercentage: 0,
  //   expenseTrend: 0
  // });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [weeklyExpenses, setWeeklyExpenses] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);

  // Navigation items with proper routes
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: FaHome, path: "/dashboard" },
    {
      id: "transactions",
      label: "Transactions",
      icon: FaExchangeAlt,
      path: "/transactions",
    },
    { id: "budget", label: "Budget", icon: FaChartPie, path: "/budget" },
    { id: "simulator", label: "Simulator", icon: FaChartLine, path: "/simulator" },
    { id: "goals", label: "Goals", icon: FaBullseye, path: "/goals" },
    { id: "gamification", label: "Rewards", icon: FaTrophy, path: "/gamification" },
    { id: "wallets", label: "Shared Wallets", icon: FaWallet, path: "/wallets" },
    { id: "reports", label: "Reports", icon: FaChartBar, path: "/reports" },
    { id: "subscriptions", label: "Subscriptions", icon: FaCog, path: "/subscriptions" },
    { id: "settings", label: "Settings", icon: FaCog, path: "/settings" },
  ];

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (isForced = false) => {
    if (refreshing && !isForced) return; // Prevent multiple simultaneous manual refreshes
    setRefreshing(true);
    try {
      console.log('???? Fetching dashboard data...');

      const dashboardRes = await api.get('/dashboard/summary');
      const dashboardData = dashboardRes.data;

      console.log("📋 Dashboard API Response:", dashboardData);

      if (dashboardData.success) {
        const statsData = dashboardData.stats || {};

        setStats({
          totalBalance: statsData.totalBalance || 0,
          spentThisMonth: statsData.monthlyExpenses || 0,
          incomeThisMonth: statsData.monthlyIncome || 0,
          budgetLeft: statsData.budgetLeft || 0,
          savings: statsData.totalSavings || 0,
          monthlyBudget: statsData.monthlyBudget || 0,
          budgetUsedPercentage: statsData.budgetUsedPercentage || 0,
          expenseTrend: dashboardData.expenseTrend || 0,
        });

        // Transactions
        setRecentTransactions(dashboardData.recentTransactions || []);

        // Category spending
        setCategorySpending(dashboardData.categorySpending || []);

        // Weekly expenses
        setWeeklyExpenses(dashboardData.weeklyExpenses || []);

        // Savings goals
        setSavingsGoals(dashboardData.savingsGoals || []);

        // Update timestamp
        setLastUpdated(
          new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        );
      }
    } catch (err) {
      // Interceptor handles the toast
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, logout, navigate]);

  // ============ AUTH & DATA FETCHING ============
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (authLoading) {
          return;
        }

        // if (!authUser) {
        //   navigate('/login');
        //   return;
        // }



        // Setup initial user
        setUser(authUser);

        // Set time greeting
        const hour = new Date().getHours();
        if (hour < 12) setTimeOfDay('Morning');
        else if (hour < 17) setTimeOfDay('Afternoon');
        else setTimeOfDay('Evening');

        // Set current date
        const now = new Date();
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        setCurrentDate(now.toLocaleDateString('en-US', options));

      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate, authUser, authLoading]);

  // Initial fetch and manual refreshes decoupled
  useEffect(() => {
    if (!authLoading && authUser) {
      fetchDashboardData(refreshTrigger > 0);
    }
  }, [authLoading, authUser, refreshTrigger]);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // ============ HANDLERS ============
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    // Handle dashboard path
    if (path === "/dashboard" && location.pathname === "/") return true;
    if (path === "/dashboard" && location.pathname === "/dashboard")
      return true;
    // Handle other paths
    if (path !== "/dashboard" && location.pathname.startsWith(path))
      return true;
    return false;
  };

  const handleAddExpense = async (expenseData) => {
    try {
      console.log("??? Adding expense:", expenseData);

      const response = await api.post("/api/transactions", expenseData);

      console.log("✅ Expense response:", response.data);

      if (response.data.success) {
        setShowAddExpenseModal(false);
        await fetchDashboardData(true);
        if (response.data.gamification) {
          handleGamificationReward(response.data.gamification);
          if (reloadUser) await reloadUser();
        }
        toast.success('Expenses added successfully.', {
          style: {
            background: "#16a34a",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#bbf7d0",
            secondary: "#166534",
          },
        });
      }
    } catch (err) {
      console.error("❌ Failed to add expense:", err);
      alert("Failed to add expense. Please try again.");
    }
  };

  const handleAddIncome = async (incomeData) => {
    try {
      console.log("??? Adding income:", incomeData);

      const response = await api.post("/api/transactions", incomeData);

      console.log("✅ Income response:", response.data);

      if (response.data.success) {
        setShowAddIncomeModal(false);
        await fetchDashboardData(true);
        if (response.data.gamification) {
          handleGamificationReward(response.data.gamification);
          if (reloadUser) await reloadUser();
        }
        toast.success('Income Added Successfully.', {
          style: {
            background: "#16a34a",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#bbf7d0",
            secondary: "#166534",
          },
        });
      }
    } catch (err) {
      console.error("❌ Failed to add income:", err);
      alert("Failed to add income. Please try again.");
    }
  };

  const handleAIInsights = () => {
    navigate("/behaviour-analysis");
  };

  const handleOpenGoals = () => {
    navigate("/goals", { state: { refetchAt: Date.now() } });
  };

  // ============ CHART CONFIGURATIONS ============

  // Weekly expenses chart with empty state handling
  const weeklyExpensesChart = {
    labels:
      weeklyExpenses.length > 0
        ? weeklyExpenses.map((item) => item.day)
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Daily Expenses",
        data:
          weeklyExpenses.length > 0
            ? weeklyExpenses.map((item) => item.amount)
            : [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#f87171",
        backgroundColor: "rgba(248, 113, 113, 0.1)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  // Category spending chart with empty state
  const spendingByCategoryChart = {
    labels:
      categorySpending.length > 0
        ? categorySpending.map((item) => item.name)
        : ["No Data"],
    datasets: [
      {
        data:
          categorySpending.length > 0
            ? categorySpending.map((item) => item.amount)
            : [100],
        backgroundColor: [
          "#38bdf8",
          "#60a5fa",
          "#7dd3fc",
          "#93c5fd",
          "#a5b4fc",
          "#c4b5fd",
          "#d8b4fe",
          "#e9d5ff",
          "#f0abfc",
          "#f9a8d4",
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  // Cumulative Projection Chart
  const todayDate = new Date();
  const currentDayNum = todayDate.getDate();
  const daysInMonthNum = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();

  // Create an array of days from 1 to daysInMonth
  const monthLabels = Array.from({ length: daysInMonthNum }, (_, i) => i + 1);

  // Calculate daily pace
  const dailyPaceValue = stats.spentThisMonth / Math.max(currentDayNum, 1);

  // Actual spending up to today
  const actualData = monthLabels.map(day => {
    if (day <= currentDayNum) {
      return dailyPaceValue * day; // simplified approximation for the chart
    }
    return null; // hide tail
  });

  // Projected spending dotted line from today to end of month
  const projectedData = monthLabels.map(day => {
    if (day >= currentDayNum) {
      return dailyPaceValue * day;
    }
    return null; // hide prefix
  });

  const projectionChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: "Actual Spent",
        data: actualData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.2,
        borderWidth: 3,
      },
      {
        label: "Projected Trend",
        data: projectedData,
        borderColor: "#94a3b8",
        borderDash: [5, 5], // Dotted line
        fill: false,
        tension: 0.2,
        borderWidth: 2,
      }
    ]
  };

  if (stats.monthlyBudget > 0) {
    projectionChartData.datasets.push({
      label: "Budget Limit",
      data: monthLabels.map(() => stats.monthlyBudget),
      borderColor: "#ef4444",
      borderWidth: 1,
      fill: false,
      pointRadius: 0,
      borderDash: [2, 2]
    });
  }

  const projectionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: function (context) {
            const currency = user?.currency || 'USD';
            const locale = currency === 'INR' ? 'en-IN' : 'en-US';
            return context.dataset.label + ': ' + new Intl.NumberFormat(locale, { style: 'currency', currency }).format(context.raw);
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: "rgba(226, 232, 240, 0.5)" } },
      x: { title: { display: true, text: 'Day of Month' }, grid: { display: false } }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          color: "#334155",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(226, 232, 240, 0.5)",
        },
        ticks: {
          color: "#64748b",
          callback: function (value) {
            const currency = user?.currency || 'USD';
            const locale = currency === 'INR' ? 'en-IN' : 'en-US';
            return new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      },
      x: {
        grid: {
          color: "rgba(226, 232, 240, 0.5)",
        },
        ticks: {
          color: "#64748b",
        },
      },
    },
  };

  // ============ UTILITIES ============
  const formatCurrency = (amount) => {
    const currency = user?.currency || 'USD';
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTransactionDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const currentLevelInfo = calculateLevel(user?.totalXP || 0);

  // ============ RENDERING ============
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      {/* Clean, Focused Navbar */}
      <header className="dashboard-header">
        {/* Left: Logo */}
        <div className="nav-left">
          <Link to="/dashboard" className="logo-container">
            <FaWallet className="logo-icon" />
            <h1 className="logo-text">WalletWise</h1>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="nav-center" ref={mobileMenuRef}>
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <span
              className={`hamburger ${isMobileMenuOpen ? "open" : ""}`}
            ></span>
            <span
              className={`hamburger ${isMobileMenuOpen ? "open" : ""}`}
            ></span>
            <span
              className={`hamburger ${isMobileMenuOpen ? "open" : ""}`}
            ></span>
          </button>

          <ul
            id="mobile-nav-menu"
            className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`nav-link ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                    {active && <div className="nav-indicator"></div>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right: User Profile & Gamification */}
        <div className="nav-right" ref={userMenuRef}>
          <div className="gamification-stats" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginRight: '15px', color: 'var(--text-secondary)' }}>
            <div className="gamification-streak" title="Transaction Streak" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaFire color="#f97316" />
              <span style={{ fontWeight: 600 }}>{user?.currentStreak || 0}</span>
            </div>
            <div className="gamification-level" title={`Level ${currentLevelInfo.level}: ${currentLevelInfo.title}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaStar color="#eab308" />
              <span style={{ fontWeight: 600 }}>Lvl {currentLevelInfo.level}</span>
            </div>
          </div>
          {/*
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            type="button"
          >
            {isDark ? <FaSun /> : <FaMoon />}
          </button>
          */}
          <button
            className="user-profile-trigger"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-label="User menu"
            aria-haspopup="true"
          >
            <div className="user-avatar" aria-hidden="true">
              {user?.fullName?.charAt(0) || user?.name?.charAt(0) || "U"}
            </div>
            <FaChevronDown
              className={`dropdown-arrow ${showUserMenu ? "open" : ""}`}
            />
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="user-dropdown-menu" role="menu">
              <div className="user-dropdown-header">
                <div className="dropdown-avatar">
                  {user?.fullName?.charAt(0) || user?.name?.charAt(0) || "U"}
                </div>
                <div className="dropdown-user-info">
                  <span className="dropdown-user-name">
                    {user?.fullName || user?.name}
                  </span>
                  <span className="dropdown-user-email">{user?.email}</span>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <Link
                to="/profile"
                className="dropdown-item"
                role="menuitem"
                onClick={() => setShowUserMenu(false)}
                title="View profile"
              >
                <FaUserCircle />
                <span>Profile</span>
              </Link>

              <Link
                to="/settings"
                className="dropdown-item"
                role="menuitem"
                onClick={() => setShowUserMenu(false)}
                title="Open settings"
              >
                <FaCog />
                <span>Settings</span>
              </Link>


              <div className="dropdown-divider"></div>

              <button
                onClick={handleLogout}
                className="dropdown-item logout"
                role="menuitem"
                title="Logout"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Dashboard Header with Greeting and Actions */}
        <div className="dashboard-header-area">
          <div className="dashboard-header-left">
            <h1 className="dashboard-title">Dashboard</h1>
            <div className="greeting-section">
              {/* FIXED: Single span for greeting text */}
              <h2 className="greeting-text">
                Good {timeOfDay},{" "}
                <span className="user-name">
                  {user?.fullName || user?.name}
                </span>
                !
              </h2>
              <p className="current-date">
                <FaCalendarAlt className="date-icon" />
                {currentDate}
              </p>
            </div>
          </div>

          <div className="dashboard-header-right">
            <div className="action-buttons">
              <button
                className={`refresh-btn ${refreshing ? "refreshing" : ""}`}
                onClick={fetchDashboardData}
                disabled={refreshing}
                aria-busy={refreshing}
                aria-disabled={refreshing}
                title={
                  refreshing
                    ? "Refreshing dashboard..."
                    : "Refresh dashboard data"
                }
              >
                <FaSync className={refreshing ? "spin" : ""} />
                <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
                {lastUpdated && !refreshing && (
                  <span className="last-updated">Updated {lastUpdated}</span>
                )}
              </button>

              <button
                className="ai-insights-btn"
                onClick={handleAIInsights}
                title="View AI-powered spending insights"
                aria-label="AI Insights"
              >
                <FaBrain className="ai-icon" />
                <span>AI Insights</span>
              </button>

              <button
                className="ai-insights-btn"
                onClick={() => navigate('/decision-helper')}
                title="AI-powered purchase advisor"
                aria-label="Decision Helper"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: 'white', border: 'none' }}
              >
                <FaMagic className="ai-icon" />
                <span>Decision Helper</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {refreshing && <div className="stats-overlay">Updating...</div>}
        <div className={`quick-stats ${refreshing ? "loading" : ""}`}>
          <div className="stat-card">
            <div className="stat-icon blue">
              <FaWallet />
            </div>
            <div className="stat-content">
              <h3>Total Balance</h3>
              <p className="stat-value">{formatCurrency(stats.totalBalance)}</p>
              <div className="stat-trend">
                <FaArrowUp className="trend-up" />
                <span>
                  Balance: {formatCurrency(stats.incomeThisMonth)} (income) −{" "}
                  {formatCurrency(stats.spentThisMonth)} (spending)
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">
              <FaMoneyBillWave />
            </div>
            <div className="stat-content">
              <h3>Monthly Spending</h3>
              <p className="stat-value">
                {formatCurrency(stats.spentThisMonth)}
              </p>
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(stats.budgetUsedPercentage, 100)}%`,
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {stats.monthlyBudget > 0
                    ? `${formatCurrency(stats.budgetLeft)} left of ${formatCurrency(stats.monthlyBudget)}`
                    : "No budget set"}
                </span>
              </div>
              {stats.monthlyBudget === 0 && (
                <button
                  onClick={() => setShowSetBudgetModal(true)}
                  className="cta-button small"
                >
                  Set your first budget →
                </button>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <FaPiggyBank />
            </div>
            <div className="stat-content">
              <h3>Total Savings</h3>
              <p className="stat-value">{formatCurrency(stats.savings)}</p>
              <div className="stat-trend">
                <span>{savingsGoals.length} active goals</span>
              </div>
              {stats.savings === 0 && (
                <button
                  onClick={() => setShowSavingsGoalModal(true)}
                  className="cta-button small"
                >
                  Create a goal →
                </button>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <FaChartLine />
            </div>
            <div className="stat-content">
              <h3>Budget Status</h3>
              <p className="stat-value">
                {Math.round(stats.budgetUsedPercentage)}% used
              </p>
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(stats.budgetUsedPercentage, 100)}%`,
                    }}
                  ></div>
                </div>
                <span className="progress-text">
                  {stats.monthlyBudget > 0
                    ? `${formatCurrency(stats.monthlyBudget)} total`
                    : "No budget set"}
                </span>
              </div>
              {stats.monthlyBudget === 0 && (
                <button
                  onClick={() => setShowSetBudgetModal(true)}
                  className="cta-button small"
                >
                  Set budget →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="action-card"
            >
              <div className="action-icon blue">
                <FaMoneyBillWave />
              </div>
              <h3>Add Expense</h3>
              <p>Record a new expense</p>
            </button>

            <button
              onClick={() => setShowAddIncomeModal(true)}
              className="action-card"
            >
              <div className="action-icon green">
                <FaHandHoldingUsd />
              </div>
              <h3>Add Income</h3>
              <p>Record new income</p>
            </button>

            <button
              onClick={() => setShowSetBudgetModal(true)}
              className="action-card"
            >
              <div className="action-icon orange">
                <FaChartLine />
              </div>
              <h3>Set Budget</h3>
              <p>Manage your budget</p>
            </button>

            <button onClick={handleOpenGoals} className="action-card">
              <div className="action-icon purple">
                <FaBullseye />
              </div>
              <h3>Set Goals</h3>
              <p>Plan and track goals</p>
            </button>

            <button onClick={handleAIInsights} className="action-card">
              <div className="action-icon pink">
                <FaBrain />
              </div>
              <h3>AI Analysis</h3>
              <p>Get spending insights</p>
            </button>

            <button
              onClick={() => navigate("/reports")}
              className="action-card"
            >
              <div className="action-icon teal">
                <FaChartBar />
              </div>
              <h3>View Reports</h3>
              <p>Detailed analytics</p>
            </button>
          </div>
        </div>

        {/* Charts Section with Empty States */}
        <div className="charts-section">
          <div className="chart-container">
            <div className="chart-header">
              <h3>Monthly Pacing & Projection</h3>
              <span className="chart-subtitle">Where you'll end up this month</span>
            </div>
            <div className="chart-wrapper">
              <Line data={projectionChartData} options={projectionOptions} />
            </div>
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <h3>Weekly Expenses</h3>
              <span className="chart-subtitle">Last 7 days</span>
            </div>
            <div className="chart-wrapper">
              {weeklyExpenses.length > 0 &&
                weeklyExpenses.some((exp) => exp.amount > 0) ? (
                <Line data={weeklyExpensesChart} options={chartOptions} />
              ) : (
                <div className="chart-empty-state">
                  <FaChartLine className="empty-chart-icon" />
                  <p>No expense data for this week</p>
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className="btn-primary small"
                  >
                    Add First Expense
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <h3>Spending by Category</h3>
              <span className="chart-subtitle">This month</span>
            </div>
            <div className="chart-wrapper">
              {categorySpending.length > 0 &&
                categorySpending.some((cat) => cat.amount > 0) ? (
                <Pie data={spendingByCategoryChart} options={chartOptions} />
              ) : (
                <div className="chart-empty-state">
                  <FaChartPie className="empty-chart-icon" />
                  <p>No category data yet</p>
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className="btn-primary small"
                  >
                    Add Expenses
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="recent-transactions">
          <div className="section-header">
            <div>
              <h3>Recent Transactions</h3>
              <p className="section-subtitle">
                {recentTransactions.length} transactions this month
              </p>
            </div>
            <button
              onClick={() => navigate("/transactions")}
              className="view-all-btn"
            >
              View All ({recentTransactions.length})
            </button>
          </div>

          {recentTransactions.length > 0 ? (
            <div className="transactions-grid">
              {recentTransactions.slice(0, 6).map((transaction, index) => (
                <div key={index} className="transaction-card">
                  <div className="transaction-icon">
                    <div className={`icon-bg ${transaction.type}`}>
                      {transaction.type === "expense" ? "-" : "+"}
                    </div>
                  </div>
                  <div className="transaction-details">
                    <h4>
                      {transaction.isEncrypted ? (
                        <div className="encrypted-note-preview">
                          {decryptedNotes[transaction._id] ? (
                            <>
                              <FaUnlock className="vault-tiny-icon text-green-500" />
                              {decryptedNotes[transaction._id]}
                            </>
                          ) : (
                            <button onClick={() => handleDecryptClick(transaction)} className="unlock-note-btn">
                              <FaLock className="vault-tiny-icon" /> Locked Note
                            </button>
                          )}
                        </div>
                      ) : (
                        transaction.description || transaction.category || "Transaction"
                      )}
                    </h4>
                    <p className="transaction-category">
                      {transaction.category}
                    </p>
                    <p className="transaction-date">
                      {formatTransactionDate(transaction.date)}
                    </p>
                  </div>
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === "expense" ? "-" : "+"}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No transactions yet. Add your first expense or income!</p>
              <div className="empty-actions">
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="btn-primary"
                >
                  Add Expense
                </button>
                <button
                  onClick={() => setShowAddIncomeModal(true)}
                  className="btn-secondary"
                >
                  Add Income
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Savings Goals Summary */}
        {savingsGoals.length > 0 ? (
          <div className="savings-summary">
            <div className="section-header">
              <h3>Savings Goals</h3>
              <span className="section-subtitle">Progress towards targets</span>
            </div>
            <div className="goals-grid">
              {savingsGoals.slice(0, 3).map((goal, index) => (
                <div key={index} className="goal-card">
                  <div className="goal-header">
                    <h4>{goal.name}</h4>
                    <span className="goal-category">{goal.category}</span>
                  </div>
                  <div className="goal-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill green"
                        style={{
                          width: `${Math.min(goal.progress || 0, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="goal-amounts">
                      <span className="current-amount">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                      <span className="target-amount">
                        of {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="goal-date">
                      Target:{" "}
                      {new Date(goal.targetDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* MODALS */}
      <AddExpense
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onSuccess={() => handleSuccess('expense')}
      />

      <AddIncome
        isOpen={showAddIncomeModal}
        onClose={() => setShowAddIncomeModal(false)}
        onSuccess={() => handleSuccess('income')}
      />

      <SetBudget
        isOpen={showSetBudgetModal}
        onClose={() => setShowSetBudgetModal(false)}
        onSetBudget={() => handleSuccess('budget')}
      />

      <SavingGoal
        isOpen={showSavingsGoalModal}
        onClose={() => setShowSavingsGoalModal(false)}
        onGoalCreated={() => handleSuccess('goal')}
      />

      {showVaultUnlock && (
        <VaultUnlock
          onClose={() => setShowVaultUnlock(false)}
          onSuccess={handleUnlockVaultSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;
