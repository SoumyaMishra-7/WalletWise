import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { FaPlus, FaUserPlus, FaUsers, FaWallet } from 'react-icons/fa';
import './SharedWallets.css';

const getCurrencySymbol = (currency) => {
  if (currency === 'INR') return '₹';
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  return '$';
};

const SharedWallets = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWalletData, setNewWalletData] = useState({ name: '', description: '', currency: 'USD' });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [inviteData, setInviteData] = useState({ email: '', role: 'member' });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/wallets');
      setWallets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/wallets', newWalletData);
      const createdWallet = res.data;
      setWallets((prev) => [...prev, createdWallet]);
      setShowCreateModal(false);
      setNewWalletData({ name: '', description: '', currency: 'USD' });

      // Open member flow immediately after create
      setSelectedWallet(createdWallet);
      setInviteData({ email: '', role: 'member' });
      setShowInviteModal(true);
    } catch (err) {
      console.error('Failed to create wallet:', err);
    }
  };

  const handleOpenInvite = (wallet) => {
    setSelectedWallet(wallet);
    setInviteData({ email: '', role: 'member' });
    setShowInviteModal(true);
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!selectedWallet?._id) return;

    try {
      const res = await api.post(`/api/wallets/${selectedWallet._id}/members`, inviteData);
      const updatedWallet = res.data;
      setWallets((prev) => prev.map((wallet) => (
        wallet._id === updatedWallet._id ? updatedWallet : wallet
      )));
      setShowInviteModal(false);
      setInviteData({ email: '', role: 'member' });
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const totalMembers = useMemo(
    () => wallets.reduce((sum, wallet) => sum + (wallet.members?.length || 0), 0),
    [wallets]
  );

  if (loading) {
    return <div className="loading-spinner">Loading Shared Wallets...</div>;
  }

  return (
    <div className="shared-wallets-container">
      <div className="wallets-hero">
        <div>
          <h1><FaWallet className="icon-mr" /> Shared Wallets</h1>
          <p>Create group wallets, invite members, and track shared balances.</p>
        </div>

        <button className="btn-primary create-btn" onClick={() => setShowCreateModal(true)}>
          <FaPlus /> Create Wallet
        </button>
      </div>

      <div className="wallets-summary">
        <div className="summary-chip">
          <span className="summary-label">Total Wallets</span>
          <span className="summary-value">{wallets.length}</span>
        </div>

        <div className="summary-chip">
          <span className="summary-label">Total Members</span>
          <span className="summary-value">{totalMembers}</span>
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="empty-state">
          <FaUsers size={48} className="empty-icon" />
          <h3>No Shared Wallets Yet</h3>
          <p>Create one to start tracking group expenses.</p>
        </div>
      ) : (
        <div className="wallets-grid">
          {wallets.map((wallet) => (
            <div key={wallet._id} className="wallet-card">
              <Link to={`/wallets/${wallet._id}`} className="wallet-card-main">
                <div className="wallet-card-header">
                  <h3>{wallet.name}</h3>
                  <span className="wallet-currency">{wallet.currency}</span>
                </div>

                <p className="wallet-desc">{wallet.description}</p>
                <div className="wallet-card-footer">
                  <div className="wallet-stats">
                    <span className="balance-label">Group Balance</span>
                    <span className={`balance-value ${wallet.balance >= 0 ? 'positive' : 'negative'}`}>
                      {getCurrencySymbol(wallet.currency)}
                      {Math.abs(wallet.balance).toFixed(2)}
                    </span>
                  </div>

                  <div className="members-count">
                    <FaUsers /> {wallet.members?.length || 1} Members
                  </div>
                </div>
              </Link>

              <div className="wallet-card-actions">
                <Link to={`/wallets/${wallet._id}`} className="btn-secondary small action-link">
                  Open Wallet
                </Link>

                <button
                  type="button"
                  className="btn-primary small"
                  onClick={() => handleOpenInvite(wallet)}
                >
                  <FaUserPlus /> Add Member
                </button>
              </div>
            </div>
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
                  onChange={(e) => setNewWalletData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="e.g. Apartment Expenses"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newWalletData.description}
                  onChange={(e) => setNewWalletData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What is this wallet for?"
                />
              </div>

              <div className="form-group">
                <label>Currency</label>
                <select
                  value={newWalletData.currency}
                  onChange={(e) => setNewWalletData((prev) => ({ ...prev, currency: e.target.value }))}
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

      {showInviteModal && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal">
            <h2>Add Member</h2>
            <p className="wallet-modal-subtitle">
              {selectedWallet?.name ? `Wallet: ${selectedWallet.name}` : 'Invite a user by email'}
            </p>

            <form onSubmit={handleInviteMember}>
              <div className="form-group">
                <label>User Email Address</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="friend@example.com"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedWallets;
