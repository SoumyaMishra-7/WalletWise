import React, { useState, useEffect } from 'react';
import api from '../api/client';
import './SavingGoal.css';

const SavingGoal = ({ isOpen, onClose, onGoalCreated }) => {
  const [timeline, setTimeline] = useState(6); // default 6 months
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    category: 'Emergency Fund',
    priority: 'Medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categories = ['Emergency Fund', 'Travel', 'Education', 'Home', 'Vehicle', 'Retirement', 'Wedding', 'Health', 'Gift', 'Other'];

  const priorityOptions = [
    { value: 'Critical', label: 'Must Have', color: '#FF6B6B' },
    { value: 'High', label: 'High Priority', color: '#4ECDC4' },
    { value: 'Medium', label: 'Medium Priority', color: '#FFD166' },
    { value: 'Low', label: 'Low Priority', color: '#06D6A0' }
  ];

  // Calculate remaining and monthly needed
  const targetAmountNum = Number(formData.targetAmount) || 0;
  const currentAmountNum = Number(formData.currentAmount) || 0;
  const remaining = Math.max(0, targetAmountNum - currentAmountNum);
  const monthlyNeeded = timeline > 0 ? Math.ceil(remaining / timeline) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submit triggered');
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter a goal name');
      setLoading(false);
      return;
    }

    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) {
      setError('Please enter a valid target amount');
      setLoading(false);
      return;
    }

    if (timeline <= 0) {
      setError('Please select a valid timeline');
      setLoading(false);
      return;
    }

    // Calculate target date
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + timeline);

    console.log('Calculated target date:', targetDate.toISOString());

    // Prepare goal data matching backend model
    const goalData = {
      name: formData.name.trim(),
      description: formData.description || `Saving for ${formData.name}`,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount || 0),
      targetDate: targetDate.toISOString(),
      category: formData.category,
      priority: formData.priority,
      monthlyContribution: monthlyNeeded,
      isActive: true
    };

    console.log('Goal data to send:', goalData);

    try {
      console.log('Sending request to backend...');

      // ADD TIMEOUT to prevent hanging indefinitely
      const response = await api.post('/api/savings-goals', goalData, {
        timeout: 15000
      });

      console.log('Response received:', response.data);

      if (response.data && response.data.message) {
        setSuccess(response.data.message);
      } else {
        setSuccess('Goal created successfully!');
      }

      // Call parent callback with the created goal
      if (onGoalCreated) {
        onGoalCreated(response.data.goal || response.data);
      }

      // Reset form after short delay
      setTimeout(() => {
        console.log('Closing modal and resetting form');
        resetForm();
        if (onClose) onClose();
      }, 1500);

    } catch (err) {
      console.error('Error creating goal:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code
      });

      // Handle different types of errors
      let errorMessage = 'Failed to create goal. Please try again.';

      if (err.response) {
        // Server responded with error
        if (err.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          // Redirect to login after delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (err.response.status === 400) {
          errorMessage = err.response.data.message || 'Invalid data. Please check your inputs.';
        } else if (err.response.status === 404) {
          errorMessage = 'API endpoint not found. Please check backend server.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (err.response.data && err.response.data.errors) {
          // Mongoose validation errors
          const errors = err.response.data.errors;
          errorMessage = Object.values(errors).map(e => e.message).join(', ');
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check: 1) Backend is running, 2) CORS is configured, 3) Network connection';
        console.log('No response received. Check if backend server is running at http://localhost:5000');
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Server might be busy or offline.';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Check your internet connection and ensure backend is running.';
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('savings-modal-overlay')) {
      onClose();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      targetAmount: '',
      currentAmount: '',
      category: 'Emergency Fund',
      priority: 'Medium'
    });
    setTimeline(6);
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const handleClose = React.useCallback(() => {
    if (!loading) {
      resetForm();
      if (onClose) onClose();
    }
  }, [loading, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Add keyboard event listener for Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="savings-modal-overlay" onClick={handleOverlayClick}>
      <div className="savings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="savings-modal-header">
          <div className="header-left">
            <h2>Create Savings Goal</h2>
            <p className="subtitle">Plan and track your financial goals</p>
          </div>
          <button
            className="close-savings-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="savings-error-alert">
            <span>⚠️ {error}</span>
            {error.includes('backend') && (
              <div className="debug-info">
                <small>Check: 1) Run backend server (npm start in backend folder), 2) Verify endpoint exists</small>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="savings-success-alert">
            <span>✅ {success}</span>
            <div className="success-timer">
              <div className="timer-bar"></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="savings-form">
          {/* Goal Name */}
          <div className="savings-form-group">
            <label htmlFor="goalName">
              Goal Name *
            </label>
            <input
              type="text"
              id="goalName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., New Laptop, Vacation, Emergency Fund"
              required
              disabled={loading}
              className={formData.name ? 'filled' : ''}
              autoFocus
            />
          </div>

          {/* Description (Optional) */}
          <div className="savings-form-group">
            <label htmlFor="description">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add notes about your goal..."
              rows="3"
              disabled={loading}
              maxLength="500"
            />
            <div className="char-count">
              {formData.description ? formData.description.length : 0}/500
            </div>
          </div>

          {/* Target Amount */}
          <div className="savings-form-group">
            <label htmlFor="targetAmount">
              Target Amount (₹) *
            </label>
            <div className="amount-input-group">
              <span className="currency-label">₹</span>
              <input
                type="number"
                id="targetAmount"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                placeholder="5000"
                min="1"
                step="0.01"
                required
                disabled={loading}
                className={formData.targetAmount ? 'filled' : ''}
              />
            </div>
          </div>

          {/* Current Savings */}
          <div className="savings-form-group">
            <label htmlFor="currentAmount">
              Current Savings (₹)
            </label>
            <div className="amount-input-group">
              <span className="currency-label">₹</span>
              <input
                type="number"
                id="currentAmount"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
                disabled={loading}
              />
            </div>
            <div className="helper-text">
              How much have you saved already?
            </div>
          </div>

          {/* Priority Level */}
          <div className="savings-form-group">
            <label>Priority Level</label>
            <div className="priority-grid">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`priority-btn ${formData.priority === opt.value ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, priority: opt.value })}
                  disabled={loading}
                  style={{ '--priority-color': opt.color }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Selection */}
          <div className="savings-form-group">
            <label>Timeline (Months) *</label>
            <div className="timeline-grid">
              {[1, 3, 6, 12, 24].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`timeline-btn ${timeline === m ? 'active' : ''}`}
                  onClick={() => setTimeline(m)}
                  disabled={loading}
                >
                  {m} {m === 1 ? 'Month' : 'Months'}
                </button>
              ))}
            </div>
            <div className="helper-text">
              When do you want to achieve this goal?
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="savings-form-group">
            <label htmlFor="category">Goal Category</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              disabled={loading}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Dynamic Summary Card */}
          {(formData.targetAmount && Number(formData.targetAmount) > 0) && (
            <div className="savings-summary-card">
              <div className="summary-title">
                <span>📊 Plan Summary</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Target:</span>
                  <span className="summary-value">₹{targetAmountNum.toLocaleString('en-IN')}</span>
                </div>

                <div className="summary-item">
                  <span className="summary-label">Current:</span>
                  <span className="summary-value">₹{currentAmountNum.toLocaleString('en-IN')}</span>
                </div>

                <div className="summary-item">
                  <span className="summary-label">Remaining:</span>
                  <span className="summary-value highlight">₹{remaining.toLocaleString('en-IN')}</span>
                </div>

                <div className="summary-item">
                  <span className="summary-label">Timeline:</span>
                  <span className="summary-value">{timeline} months</span>
                </div>
              </div>

              <div className="monthly-section">
                <div className="monthly-label">Monthly savings needed:</div>
                <div className="monthly-amount">₹{monthlyNeeded.toLocaleString('en-IN')}</div>
                <div className="monthly-note">
                  Save this amount each month to reach your goal on time
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="savings-form-actions">
            <button
              type="button"
              className="savings-btn-cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="savings-btn-submit"
              disabled={loading || !formData.name.trim() || !formData.targetAmount || Number(formData.targetAmount) <= 0}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating...
                </>
              ) : 'Create Goal'}
            </button>
          </div>

          {/* Debug info - only in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-info">
              <small>
                Endpoint: http://localhost:5000/api/savings-goals
              </small>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SavingGoal;
