import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft, FaUsers, FaPlus, FaTrash, FaUserPlus, FaUserTie, FaUser } from 'react-icons/fa';
import './SharedWallets.css';
import AddExpense from './AddExpense'; // Reusing your existing modal

const WalletDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState('');

    const [showAddExpense, setShowAddExpense] = useState(false);

    useEffect(() => {
        fetchWalletDetails();
    }, [id]);

    const fetchWalletDetails = async () => {
        try {
            setLoading(true);
            const [walletRes, txRes] = await Promise.all([
                api.get(`/wallets/${id}`),
                api.get(`/transactions?walletId=${id}&limit=50`)
            ]);
            setWallet(walletRes.data);
            setTransactions(txRes.data.transactions || []);
        } catch (err) {
            console.error('Failed to fetch wallet:', err);
            navigate('/wallets');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/wallets/${id}/members`, { email: newMemberEmail });
            setNewMemberEmail('');
            setShowAddMember(false);
            fetchWalletDetails();
        } catch (err) {
            console.error('Failed to add member:', err);
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.delete(`/wallets/${id}/members/${userId}`);
            fetchWalletDetails();
        } catch (err) {
            console.error('Failed to remove member:', err);
        }
    };

    const handleAddSharedTransaction = async (transactionData) => {
        try {
            // Embed the walletId so the backend maps it to the Shared Wallet instead of Personal User Balance
            const payload = {
                ...transactionData,
                walletId: wallet._id
            };
            await api.post('/transactions', payload);
            fetchWalletDetails();
        } catch (err) {
            console.error("Failed to add shared transaction", err);
            throw err;
        }
    };

    if (loading || !wallet) return <div className="loading-spinner">Loading Wallet...</div>;

    const isAdmin = wallet.members.some(m => m.user._id === user._id && m.role === 'admin');
    const currencySymbol = wallet.currency === 'INR' ? '₹' : (wallet.currency === 'EUR' ? '€' : '$');

    return (
        <div className="wallet-details-container">
            <button className="back-btn" onClick={() => navigate('/wallets')}>
                <FaArrowLeft /> Back to Wallets
            </button>

            <div className="wallet-header-panel">
                <div className="wallet-title-area">
                    <h1>{wallet.name}</h1>
                    <p>{wallet.description}</p>
                </div>
                <div className="wallet-balance-area">
                    <span className="balance-label">Group Balance</span>
                    <h2 className={`balance-total ${wallet.balance >= 0 ? 'positive' : 'negative'}`}>
                        {currencySymbol}{Math.abs(wallet.balance).toFixed(2)}
                    </h2>
                </div>
            </div>

            <div className="wallet-content-grid">

                {/* Left Col: Transactions */}
                <div className="wallet-transactions">
                    <div className="section-header">
                        <h3>Recent Group Expenses</h3>
                        <button className="btn-primary small" onClick={() => setShowAddExpense(true)}>
                            <FaPlus /> Add Expense
                        </button>
                    </div>

                    {transactions.length === 0 ? (
                        <div className="empty-state small">No transactions yet in this wallet.</div>
                    ) : (
                        <ul className="shared-tx-list">
                            {transactions.map(tx => (
                                <li key={tx._id} className="shared-tx-item">
                                    <div className="tx-info">
                                        <span className="tx-cat">{tx.category}</span>
                                        <span className="tx-desc">{tx.description || 'No description'}</span>
                                        <span className="tx-paidby">Paid by: {tx.paidBy?.name || 'Unknown'}</span>
                                    </div>
                                    <div className={`tx-amount ${tx.type}`}>
                                        {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Right Col: Members */}
                <div className="wallet-members">
                    <div className="section-header">
                        <h3><FaUsers /> Members ({wallet.members.length})</h3>
                        {isAdmin && (
                            <button className="btn-secondary small" onClick={() => setShowAddMember(true)}>
                                <FaUserPlus /> Invite
                            </button>
                        )}
                    </div>

                    <ul className="members-list">
                        {wallet.members.map(m => (
                            <li key={m.user._id} className="member-item">
                                <div className="member-info">
                                    <div className="avatar-placeholder">
                                        {m.user.name?.charAt(0) || <FaUser />}
                                    </div>
                                    <div>
                                        <span className="member-name">{m.user.name} {m.user._id === user._id && "(You)"}</span>
                                        <span className="member-role">
                                            {m.role === 'admin' ? <FaUserTie title="Admin" /> : ''} {m.role}
                                        </span>
                                    </div>
                                </div>
                                {isAdmin && m.user._id !== wallet.owner._id && (
                                    <button className="remove-member-btn" onClick={() => handleRemoveMember(m.user._id)}>
                                        <FaTrash />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {showAddMember && (
                <div className="wallet-modal-overlay">
                    <div className="wallet-modal">
                        <h2>Invite Member</h2>
                        <form onSubmit={handleAddMember}>
                            <div className="form-group">
                                <label>User Email Address</label>
                                <input
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    required
                                    placeholder="friend@example.com"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowAddMember(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Invite</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reuse your beautiful AddExpense modal, but pass the shared handler */}
            <AddExpense
                isOpen={showAddExpense}
                onClose={() => setShowAddExpense(false)}
                onAddExpense={handleAddSharedTransaction}
            />
        </div>
    );
};

export default WalletDetails;
