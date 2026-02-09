import React, { useState, useEffect } from 'react';
import './AddExpense.css';

const AddExpense = ({ isOpen, onClose, onAddExpense, transactionToEdit }) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: 'food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    description: '',
    mood: 'neutral' // New behavioral component
  });

  useEffect(() => {
    if (transactionToEdit) {
      setFormData({
        amount: transactionToEdit.amount,
        category: transactionToEdit.category || 'food',
        date: transactionToEdit.date ? new Date(transactionToEdit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paymentMethod: transactionToEdit.paymentMethod || 'cash',
        description: transactionToEdit.description || '',
        mood: transactionToEdit.mood || 'neutral'
      });
    } else {
      setFormData({
        amount: '',
        category: 'food',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
        mood: 'neutral'
      });
    }
  }, [transactionToEdit, isOpen]);

  const expenseCategories = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'transport', label: 'Transportation' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Health & Fitness' },
    { value: 'housing', label: 'Housing' },
    { value: 'other', label: 'Other' }
  ];

  // Mood options to evaluate behavioral traces
  const moodOptions = [
    { value: 'happy', label: 'Happy / Excited' },
    { value: 'stressed', label: 'Stressed / Tired' },
    { value: 'bored', label: 'Bored / Impulsive' },
    { value: 'sad', label: 'Sad / Low' },
    { value: 'calm', label: 'Calm / Productive' },
    { value: 'neutral', label: 'Neutral' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Debit/Credit Card' },
    { value: 'online', label: 'Online Banking' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const transactionData = {
      type: 'expense',
      amount: Number(formData.amount),
      category: formData.category,
      description: formData.description || '',
      paymentMethod: formData.paymentMethod,
      date: formData.date,
      mood: formData.mood
    };

    if (transactionToEdit) {
      const id = transactionToEdit._id || transactionToEdit.id;

      if (id) {
        transactionData._id = id;
        console.log("✅ Attaching ID for Edit:", id);
      } else {
        console.error("⚠️ Error: Editing but no ID found in:", transactionToEdit);
      }
    }

    onAddExpense(transactionData);
    onClose();

    if (!transactionToEdit) {
      setFormData({
        amount: '',
        category: 'food',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: '',
        mood: 'neutral'
      });
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
        <div className="expense-modal-header expense-header">
          <h2>{transactionToEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="close-expense-btn" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount Field */}
          <div className="expense-form-group">
            <label htmlFor="amount">Amount (Required)</label>
            <div className="expense-amount-input">
              <span className="currency-label">₹</span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Behavioral Component: Mood Tracking */}
          <div className="expense-form-group">
            <label>How were you feeling during this purchase?</label>
            <div className="selection-grid">
              {moodOptions.map(m => (
                <button
                  key={m.value}
                  type="button"
                  className={`selection-btn ${formData.mood === m.value ? 'active' : ''}`}
                  aria-pressed={formData.mood === m.value}
                  onClick={() => setFormData(prev => ({ ...prev, mood: m.value }))}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selection */}
          <div className="expense-form-group">
            <label>Category</label>
            <div className="selection-grid">
              {expenseCategories.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`selection-btn ${formData.category === cat.value ? 'active' : ''}`}
                  aria-pressed={formData.category === cat.value}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row-flex">
            {/* Date Field */}
            <div className="expense-form-group flex-1">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
            </div>

            {/* Payment Method */}
            <div className="expense-form-group flex-1">
              <label htmlFor="paymentMethod">Payment Method</label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
              >
                {paymentMethods.map(pm => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="expense-form-group">
            <label htmlFor="description">Notes / Context</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Reward for long day, Social gathering, etc."
              rows="2"
            />
          </div>

          <div className="expense-form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              {transactionToEdit ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
