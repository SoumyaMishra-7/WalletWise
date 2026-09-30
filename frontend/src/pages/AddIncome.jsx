import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { encryptNote } from '../services/encryption';
import VaultSetup from '../components/Vault/VaultSetup';
import VaultUnlock from '../components/Vault/VaultUnlock';
import { Lock, Unlock } from 'lucide-react';
import './AddExpense.css'; // Reusing the clean CSS

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (CNY)' },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar (SGD)' }
];

const AddIncome = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const defaultCurrency = user?.currency || 'USD';

  const [formData, setFormData] = useState({
    amount: '',
    currency: defaultCurrency,
    category: 'pocket_money',
    date: new Date().toISOString().split('T')[0],
    description: '',
    sourceNature: 'earned' // New behavioral component
  });
  const [loading, setLoading] = useState(false);

  // Vault States
  const { isVaultEnabled, isUnlocked, cryptoKey } = useVault();
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [showVaultSetup, setShowVaultSetup] = useState(false);
  const [showVaultUnlock, setShowVaultUnlock] = useState(false);

  const selectedCurrencyObj = SUPPORTED_CURRENCIES.find(c => c.code === formData.currency);
  const activeCurrencySymbol = selectedCurrencyObj ? selectedCurrencyObj.symbol : (user?.currency === 'INR' ? '₹' : (user?.currency === 'EUR' ? '€' : (user?.currency === 'GBP' ? '£' : '$')));

  const incomeCategories = [
    { value: 'pocket_money', label: 'Pocket Money' },
    { value: 'salary', label: 'Salary / Internship' },
    { value: 'freelance', label: 'Freelancing' },
    { value: 'gift', label: 'Gift / Windfall' },
    { value: 'investment', label: 'Investments' },
    { value: 'other', label: 'Other' }
  ];

  // Behavioral Trace: How the user perceives this money
  const sourceNatureOptions = [
    { value: 'earned', label: 'Hard-Earned' },
    { value: 'planned', label: 'Planned / Regular' },
    { value: 'windfall', label: 'Unexpected / Gift' },
    { value: 'passive', label: 'Passive / Returns' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const transactionData = {
      type: 'income',
      amount: Number(formData.amount),
      currency: formData.currency,
      category: formData.category,
      date: formData.date,
      sourceNature: formData.sourceNature // Behavioral context
    };

    setLoading(true);

    if (isEncrypted) {
      if (!isUnlocked || !cryptoKey) {
        setLoading(false);
        setShowVaultUnlock(true);
        return;
      }
      try {
        const cipherBlob = await encryptNote(formData.description || '', cryptoKey);
        transactionData.isEncrypted = true;
        transactionData.encryptedData = cipherBlob;
        transactionData.description = ''; // never send plaintext
        finalizeSubmit(transactionData);
      } catch (err) {
        setLoading(false);
        alert("Encryption failed.");
      }
    } else {
      transactionData.isEncrypted = false;
      transactionData.description = formData.description || '';
      finalizeSubmit(transactionData);
    }
  };

  const finalizeSubmit = async (transactionData) => {
    try {
      if (onSuccess) {
        await onSuccess(transactionData);
      }
      onClose();

      setFormData({
        amount: '',
        category: 'pocket_money',
        date: new Date().toISOString().split('T')[0],
        description: '',
        sourceNature: 'earned'
      });
      setIsEncrypted(false);
    } catch (err) {
      // Interceptor handles the toast
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="expense-modal-overlay">
      <div className="expense-modal-content">
        <div className="expense-modal-header" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
          <h2 style={{ color: '#166534' }}>Add Income</h2>
          <button className="close-expense-btn" onClick={onClose} disabled={loading} style={{ color: '#166534', borderColor: '#bbf7d0' }}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount Field */}
          <div className="expense-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label htmlFor="amount" style={{ margin: 0, color: '#166534' }}>Income Amount (Required)</label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                disabled={loading}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #86efac',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  background: '#f0fdf4',
                  color: '#166534',
                  cursor: 'pointer'
                }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>
            <div className="expense-amount-input">
              <span className="currency-label" style={{ color: '#16a34a' }}>{activeCurrencySymbol}</span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="any"
                style={{ borderColor: '#86efac', color: '#16a34a' }}
                required
                autoFocus
                disabled={loading}
              />
            </div>
            {formData.currency && (user?.currency || 'USD') !== formData.currency && (
              <small style={{ color: '#166534', marginTop: '4px', display: 'block', fontSize: '0.78rem' }}>
                ℹ️ Converts to your base currency (<strong>{user?.currency || 'USD'}</strong>) using historical rate on transaction date.
              </small>
            )}
          </div>

          {/* Behavioral Component: Source Nature */}
          <div className="expense-form-group">
            <label>Nature of this Income (Behavioral Trace)</label>
            <div className="selection-grid">
              {sourceNatureOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`selection-btn ${formData.sourceNature === option.value ? 'active' : ''}`}
                  style={formData.sourceNature === option.value ? { background: '#dcfce7', borderColor: '#22c55e', color: '#166534' } : {}}
                  onClick={() => setFormData(prev => ({ ...prev, sourceNature: option.value }))}
                  disabled={loading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="expense-form-group">
            <label>Income Category</label>
            <div className="selection-grid">
              {incomeCategories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`selection-btn ${formData.category === cat.value ? 'active' : ''}`}
                  style={formData.category === cat.value ? { background: '#dcfce7', borderColor: '#22c55e', color: '#166534' } : {}}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                  disabled={loading}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row-flex">
            <div className="expense-form-group flex-1">
              <label htmlFor="date">Date Received</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {/* Description */}
          <div className="expense-form-group">
            <div className="vault-toggle-header">
              <label htmlFor="description">Notes (Optional)</label>

              {isVaultEnabled ? (
                <button
                  type="button"
                  onClick={() => setIsEncrypted(!isEncrypted)}
                  className={`vault-toggle-btn ${isEncrypted ? 'encrypted-active' : ''}`}
                >
                  {isEncrypted ? <Lock size={14} /> : <Unlock size={14} />}
                  {isEncrypted ? 'Encrypted' : 'Encrypt Note'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowVaultSetup(true)}
                  className="vault-setup-prompt-btn"
                >
                  <Lock size={14} /> Enable Privacy Vault
                </button>
              )}
            </div>

            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={isEncrypted ? "This note will be encrypted on your device." : "Source details or upcoming plans for this money..."}
              className={isEncrypted ? "encrypted-textarea-bg" : ""}
              rows="2"
              disabled={loading}
            />
          </div>

          {/* Form Actions */}
          <div className="expense-form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ background: '#16a34a' }}
            >
              {loading ? "Processing..." : "Save Income"}
            </button>
          </div>
        </form>
      </div>

      {showVaultSetup && (
        <VaultSetup
          onClose={() => setShowVaultSetup(false)}
          onSuccess={() => setIsEncrypted(true)}
        />
      )}

      {showVaultUnlock && (
        <VaultUnlock
          onClose={() => setShowVaultUnlock(false)}
        />
      )}
    </div>
  );
};

export default AddIncome;
