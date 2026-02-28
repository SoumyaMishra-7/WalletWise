import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LucideBrain,
    LucideCheckCircle2,
    LucideShieldAlert,
    LucideXCircle,
    LucideInfo,
    LucideArrowLeft,
    LucideZap
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import './DecisionHelper.css';

const moodOptions = [
    { id: 'happy', emoji: '😊', label: 'Excited' },
    { id: 'neutral', emoji: '😐', label: 'Neutral' },
    { id: 'stressed', emoji: '😰', label: 'Stressed' },
    { id: 'bored', emoji: '🥱', label: 'Bored' },
    { id: 'sad', emoji: '😔', label: 'Sad' },
    { id: 'calm', emoji: '😌', label: 'Calm' }
];

const DecisionHelper = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        itemName: '',
        category: 'shopping',
        cost: '',
        mood: 'neutral'
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleEvaluate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/api/insights/evaluate', formData);
            if (response.data.success) {
                setResult(response.data.evaluation);
            }
        } catch (err) {
            console.error('Evaluation failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const { user } = useAuth();

    const formatCurrency = (amount) => {
        const currency = user?.currency || 'USD';
        const locale = currency === 'INR' ? 'en-IN' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount || 0);
    };

    return (
        <div className="decision-page">
            <header className="decision-header">
                <div className="decision-header-top">
                    <button className="back-link" onClick={() => navigate('/dashboard')}>
                        <LucideArrowLeft size={18} />
                        Back to Dashboard
                    </button>
                    <div className="decision-badge">
                        <LucideBrain size={16} />
                        AI Advisor
                    </div>
                </div>

                <div className="decision-hero">
                    <h1>Should you buy it?</h1>
                    <p>Tell the AI what you're planning to purchase, and we'll check your budget pulse.</p>
                </div>
            </header>

            <main className="decision-grid">
                <section className="decision-card">
                    <h2>Purchase Details</h2>
                    <form className="decision-form" onSubmit={handleEvaluate}>
                        <div className="form-group">
                            <label>What are you buying?</label>
                            <input
                                type="text"
                                placeholder="e.g. New Headphones"
                                value={formData.itemName}
                                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Cost (INR)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="shopping">Shopping</option>
                                <option value="food">Food & Dining</option>
                                <option value="entertainment">Entertainment</option>
                                <option value="transport">Transport</option>
                                <option value="education">Education</option>
                                <option value="others">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>How are you feeling right now?</label>
                            <div className="mood-selector">
                                {moodOptions.map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        className={`mood-btn ${formData.mood === m.id ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, mood: m.id })}
                                    >
                                        <span>{m.emoji}</span>
                                        <span>{m.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button className="evaluate-btn" disabled={loading} type="submit">
                            {loading ? 'Analyzing Pulse...' : 'Check Affordability'}
                        </button>
                    </form>
                </section>

                <section className="decision-result">
                    <AnimatePresence mode="wait">
                        {!result ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="decision-card"
                                style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', color: '#64748b' }}
                            >
                                <div style={{ marginBottom: '1rem' }}>
                                    <LucideInfo size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
                                </div>
                                <p>Fill out the form to get an AI recommendation based on your current budget.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="result-container"
                            >
                                <div className={`status-card ${result.color}`}>
                                    <div className="status-icon">
                                        {result.status === 'Affordable' && <LucideCheckCircle2 size={32} />}
                                        {result.status === 'Risky' && <LucideShieldAlert size={32} />}
                                        {result.status === 'Not Recommended' && <LucideXCircle size={32} />}
                                    </div>
                                    <h3>{result.status}</h3>
                                    <div className="factors-list">
                                        {result.factors.map(f => <span key={f} className="factor-pill">{f}</span>)}
                                    </div>
                                </div>

                                <div className="recommendation-box">
                                    <h4>AI Recommendation</h4>
                                    <p>{result.recommendation}</p>
                                </div>

                                <div className="metrics-grid">
                                    <div className="metric-item">
                                        <label>Budget Left</label>
                                        <p>{formatCurrency(result.metrics.budgetLeft)}</p>
                                    </div>
                                    <div className="metric-item">
                                        <label>Upcoming Bills (15d)</label>
                                        <p>{formatCurrency(result.metrics.upcomingBills)}</p>
                                    </div>
                                </div>

                                <div className="decision-card" style={{ padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#6366f1' }}>
                                        <LucideZap size={18} />
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Financial Impact</span>
                                    </div>
                                    <div style={{ marginTop: '1rem', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(result.metrics.purchaseImpact, 100)}%`, height: '100%', background: '#6366f1' }}></div>
                                    </div>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                                        This purchase takes up {result.metrics.purchaseImpact.toFixed(1)}% of your total monthly budget.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </main>
        </div>
    );
};

export default DecisionHelper;
