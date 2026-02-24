import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import './SetBudget.css';
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from '../context/AuthContext';

const DEFAULT_CATEGORIES = [
  { name: 'Food', categoryType: 'food', amount: 0, percentage: 0, color: '#FF6B6B' },
  { name: 'Transport', categoryType: 'transport', amount: 0, percentage: 0, color: '#4ECDC4' },
  { name: 'Shopping', categoryType: 'shopping', amount: 0, percentage: 0, color: '#06D6A0' },
  { name: 'Entertainment', categoryType: 'entertainment', amount: 0, percentage: 0, color: '#FFD166' },
  { name: 'Education', categoryType: 'education', amount: 0, percentage: 0, color: '#118AB2' },
  { name: 'Healthcare', categoryType: 'healthcare', amount: 0, percentage: 0, color: '#EF4444' },
  { name: 'Housing', categoryType: 'housing', amount: 0, percentage: 0, color: '#8B5CF6' },
  { name: 'Other', categoryType: 'other', amount: 0, percentage: 0, color: '#7209B7' }
];

const SetBudget = ({ isOpen, onClose, onSetBudget }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    totalBudget: '',
    categories: DEFAULT_CATEGORIES
  });

  const [activeCategory, setActiveCategory] = useState(0);
  const { user } = useAuth();
  const currencySymbol = user?.currency === 'INR' ? '₹' : (user?.currency === 'EUR' ? '€' : (user?.currency === 'GBP' ? '£' : '$'));
  const locale = user?.currency === 'INR' ? 'en-IN' : 'en-US';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        totalBudget: '',
        categories: DEFAULT_CATEGORIES
      });
      setActiveCategory(0);
      setError('');
    }
  }, [isOpen]);

  // Update amounts when total budget changes
  useEffect(() => {
    const total = Number(formData.totalBudget) || 0;
    if (total > 0) {
      setFormData(prev => ({
        ...prev,
        categories: prev.categories.map(cat => ({
          ...cat,
          amount: Math.round((cat.percentage / 100) * total),
          amountStr: Math.round((cat.percentage / 100) * total).toString()
        }))
      }));
    }
  }, [formData.totalBudget]);

  const handleTotalBudgetChange = (e) => {
    const value = e.target.value;
    const numValue = value === '' ? '' : parseInt(value) || 0;

    setFormData(prev => ({
      ...prev,
      totalBudget: numValue,
      categories: prev.categories.map(cat => ({
        ...cat,
        amount: Math.round((cat.percentage / 100) * (numValue || 0)),
        amountStr: Math.round((cat.percentage / 100) * (numValue || 0)).toString()
      }))
    }));
  };

  const handleCategoryPercentageChange = (index, value) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    const maxValue = 100;
    const clampedValue = Math.min(Math.max(numValue, 0), maxValue);

    const updatedCategories = [...formData.categories];
    updatedCategories[index] = {
      ...updatedCategories[index],
      percentage: clampedValue,
      amount: Math.round((clampedValue / 100) * (formData.totalBudget || 0)),
      amountStr: Math.round((clampedValue / 100) * (formData.totalBudget || 0)).toString()
    };

    // Recalculate other categories to maintain total of 100%
    const totalPercentage = updatedCategories.reduce((sum, cat) => sum + cat.percentage, 0);
    if (totalPercentage > 100) {
      // Adjust other categories proportionally
      const otherCategories = updatedCategories.filter((_, i) => i !== index);
      const totalOtherPercentage = otherCategories.reduce((sum, cat) => sum + cat.percentage, 0);
      const remainingPercentage = 100 - clampedValue;

      if (totalOtherPercentage > 0) {
        otherCategories.forEach((cat, i) => {
          const originalIndex = updatedCategories.findIndex(c => c.name === cat.name);
          const newPercentage = Math.round((cat.percentage / totalOtherPercentage) * remainingPercentage);
          updatedCategories[originalIndex] = {
            ...updatedCategories[originalIndex],
            percentage: newPercentage,
            amount: Math.round((newPercentage / 100) * (formData.totalBudget || 0)),
            amountStr: Math.round((newPercentage / 100) * (formData.totalBudget || 0)).toString()
          };
        });
      }
    }

    setFormData(prev => ({ ...prev, categories: updatedCategories }));
  };

  const handleCategoryAmountChange = (index, value) => {
    const numValue = value === '' ? 0 : parseInt(value) || 0;
    const maxAmount = formData.totalBudget || 0;
    const clampedValue = Math.min(Math.max(numValue, 0), maxAmount);

    const percentage = (formData.totalBudget || 0) > 0
      ? Math.round((clampedValue / (formData.totalBudget || 1)) * 100)
      : 0;

    const updatedCategories = [...formData.categories];
    updatedCategories[index] = {
      ...updatedCategories[index],
      amount: clampedValue,
      percentage: percentage,
      amountStr: clampedValue.toString()
    };

    setFormData(prev => ({ ...prev, categories: updatedCategories }));
  };

  const handleQuickAllocation = (type) => {
    const allocations = {
      'student': [25, 15, 10, 10, 15, 5, 10, 10],
      'balanced': [20, 15, 10, 10, 15, 10, 10, 10],
      'saver': [30, 20, 5, 5, 15, 5, 15, 5]
    };

    const percentages = allocations[type] || allocations['balanced'];
    const total = Number(formData.totalBudget) || 0;
    const updatedCategories = formData.categories.map((cat, index) => ({
      ...cat,
      percentage: percentages[index],
      amount: Math.round((percentages[index] / 100) * total),
      amountStr: Math.round((percentages[index] / 100) * total).toString()
    }));

    setFormData(prev => ({ ...prev, categories: updatedCategories }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.totalBudget || Number(formData.totalBudget) <= 0) {
      setError('Please enter a valid total budget amount');
      setLoading(false);
      return;
    }

    const totalPercentage = formData.categories.reduce((sum, cat) => sum + cat.percentage, 0);
    if (totalPercentage !== 100) {
      setError(`Total percentage must be 100%. Currently it's ${totalPercentage}%`);
      setLoading(false);
      return;
    }

    const totalBudget = Number(formData.totalBudget);
    const normalizedCategories = formData.categories.map((cat) => {
      const percentage = Number(cat.percentage) || 0;
      const amount = Math.round((percentage / 100) * totalBudget);
      return {
        name: cat.name,
        categoryType: cat.categoryType,
        amount,
        percentage,
        color: cat.color
      };
    });

    const totalAllocated = normalizedCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const remainder = totalBudget - totalAllocated;
    if (remainder !== 0 && normalizedCategories.length > 0) {
      const targetIndex = normalizedCategories.reduce(
        (bestIdx, cat, idx, arr) => (cat.percentage >= arr[bestIdx].percentage ? idx : bestIdx),
        0
      );
      normalizedCategories[targetIndex] = {
        ...normalizedCategories[targetIndex],
        amount: Math.max(0, normalizedCategories[targetIndex].amount + remainder)
      };
    }

    const budgetData = {
      totalBudget,
      categories: normalizedCategories,
      month: new Date().toISOString().slice(0, 7)
    };

    try {
      const response = await api.post('/api/budget', budgetData);

      if (response.data.success) {
        toast.success(response.data.notification?.message || 'Budget set succesfully.', {
          style: {
            background: '#16a34a',
            color: '#ffffff'
          },
          iconTheme: {
            primary: '#bbf7d0',
            secondary: '#166534'
          }
        });

        // Call parent callback
        if (onSetBudget) {
          onSetBudget(response.data.budget);
        }

        // Close modal
        onClose();
      } else {
        throw new Error(response.data.message || 'Failed to set budget');
      }
    } catch (err) {
      console.error('Budget set error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to set budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLastMonth = async () => {
    // This would be handled by the parent component
    alert('Copy last month feature would be implemented here');
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('budget-modal-overlay')) {
      handleClose();
    }
  };

  const resetForm = () => {
    setFormData({
      totalBudget: '',
      categories: DEFAULT_CATEGORIES
    });
    setActiveCategory(0);
    setError('');
  };

  const handleClose = () => {
    setShowConfirm(true);
  };

  if (!isOpen) return null;

  const totalAllocated = formData.categories.reduce((sum, cat) => sum + cat.percentage, 0);
  const remainingPercentage = 100 - totalAllocated;

  return (
    <div className="budget-modal-overlay" onClick={handleOverlayClick}>
      <div className="budget-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="budget-modal-header">
          <div className="header-left">
            <h2>Set Monthly Budget</h2>
          </div>
          <button className="close-budget-btn" onClick={handleClose}>
            ×
          </button>
        </div>

        {error && (
          <div className="budget-error-alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Total Budget */}
          <div className="budget-form-group">
            <label htmlFor="totalBudget">
              Total Monthly Budget *
            </label>
            <div className="total-budget-input">
              <span className="budget-currency">{currencySymbol}</span>
              <input
                type="number"
                id="totalBudget"
                value={formData.totalBudget}
                onChange={handleTotalBudgetChange}
                placeholder="0"
                min="0"
                required
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {/* Quick Allocation Buttons */}
          <div className="budget-form-group">
            <div className="quick-allocation-header">
              <label>Quick Allocation Templates</label>
              <button
                type="button"
                className="copy-last-month-btn"
                onClick={handleCopyLastMonth}
                disabled={loading}
              >
                Copy Last Month
              </button>
            </div>
            <div className="quick-allocation-buttons">
              <button
                type="button"
                className="allocation-btn student"
                onClick={() => handleQuickAllocation('student')}
                disabled={loading}
              >
                Student
              </button>
              <button
                type="button"
                className="allocation-btn balanced"
                onClick={() => handleQuickAllocation('balanced')}
                disabled={loading}
              >
                Balanced
              </button>
              <button
                type="button"
                className="allocation-btn saver"
                onClick={() => handleQuickAllocation('saver')}
                disabled={loading}
              >
                Saver
              </button>
            </div>
          </div>

          {/* Category Budgets */}
          <div className="budget-form-group">
            <label>Category-wise Allocation *</label>

            <div className="category-tabs">
              {formData.categories.map((category, index) => (
                <button
                  key={category.name}
                  type="button"
                  className={`category-tab ${activeCategory === index ? 'active' : ''}`}
                  onClick={() => setActiveCategory(index)}
                  style={{ borderLeftColor: category.color }}
                  disabled={loading}
                >
                  <span className="tab-name">{category.name}</span>
                  <span className="tab-percentage">{category.percentage}%</span>
                </button>
              ))}
            </div>

            {/* Active Category Editor */}
            <div className="active-category-editor">
              <div className="category-header" style={{ backgroundColor: formData.categories[activeCategory].color + '20' }}>
                <div className="category-color" style={{ backgroundColor: formData.categories[activeCategory].color }}></div>
                <h3>{formData.categories[activeCategory].name}</h3>
                <div className="category-stats">
                  <span className="stat-percentage">{formData.categories[activeCategory].percentage}%</span>
                  <span className="stat-amount">{currencySymbol}{formData.categories[activeCategory].amount.toLocaleString(locale)}</span>
                </div>
              </div>

              <div className="category-controls">
                {/* Percentage Slider */}
                <div className="control-group">
                  <label>Percentage Allocation</label>
                  <div className="slider-container">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.categories[activeCategory].percentage}
                      onChange={(e) => handleCategoryPercentageChange(activeCategory, e.target.value)}
                      className="percentage-slider"
                      style={{ '--track-color': formData.categories[activeCategory].color }}
                      disabled={loading}
                    />
                    <div className="slider-value">
                      <span>{formData.categories[activeCategory].percentage}%</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.categories[activeCategory].percentage}
                        onChange={(e) => handleCategoryPercentageChange(activeCategory, e.target.value)}
                        className="percentage-input"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="control-group">
                  <label>Amount ({currencySymbol})</label>
                  <div className="amount-input-container">
                    <span className="amount-currency">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      max={formData.totalBudget || 0}
                      value={formData.categories[activeCategory].amountStr || formData.categories[activeCategory].amount}
                      onChange={(e) => handleCategoryAmountChange(activeCategory, e.target.value)}
                      className="amount-input"
                      disabled={loading}
                    />
                    <span className="amount-hint">
                      Max: {currencySymbol}{(formData.totalBudget || 0).toLocaleString(locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Allocation Summary */}
            <div className="allocation-summary">
              <div className="summary-item">
                <span className="summary-label">Total Allocated:</span>
                <span className={`summary-value ${totalAllocated === 100 ? 'valid' : 'invalid'}`}>
                  {totalAllocated}%
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Remaining:</span>
                <span className={`summary-value ${remainingPercentage === 0 ? 'valid' : 'warning'}`}>
                  {remainingPercentage}%
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Amount:</span>
                <span className="summary-value amount">
                  {currencySymbol}{(formData.totalBudget || 0).toLocaleString(locale)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="budget-form-actions">
            <button
              type="button"
              className="budget-btn-cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="budget-btn-submit"
              disabled={totalAllocated !== 100 || !formData.totalBudget || Number(formData.totalBudget) <= 0 || loading}
            >
              {loading ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
      <ConfirmDialog
        isOpen={showConfirm}
        message="Are you sure you want to close? Any unsaved budget changes will be lost."
        onConfirm={() => {
          setShowConfirm(false);
          resetForm();
          onClose();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default SetBudget;
