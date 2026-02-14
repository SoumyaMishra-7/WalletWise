import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FaFilter, FaSearch } from 'react-icons/fa';
import './Transactions.css';

const categoryLabelMap = {
  groceries: 'Food',
  dining: 'Food',
  food: 'Food',
  transport: 'Transport',
  travel: 'Transport',
  fun: 'Fun',
  entertainment: 'Fun',
  others: 'Other'
};

const quickFilters = [
  { id: 'all', label: 'All' },
  { id: 'month', label: 'This Month' },
  { id: 'food', label: 'Food', categories: ['groceries', 'dining', 'food'] },
  { id: 'transport', label: 'Transport', categories: ['transport', 'travel'] },
  { id: 'fun', label: 'Fun', categories: ['fun', 'entertainment'] }
];

const moodMeta = {
  happy: { emoji: '😊', color: '#10b981', label: 'Happy / Excited' },
  stressed: { emoji: '😰', color: '#ef4444', label: 'Stressed / Tired' },
  bored: { emoji: '😐', color: '#a3a3a3', label: 'Bored / Impulsive' },
  sad: { emoji: '😔', color: '#64748b', label: 'Sad / Low' },
  calm: { emoji: '😌', color: '#0ea5e9', label: 'Calm / Productive' },
  neutral: { emoji: '😶', color: '#94a3b8', label: 'Neutral' }
};

const normalizeMood = (value) => {
  if (!value) return 'neutral';
  const key = `${value}`.trim().toLowerCase();
  if (moodMeta[key]) return key;
  return 'neutral';
};

const exportColumns = [
  { key: 'date', label: 'Date' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Note' },
  { key: 'amount', label: 'Amount' },
  { key: 'mood', label: 'Mood' }
];

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortMode, setSortMode] = useState('newest');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await api.get('/api/transactions');
        if (response.data?.success) {
          setTransactions(response.data.transactions || []);
        } else {
          setError('Failed to load transactions.');
        }
      } catch (err) {
        console.error('Transactions fetch error:', err);
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Could not connect to server.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [navigate]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start = null;
    let end = null;

    if (activeQuickFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      if (startDate) start = new Date(startDate);
      if (endDate) end = new Date(`${endDate}T23:59:59`);
    }

    const quickFilter = quickFilters.find((filter) => filter.id === activeQuickFilter);
    const quickCategories = quickFilter?.categories || [];
    const normalizedTags = tagFilter
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    const result = transactions.filter((t) => {
      const category = (t.category || 'others').toLowerCase();
      const description = (t.description || '').toLowerCase();

      if (quickCategories.length > 0 && !quickCategories.includes(category)) {
        return false;
      }

      if (start || end) {
        const txDate = new Date(t.date);
        if (start && txDate < start) return false;
        if (end && txDate > end) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!description.includes(term) && !category.includes(term)) {
          return false;
        }
      }

      if (normalizedTags.length > 0) {
        const txTags = Array.isArray(t.tags)
          ? t.tags.map((tag) => `${tag}`.toLowerCase())
          : [];
        if (!normalizedTags.some((tag) => txTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });

    return result.sort((a, b) => {
      if (sortMode === 'oldest') {
        return new Date(a.date) - new Date(b.date);
      }
      if (sortMode === 'amount-high') {
        return Number(b.amount || 0) - Number(a.amount || 0);
      }
      if (sortMode === 'amount-low') {
        return Number(a.amount || 0) - Number(b.amount || 0);
      }
      return new Date(b.date) - new Date(a.date);
    });
  }, [activeQuickFilter, endDate, searchTerm, sortMode, startDate, tagFilter, transactions]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  const buildExportRows = () => {
    return filteredTransactions.map((tx) => ({
      date: formatDate(tx.date),
      category: tx.category || 'others',
      description: tx.description || '.',
      amount: tx.amount,
      mood: moodMeta[normalizeMood(tx.mood)]?.label || 'Neutral'
    }));
  };

  const escapeCsv = (value) => {
    const stringValue = `${value ?? ''}`.replace(/"/g, '""');
    return `"${stringValue}"`;
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format) => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const rows = buildExportRows();
    const delimiter = format === 'csv' ? ',' : '	';
    const header = exportColumns.map((col) => escapeCsv(col.label)).join(delimiter);
    const body = rows
      .map((row) => exportColumns.map((col) => escapeCsv(row[col.key])).join(delimiter))
      .join('\n');
    const content = `${header}\n${body}`;
    const ext = format === 'csv' ? 'csv' : 'xls';
    downloadFile(content, `transactions_export.${ext}`, 'text/plain;charset=utf-8;');
  };

  if (loading) {
    return (
      <>
        <div className="transactions-page">
          <div className="page-loading">Loading transactions...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="transactions-page">
          <div className="page-error">
            <p>{error}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="transactions-page">
      <header className="transactions-topbar">
        <div>
          <Link to="/dashboard" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="eyebrow">Transactions</span>
          <h1>Stay on top of your spending</h1>
          <p>A calm snapshot of your money moments this semester.</p>
        </div>
        <div className="header-actions">
          <button
            className={`advanced-toggle ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced((prev) => !prev)}
            aria-label="Advanced filters"
            type="button"
          >
            <FaFilter />
          </button>
        </div>
      </header>

      <section className="transactions-toolbar">
        <div className="search-input compact">
          <FaSearch />
          <input
            type="text"
            placeholder="Search by note or category"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="quick-filters">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`pill ${activeQuickFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveQuickFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {showAdvanced && (
        <section className="advanced-panel">
          <div className="advanced-grid">
            <div className="advanced-block">
              <label>Date range</label>
              <div className="date-inputs">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="advanced-block">
              <label>Tags (comma separated)</label>
              <input
                type="text"
                placeholder="meal, commute, club"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              />
            </div>
            <div className="advanced-block">
              <label>Sort</label>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount-high">Amount high ? low</option>
                <option value="amount-low">Amount low ? high</option>
              </select>
            </div>
            <div className="advanced-block">
              <label>Export</label>
              <div className="export-actions">
                <button onClick={() => handleExport('csv')} className="primary-button">
                  Export CSV
                </button>
                <button onClick={() => handleExport('excel')} className="ghost-button">
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="transactions-table">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions match these filters.</h3>
            <p>Try a different search or date range.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Mood</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const moodKey = normalizeMood(tx.mood);
                const mood = moodMeta[moodKey] || moodMeta.neutral;
                const categoryKey = (tx.category || 'others').toLowerCase();
                const categoryLabel = categoryLabelMap[categoryKey] || tx.category || 'Other';
                const noteText = tx.description && `${tx.description}`.trim() ? tx.description : '.';
                return (
                  <tr key={tx.id || tx._id}>
                    <td>{formatDate(tx.date)}</td>
                    <td>{categoryLabel}</td>
                    <td className="note">{noteText}</td>
                    <td className={`amount ${tx.type}`}>{formatCurrency(tx.amount)}</td>
                    <td>
                      <span className="mood-pill" style={{ '--mood-color': mood.color }}>
                        <span className="mood-emoji" aria-hidden="true">
                          {mood.emoji}
                        </span>
                        {mood.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>

  );
};

export default Transactions;
