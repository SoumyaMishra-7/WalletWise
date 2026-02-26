import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FaWallet, FaPlus, FaUsers } from 'react-icons/fa';
import './SharedWallets.css';

const SharedWallets = () => {
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWalletData, setNewWalletData] = useState({ name: '', description: '', currency: 'USD' });
    const { user } = useAuth();

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            setLoading(true);
            const res = await api.get('/wallets');
            setWallets(res.data);
        } catch (err) {
            console.error('Failed to fetch wallets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWallet = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/wallets', newWalletData);
            setWallets([...wallets, res.data]);
            setShowCreateModal(false);
            setNewWalletData({ name: '', description: '', currency: 'USD' });
        } catch (err) {
            console.error('Failed to create wallet:', err);
        }
    };

    if (loading) {
        return <div className="loading-spinner">Loading Shared Wallets...</div>;
    }

    return (
        <div className="shared-wallets-container">
            <div className="shared-wallets-header">
                <h1><FaWallet className="icon-mr" /> Shared Wallets</h1>
                <p>Collaborate with friends, family, or roommates on a shared budget.</p>
                <button className="btn-primary create-btn" onClick={() => setShowCreateModal(true)}>
                    <FaPlus /> New Wallet
                </button>
            </div>

            {wallets.length === 0 ? (
                <div className="empty-state">
                    <FaUsers size={48} className="empty-icon" />
                    <h3>No Shared Wallets Yet</h3>
                    <p>Create one to start tracking group expenses!</p>
                </div>
            ) : (
                <div className="wallets-grid">
                    {wallets.map((wallet) => (
                        <Link to={`/wallets/${wallet._id}`} key={wallet._id} className="wallet-card">
                            <div className="wallet-card-header">
                                <h3>{wallet.name}</h3>
                                <span className="wallet-currency">{wallet.currency}</span>
                            </div>
                            <p className="wallet-desc">{wallet.description}</p>
                            <div className="wallet-card-footer">
                                <div className="wallet-stats">
                                    <span className="balance-label">Group Balance</span>
                                    <span className={`balance-value ${wallet.balance >= 0 ? 'positive' : 'negative'}`}>
                                        {wallet.currency === 'INR' ? '₹' : (wallet.currency === 'EUR' ? '€' : '$')}
                                        {Math.abs(wallet.balance).toFixed(2)}
                                    </span>
                                </div>
                                <div className="members-count">
                                    <FaUsers /> {wallet.members?.length || 1} Members
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="wallet-modal-overlay">
                    <div className="wallet-modal">
                        <h2>Create Shared Wallet</h2>
                        <form onSubmit={handleCreateWallet}>
                            <div className="form-group">
                                <label>Wallet Name</label>
                                <input
                                    type="text"
                                    value={newWalletData.name}
                                    onChange={(e) => setNewWalletData({ ...newWalletData, name: e.target.value })}
                                    required
                                    placeholder="e.g. Apartment Expenses"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newWalletData.description}
                                    onChange={(e) => setNewWalletData({ ...newWalletData, description: e.target.value })}
                                    placeholder="What is this wallet for?"
                                />
                            </div>
                            <div className="form-group">
                                <label>Currency</label>
                                <select
                                    value={newWalletData.currency}
                                    onChange={(e) => setNewWalletData({ ...newWalletData, currency: e.target.value })}
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="INR">INR (₹)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharedWallets;
