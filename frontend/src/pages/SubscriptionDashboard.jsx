
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LucideCalendarDays,
    LucideCreditCard,
    LucideAlertTriangle,
    LucideCheckCircle2,
    LucidePlus,
    LucideTrash2,
    LucideSearch
} from 'lucide-react';
import api from '../api/client';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './SubscriptionDashboard.css';

const SubscriptionDashboard = () => {
    const { user } = useAuth();

    const formatCurrency = (amount) => {
        const currency = user?.currency || 'USD';
        const locale = currency === 'INR' ? 'en-IN' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount || 0);
    };

    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSub, setNewSub] = useState({
        name: '',
        amount: '',
        nextDueDate: '',
        category: 'Utilities',
        billingCycle: 'monthly'
    });

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/api/subscriptions');
            setSubscriptions(data.subscriptions || []);
        } catch (error) {
            toast.error('Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const handleScan = async () => {
        try {
            setScanning(true);
            const { data } = await api.get('/api/subscriptions/detect');

            if (data.candidates && data.candidates.length > 0) {
                // Auto-add high confidence ones or show prompt (simplifying to auto-add for now with toast)
                let addedCount = 0;
                for (const candidate of data.candidates) {
                    // Check if already exists in current list to avoid dupes visually
                    if (!subscriptions.some(s => s.name.toLowerCase() === candidate.name.toLowerCase())) {
                        await api.post('/api/subscriptions', candidate);
                        addedCount++;
                    }
                }

                if (addedCount > 0) {
                    toast.success(`Found and added ${addedCount} new subscriptions!`);
                    fetchSubscriptions();
                } else {
                    toast.info('Scan complete. No new subscriptions found.');
                }
            } else {
                toast.info('Scan complete. No recurring payments found.');
            }
        } catch (error) {
            toast.error('Scan failed');
        } finally {
            setScanning(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Stop tracking this subscription?')) return;
        try {
            await api.delete(`/api/subscriptions/${id}`);
            setSubscriptions(prev => prev.filter(s => s._id !== id));
            toast.success('Subscription removed');
        } catch (error) {
            toast.error('Failed to remove subscription');
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!newSub.name || !newSub.amount || !newSub.nextDueDate) {
            toast.error('Please fill all required fields');
            return;
        }
        try {
            await api.post('/api/subscriptions', newSub);
            setShowAddModal(false);
            setNewSub({ name: '', amount: '', nextDueDate: '', category: 'Utilities', billingCycle: 'monthly' });
            fetchSubscriptions();
            toast.success('Subscription added');
        } catch (error) {
            toast.error('Failed to add subscription');
        }
    };

    // Stats
    const totalMonthly = useMemo(() => {
        return subscriptions.reduce((sum, sub) => {
            let monthlyAmount = sub.amount;
            if (sub.billingCycle === 'yearly') monthlyAmount = sub.amount / 12;
            if (sub.billingCycle === 'weekly') monthlyAmount = sub.amount * 4;
            return sum + monthlyAmount;
        }, 0);
    }, [subscriptions]);

    const upcomingBills = useMemo(() => {
        const today = new Date();
        return [...subscriptions]
            .map(sub => {
                const dueDate = new Date(sub.nextDueDate);
                // If due date passed, project to next cycle (simple projection)
                while (dueDate < today) {
                    if (sub.billingCycle === 'monthly') dueDate.setMonth(dueDate.getMonth() + 1);
                    if (sub.billingCycle === 'yearly') dueDate.setFullYear(dueDate.getFullYear() + 1);
                    if (sub.billingCycle === 'weekly') dueDate.setDate(dueDate.getDate() + 7);
                }
                return { ...sub, nextDueDateDisplay: dueDate };
            })
            .sort((a, b) => a.nextDueDateDisplay - b.nextDueDateDisplay)
            .slice(0, 5); // Next 5 bills
    }, [subscriptions]);

    if (loading && !subscriptions.length) return <div className="sub-dashboard-loading">Loading...</div>;

    return (
        <div className="sub-page">
            <header className="sub-header">
                <div className="sub-header-top">
                    <Link to="/dashboard" className="back-link">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                Back to Dashboard
                              </Link>
                    <div className="sub-badge">
                        <LucideCalendarDays size={16} />
                        Smart Tracker
                    </div>
                </div>
                <div className="sub-hero">
                    <div>
                        <h1>Subscription & Bill Tracker</h1>
                        <p>Manage recurring payments and spot vampire costs.</p>
                    </div>
                    <div className="sub-actions">
                        <button onClick={handleScan} disabled={scanning} className="btn-scan">
                            {scanning ? <span className="spinner"></span> : <LucideSearch size={18} />}
                            {scanning ? 'Scanning...' : 'Scan for Bills'}
                        </button>
                        <button onClick={() => setShowAddModal(true)} className="btn-add">
                            <LucidePlus size={18} /> Add Manually
                        </button>
                    </div>
                </div>
            </header>

            <main className="sub-content">
                <div className="sub-grid">
                    {/* Stats Cards */}
                    <div className="sub-card stat-card">
                        <div className="stat-icon-wrapper danger">
                            <LucideAlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Total Monthly Cost</p>
                            <h2 className="stat-value">{formatCurrency(totalMonthly)}</h2>
                        </div>
                    </div>

                    <div className="sub-card stat-card">
                        <div className="stat-icon-wrapper success">
                            <LucideCheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Active Subscriptions</p>
                            <h2 className="stat-value">{subscriptions.length}</h2>
                        </div>
                    </div>

                    <div className="sub-card stat-card">
                        <div className="stat-icon-wrapper info">
                            <LucideCreditCard size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Next Bill Due</p>
                            <h2 className="stat-value text-sm">
                                {upcomingBills[0] ? `${upcomingBills[0].name} (${new Date(upcomingBills[0].nextDueDateDisplay).toLocaleDateString()})` : 'None'}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="sub-section">
                    <h3 className="section-title">Upcoming Bills</h3>
                    <div className="bills-list">
                        {upcomingBills.length === 0 ? (
                            <div className="empty-state">No upcoming bills found.</div>
                        ) : (
                            upcomingBills.map(sub => (
                                <motion.div
                                    key={sub._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bill-item"
                                >
                                    <div className="bill-date">
                                        <span className="bill-day">{new Date(sub.nextDueDateDisplay).getDate()}</span>
                                        <span className="bill-month">{new Date(sub.nextDueDateDisplay).toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                    <div className="bill-info">
                                        <h4>{sub.name}</h4>
                                        <span className="bill-cycle">{sub.billingCycle}</span>
                                    </div>
                                    <div className="bill-amount">
                                        {formatCurrency(sub.amount)}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                <div className="sub-section">
                    <h3 className="section-title">All Subscriptions</h3>
                    <div className="subs-table-wrapper">
                        <table className="subs-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Cost</th>
                                    <th>Cycle</th>
                                    <th>Next Due</th>
                                    <th>Category</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map(sub => (
                                    <tr key={sub._id}>
                                        <td>{sub.name}</td>
                                        <td>{formatCurrency(sub.amount)}</td>
                                        <td>{sub.billingCycle}</td>
                                        <td>{new Date(sub.nextDueDate).toLocaleDateString()}</td>
                                        <td>
                                            <span className="cat-badge">{sub.category}</span>
                                        </td>
                                        <td>
                                            <button onClick={() => handleDelete(sub._id)} className="btn-icon danger">
                                                <LucideTrash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add Subscription</h3>
                        <form onSubmit={handleAddSubmit}>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={newSub.name}
                                    onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Amount</label>
                                <input
                                    type="number"
                                    value={newSub.amount}
                                    onChange={e => setNewSub({ ...newSub, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Next Due Date</label>
                                <input
                                    type="date"
                                    value={newSub.nextDueDate}
                                    onChange={e => setNewSub({ ...newSub, nextDueDate: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Billing Cycle</label>
                                <select
                                    value={newSub.billingCycle}
                                    onChange={e => setNewSub({ ...newSub, billingCycle: e.target.value })}
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Add Subscription</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionDashboard;
