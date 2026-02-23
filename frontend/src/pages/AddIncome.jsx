import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AddExpense.css'; // Reusing the clean CSS

const AddIncome = ({ isOpen, onClose, onAddIncome }) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'pocket_money',
    date: new Date().toISOString().split('T')[0],
    description: '',
    sourceNature: 'earned' // New behavioral component
  });
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const currencySymbol = user?.currency === 'INR' ? '₹' : (user?.currency === 'EUR' ? '€' : (user?.currency === 'GBP' ? '£' : '$'));

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
      category: formData.category,
      description: formData.description || '',
      date: formData.date,
      sourceNature: formData.sourceNature // Behavioral context
    };

    setLoading(true);
    try {
      await onAddIncome(transactionData);
      onClose();

      setFormData({
        amount: '',
        category: 'pocket_money',
        date: new Date().toISOString().split('T')[0],
        description: '',
        sourceNature: 'earned'
      });
    } catch (err) {
      console.error('Error adding income:', err);
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
            <label htmlFor="amount">Income Amount</label>
            <div className="expense-amount-input">
              <span className="currency-label" style={{ color: '#16a34a' }}>{currencySymbol}</span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                style={{ borderColor: '#86efac', color: '#16a34a' }}
                required
                autoFocus
                disabled={loading}
              />
            </div>
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
            <label htmlFor="description">Notes (Optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Source details or upcoming plans for this money..."
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
    </div>
  );
};

export default AddIncome;