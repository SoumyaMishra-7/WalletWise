import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import './MoodInsight.css';

const MOOD_EMOJIS = {
  stressed: '😰',
  happy: '😊',
  bored: '😐',
  calm: '😌',
  neutral: '🙂',
  sad: '😢',
};

const MoodInsight = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/insights/mood-correlation');
      setData(res.data.moodCorrelation);
    } catch (err) {
      // Interceptor handles the toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="mood-insight-page">
        <div className="mood-loading">
          <div className="spinner-ring" />
          <p>Analyzing your mood patterns…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mood-insight-page">
        <div className="mood-error">
          <p>⚠️ Failed to load insights data.</p>
          <button onClick={fetchData}>Retry</button>
        </div>
      </div>
    );
  }

  const { impulsiveVsIntentional, moodBreakdown, impulsiveCategoryBreakdown, topTriggers, tips, totalTransactions, totalSpent } = data;
  const impPct = Math.round((impulsiveVsIntentional.impulsiveRatio || 0) * 100);
  const intPct = 100 - impPct;

  return (
    <div className="mood-insight-page">
      <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>

      <h1>🧠 Mood-Spending Correlation</h1>
      <p className="subtitle">How your emotions influence your wallet — last 30 days</p>

      <div className="mood-grid">
        {/* ---- Verdict card ---- */}
        <div className="mood-card verdict-card">
          <h2><span className="card-icon">⚖️</span> Impulsive vs. Intentional</h2>
          <p className="verdict-text">{impulsiveVsIntentional.verdict}</p>

          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-value impulsive">{impPct}%</div>
              <div className="stat-label">Impulsive</div>
              <div className="stat-amount">₹{impulsiveVsIntentional.impulsiveTotal.toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-value intentional">{intPct}%</div>
              <div className="stat-label">Intentional</div>
              <div className="stat-amount">₹{impulsiveVsIntentional.intentionalTotal.toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#90caf9' }}>{totalTransactions}</div>
              <div className="stat-label">Transactions</div>
              <div className="stat-amount">₹{totalSpent.toLocaleString()}</div>
            </div>
          </div>

          <div className="ratio-bar-container">
            <div className="ratio-bar">
              <div className="impulsive-fill" style={{ width: `${impPct}%` }} />
              <div className="intentional-fill" style={{ width: `${intPct}%` }} />
            </div>
            <div className="ratio-labels">
              <span>🔴 Impulsive</span>
              <span>🟢 Intentional</span>
            </div>
          </div>
        </div>

        {/* ---- Mood Breakdown ---- */}
        <div className="mood-card">
          <h2><span className="card-icon">📊</span> Spending by Mood</h2>
          <table className="mood-table">
            <thead>
              <tr>
                <th>Mood</th>
                <th>Txns</th>
                <th>Total</th>
                <th>Avg</th>
              </tr>
            </thead>
            <tbody>
              {moodBreakdown.map((row) => (
                <tr key={row.mood}>
                  <td>
                    <span className="mood-emoji">{MOOD_EMOJIS[row.mood] || '🙂'}</span>
                    <span className="mood-name">{row.mood}</span>
                  </td>
                  <td>{row.count}</td>
                  <td>₹{row.total.toLocaleString()}</td>
                  <td>₹{row.avgPerTx.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- Top Triggers ---- */}
        <div className="mood-card">
          <h2><span className="card-icon">🎯</span> Top Spending Triggers</h2>
          <ul className="trigger-list">
            {topTriggers.map((t) => {
              const catInfo = impulsiveCategoryBreakdown.find((c) => c.mood === t.mood);
              return (
                <li key={t.mood} className="trigger-item">
                  <div className={`trigger-rank rank-${t.rank}`}>{t.rank}</div>
                  <div className="trigger-info">
                    <div className="trigger-mood">
                      {MOOD_EMOJIS[t.mood] || '🙂'} {t.mood}
                    </div>
                    <div className="trigger-amount">₹{t.total.toLocaleString()} spent</div>
                    {catInfo && (
                      <div className="trigger-category">
                        Top category: {catInfo.topCategory} (₹{catInfo.categoryTotal.toLocaleString()})
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ---- Tips ---- */}
        <div className="mood-card" style={{ gridColumn: '1 / -1' }}>
          <h2><span className="card-icon">💡</span> Actionable Tips</h2>
          <ul className="tips-list">
            {tips.map((tip, i) => (
              <li key={i} className="tip-item">
                <span className="tip-icon">✨</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MoodInsight;
