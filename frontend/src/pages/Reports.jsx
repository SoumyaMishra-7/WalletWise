import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaDownload } from 'react-icons/fa';

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './Reports.css';
import api from '../api/client';

ChartJS.register(ArcElement, BarElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const tabs = [
  { id: 'month', label: 'This Month', emoji: 'M' },
  { id: 'trends', label: 'Trends', emoji: 'T' },
  { id: 'insights', label: 'Insights', emoji: 'I' },
  { id: 'spending', label: 'Spending', emoji: 'S' }
];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('month');
  const panelsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    monthTotal: 0,
    monthlyBudget: 0,
    pieCategories: [],
    weeklySpend: [],
    trends: [],
    insights: [],
    topPlaces: [],
    insights: [],
    topPlaces: [],
    dailySpend: [],
    transactions: []
  });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [txRes, budgetRes] = await Promise.all([
        api.get('/api/transactions'),
        api.get('/api/budget/stats/summary')
      ]);

      const transactions = txRes.data?.transactions || [];
      const budgetSummary = budgetRes.data?.summary || {};

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const expenses = transactions.filter((t) => t.type === 'expense');
      const monthExpenses = expenses.filter((t) => new Date(t.date) >= startOfMonth);
      const prevMonthExpenses = expenses.filter(
        (t) => new Date(t.date) >= startOfPrevMonth && new Date(t.date) <= endOfPrevMonth
      );

      const monthTotal = monthExpenses.reduce((sum, t) => sum + (t.amount || 0), 0);
      const monthlyBudget = budgetSummary.totalBudget || 0;

      const palette = ['#22c55e', '#38bdf8', '#f59e0b', '#8b5cf6', '#f97316', '#14b8a6'];
      const totalSpent = monthTotal || 0;

      const pieCategories = (budgetSummary.categories?.length ? budgetSummary.categories : [])
        .map((cat, idx) => ({
          id: String(cat.name || `cat-${idx}`).toLowerCase().replace(/\s+/g, '-'),
          label: cat.name || 'Other',
          value: totalSpent > 0 ? Math.round(((cat.spent || 0) / totalSpent) * 100) : 0,
          amount: cat.spent || 0,
          color: cat.color || palette[idx % palette.length]
        }))
        .filter((cat) => cat.amount > 0);

      const fallbackCategoryMap = new Map();
      if (pieCategories.length === 0) {
        monthExpenses.forEach((t) => {
          const key = t.category || 'Other';
          fallbackCategoryMap.set(key, (fallbackCategoryMap.get(key) || 0) + (t.amount || 0));
        });
      }

      const derivedPieCategories = pieCategories.length
        ? pieCategories
        : Array.from(fallbackCategoryMap.entries()).map(([label, amount], idx) => ({
          id: String(label).toLowerCase().replace(/\s+/g, '-'),
          label,
          value: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
          amount,
          color: palette[idx % palette.length]
        }));

      const weeklySpend = [];
      for (let w = 3; w >= 0; w -= 1) {
        const bucketEnd = new Date(now);
        bucketEnd.setHours(23, 59, 59, 999);
        bucketEnd.setDate(bucketEnd.getDate() - w * 7);
        const bucketStart = new Date(bucketEnd);
        bucketStart.setDate(bucketEnd.getDate() - 6);
        bucketStart.setHours(0, 0, 0, 0);

        const total = expenses
          .filter((t) => {
            const date = new Date(t.date);
            return date >= bucketStart && date <= bucketEnd;
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        weeklySpend.push({ label: `W${4 - w}`, value: total });
      }

      const categoryTotals = new Map();
      monthExpenses.forEach((t) => {
        const key = t.category || 'Other';
        categoryTotals.set(key, (categoryTotals.get(key) || 0) + (t.amount || 0));
      });

      const prevCategoryTotals = new Map();
      prevMonthExpenses.forEach((t) => {
        const key = t.category || 'Other';
        prevCategoryTotals.set(key, (prevCategoryTotals.get(key) || 0) + (t.amount || 0));
      });

      const trendItems = Array.from(
        new Set([...categoryTotals.keys(), ...prevCategoryTotals.keys()])
      ).map((label) => {
        const current = categoryTotals.get(label) || 0;
        const prev = prevCategoryTotals.get(label) || 0;
        const change = prev > 0 ? Math.round(((current - prev) / prev) * 100) : current > 0 ? 100 : 0;
        return { label, change };
      });

      const trends = trendItems
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 4);

      const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];
      const totalPercent = monthlyBudget > 0 ? Math.round((monthTotal / monthlyBudget) * 100) : 0;

      const insights = [
        monthlyBudget > 0
          ? {
            text: totalPercent > 90
              ? `You have used ${totalPercent}% of your budget.`
              : `You are at ${totalPercent}% of your budget.`,
            status: totalPercent > 90 ? 'warning' : totalPercent > 75 ? 'ok' : 'good',
            emoji: totalPercent > 90 ? '!' : totalPercent > 75 ? '~' : '+'
          }
          : {
            text: 'Set a monthly budget to track progress.',
            status: 'warning',
            emoji: '!'
          },
        topCategory
          ? {
            text: `${topCategory[0]} is your top spend category this month.`,
            status: 'ok',
            emoji: '~'
          }
          : {
            text: 'Add transactions to unlock insights.',
            status: 'ok',
            emoji: '~'
          }
      ];

      const placeTotals = new Map();
      monthExpenses.forEach((t) => {
        const key = (t.description && String(t.description).trim()) || t.category || 'Other';
        placeTotals.set(key, (placeTotals.get(key) || 0) + (t.amount || 0));
      });

      const topPlaces = Array.from(placeTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, amount]) => ({ name, amount }));

      const dailySpend = [];
      for (let i = 6; i >= 0; i -= 1) {
        const day = new Date(now);
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - i);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);

        const total = expenses
          .filter((t) => {
            const date = new Date(t.date);
            return date >= day && date < nextDay;
          })
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        dailySpend.push({
          label: day.toLocaleDateString('en-US', { weekday: 'short' }),
          value: total
        });
      }

      setReportData({
        monthTotal,
        monthlyBudget,
        pieCategories: derivedPieCategories,
        weeklySpend,
        trends,
        insights,
        topPlaces,
        topPlaces,
        dailySpend,
        transactions: monthExpenses
      });
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const handleFocus = () => fetchReports();
    const handleVisibility = () => {
      if (!document.hidden) fetchReports();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchReports]);

  useEffect(() => {
    if (activeTab === 'spending' || activeTab === 'trends') {
      fetchReports();
    }
  }, [activeTab, fetchReports]);

  const monthPie = useMemo(
    () => ({
      labels: reportData.pieCategories.length
        ? reportData.pieCategories.map((item) => item.label)
        : ['No data'],
      datasets: [
        {
          data: reportData.pieCategories.length
            ? reportData.pieCategories.map((item) => item.value)
            : [1],
          backgroundColor: reportData.pieCategories.length
            ? reportData.pieCategories.map((item) => item.color)
            : ['#e2e8f0'],
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    }),
    [reportData.pieCategories]
  );

  const weeklyBar = useMemo(
    () => ({
      labels: reportData.weeklySpend.length
        ? reportData.weeklySpend.map((item) => item.label)
        : ['W1', 'W2', 'W3', 'W4'],
      datasets: [
        {
          label: 'Weekly spend',
          data: reportData.weeklySpend.length
            ? reportData.weeklySpend.map((item) => item.value)
            : [0, 0, 0, 0],
          backgroundColor: '#2563eb',
          borderRadius: 10
        }
      ]
    }),
    [reportData.weeklySpend]
  );

  const trendBar = useMemo(
    () => ({
      labels: reportData.trends.length ? reportData.trends.map((item) => item.label) : ['No data'],
      datasets: [
        {
          label: '% change',
          data: reportData.trends.length ? reportData.trends.map((item) => item.change) : [0],
          backgroundColor: reportData.trends.length
            ? reportData.trends.map((item) =>
              item.change < 0 ? '#22c55e' : item.change > 10 ? '#ef4444' : '#f59e0b'
            )
            : ['#f59e0b'],
          borderRadius: 8
        }
      ]
    }),
    [reportData.trends]
  );

  const spendingLine = useMemo(
    () => ({
      labels: reportData.dailySpend.length
        ? reportData.dailySpend.map((item) => item.label)
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Daily spend',
          data: reportData.dailySpend.length
            ? reportData.dailySpend.map((item) => item.value)
            : [0, 0, 0, 0, 0, 0, 0],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: true,
          tension: 0.35
        }
      ]
    }),
    [reportData.dailySpend]
  );

  const pieOptions = {
    plugins: {
      legend: { display: false }
    },
    maintainAspectRatio: false
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      },
      x: { grid: { display: false } }
    }
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: {
          callback: (value) => `${value}%`
        }
      },
      x: { grid: { display: false } }
    }
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      },
      x: { grid: { display: false } }
    }
  };

  const totalPercent = reportData.monthlyBudget > 0
    ? Math.round((reportData.monthTotal / reportData.monthlyBudget) * 100)
    : 0;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (!panelsRef.current) return;
    const index = tabs.findIndex((tab) => tab.id === tabId);
    const width = panelsRef.current.clientWidth;
    panelsRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
  };

  const handlePanelsScroll = () => {
    if (!panelsRef.current) return;
    const width = panelsRef.current.clientWidth || 1;
    const index = Math.round(panelsRef.current.scrollLeft / width);
    const next = tabs[index]?.id;
    if (next && next !== activeTab) setActiveTab(next);
  };

  const headerNote = error
    ? error
    : loading
      ? 'Loading latest insights...'
      : 'Quick, student-friendly views of where your money went.';

  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const handleExportCSV = () => {
    if (!reportData.transactions || reportData.transactions.length === 0) {
      alert('No transactions to export for this month.');
      return;
    }

    const headers = ['Date', 'Category', 'Description', 'Amount'];
    const rows = reportData.transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.category || 'Other',
      t.description || '',
      t.amount
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monthly_report_${new Date().getMonth() + 1}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadMenuOpen(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Financial Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 14, 22);

    doc.setFontSize(12);
    doc.text(`Total Spent: ${formatCurrency(reportData.monthTotal)}`, 14, 32);

    // Summary Table
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Spent', formatCurrency(reportData.monthTotal)],
      ['Budget Used', `${totalPercent}%`],
      ['Top Category', reportData.pieCategories[0]?.label || 'N/A']
    ];

    autoTable(doc, {
      startY: 40,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Category Breakdown
    doc.text('Category Breakdown', 14, doc.lastAutoTable.finalY + 14);

    const categoryData = reportData.pieCategories.map(c => [c.label, `${c.value}%`, formatCurrency(c.amount)]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Category', 'Percentage', 'Amount']],
      body: categoryData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Transactions List
    doc.text('Transaction Details', 14, doc.lastAutoTable.finalY + 14);

    const txRows = reportData.transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.category || 'Other',
      t.description || '',
      formatCurrency(t.amount)
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: txRows,
      theme: 'striped'
    });

    doc.save(`monthly_report_${new Date().getMonth() + 1}_${new Date().getFullYear()}.pdf`);
    setDownloadMenuOpen(false);
  };

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <Link to="/dashboard" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="eyebrow">Campus Spending</span>
          <h1>This Month at a Glance</h1>
          <p>{headerNote}</p>
        </div>
      </header>
      <div className="reports-actions-bar">
        <div className="download-menu-container">
          <button
            className="download-btn primary-button"
            onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
          >
            <FaDownload /> Download Report
          </button>
          {downloadMenuOpen && (
            <div className="download-dropdown">
              <button onClick={handleExportCSV}>Export as CSV</button>
              <button onClick={handleExportPDF}>Export as PDF</button>
            </div>
          )}
        </div>
      </div>

      {(loading || error) && (
        <div className={`reports-status ${error ? 'error' : 'loading'}`}>
          {error || 'Loading latest insights...'}
        </div>
      )}

      <div className="tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="tab-emoji">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tabs-panels" ref={panelsRef} onScroll={handlePanelsScroll}>
        <section className="tab-panel" id="panel-month">
          <div className="panel-card">
            <div className="panel-title">
              <span className="panel-emoji">M</span>
              <h2>This Month</h2>
            </div>
            <div className="month-summary">
              <div>
                <p>Total spent</p>
                <h3>{formatCurrency(reportData.monthTotal)}</h3>
                <span className={`status-pill ${totalPercent > 90 ? 'danger' : totalPercent > 75 ? 'warning' : 'good'}`}>
                  {totalPercent}% of budget
                </span>
              </div>
              <div className="mini-progress">
                <div style={{ width: `${Math.min(totalPercent, 100)}%` }}></div>
              </div>
            </div>

            <div className="month-grid">
              <div className="chart-card">
                <h4>Category split</h4>
                <div className="chart-frame">
                  <Pie data={monthPie} options={pieOptions} />
                </div>
                <div className="legend-list">
                  {reportData.pieCategories.length > 0 ? reportData.pieCategories.map((item) => (
                    <div key={item.id} className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.value}% - {formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="legend-item">
                      <div>
                        <strong>No spending yet</strong>
                        <span>Add expenses to see category split.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="chart-card">
                <h4>Weekly breakdown</h4>
                <div className="chart-frame">
                  <Bar data={weeklyBar} options={barOptions} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tab-panel" id="panel-trends">
          <div className="panel-card">
            <div className="panel-title">
              <span className="panel-emoji">T</span>
              <h2>Trends</h2>
            </div>
            <div className="trend-summary">
              <p>Last month vs this month</p>
              <span className="trend-note">Spending changes by category.</span>
            </div>
            <div className="chart-card">
              <div className="chart-frame tall">
                <Bar data={trendBar} options={trendOptions} />
              </div>
            </div>
            <div className="trend-list">
              {reportData.trends.length > 0 ? reportData.trends.map((item) => (
                <div key={item.label} className="trend-item">
                  <span>{item.label}</span>
                  <span className={`trend-pill ${item.change < 0 ? 'good' : item.change > 10 ? 'danger' : 'warning'}`}>
                    {item.change > 0 ? `+${item.change}%` : `${item.change}%`}
                  </span>
                </div>
              )) : (
                <div className="trend-item">
                  <span>No trends yet</span>
                  <span className="trend-pill warning">0%</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="tab-panel" id="panel-insights">
          <div className="panel-card">
            <div className="panel-title">
              <span className="panel-emoji">I</span>
              <h2>Insights</h2>
            </div>
            <div className="insight-list">
              {reportData.insights.map((item, index) => (
                <div key={`${item.text}-${index}`} className={`insight-item ${item.status}`}>
                  <span className="insight-emoji">{item.emoji}</span>
                  <p>{item.text}</p>
                  <span className={`status-dot ${item.status}`}></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="tab-panel" id="panel-spending">
          <div className="panel-card">
            <div className="panel-title">
              <span className="panel-emoji">S</span>
              <h2>Spending</h2>
            </div>
            <div className="spending-top">
              <div>
                <h4>Top 3 places</h4>
                <div className="top-places">
                  {reportData.topPlaces.length > 0 ? reportData.topPlaces.map((place) => (
                    <div key={place.name} className="place-row">
                      <span>{place.name}</span>
                      <strong>{formatCurrency(place.amount)}</strong>
                    </div>
                  )) : (
                    <div className="place-row">
                      <span>No expenses yet</span>
                      <strong>{formatCurrency(0)}</strong>
                    </div>
                  )}
                </div>
              </div>
              <div className="chart-card">
                <h4>Daily trend</h4>
                <div className="chart-frame">
                  <Line data={spendingLine} options={lineOptions} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

  );
};

export default Reports;
