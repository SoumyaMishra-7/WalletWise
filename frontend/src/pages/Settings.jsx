import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import './Settings.css';
import { FaWallet, FaBullseye, FaArrowLeft, FaCheck, FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const Settings = () => {
  const { user, loading, updateProfile } = useAuth();
  const lastUserIdRef = useRef(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    incomeFrequency: 'Monthly',
    incomeSources: '',
    priorities: 'Saving',
    riskTolerance: 'Moderate'
  });

  /* Removed isEditing state */

  useEffect(() => {
    if (!user) {
      lastUserIdRef.current = null;
      return;
    }
    if (lastUserIdRef.current === user._id) return;

    const initialData = {
      incomeFrequency: user.incomeFrequency || 'Monthly',
      incomeSources: user.incomeSources || '',
      priorities: user.priorities || 'Saving',
      riskTolerance: user.riskTolerance || 'Moderate'
    };

    setFormData(initialData);
    lastUserIdRef.current = user._id;
    setHasChanges(false);
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
    setStatus({ type: '', message: '' });
  };

  /* Removed handleEdit */

  const handleReset = () => {
    if (!user) return;
    setStatus({ type: '', message: '' });
    setFormData({
      incomeFrequency: user.incomeFrequency || 'Monthly',
      incomeSources: user.incomeSources || '',
      priorities: user.priorities || 'Saving',
      riskTolerance: user.riskTolerance || 'Moderate'
    });
    setHasChanges(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const payload = {
        incomeFrequency: formData.incomeFrequency,
        incomeSources: formData.incomeSources,
        priorities: formData.priorities,
        riskTolerance: formData.riskTolerance
      };

      const data = await updateProfile(payload);

      if (data?.success) {
        setFormData({
          incomeFrequency: data.user?.incomeFrequency || 'Monthly',
          incomeSources: data.user?.incomeSources || '',
          priorities: data.user?.priorities || 'Saving',
          riskTolerance: data.user?.riskTolerance || 'Moderate'
        });
        setStatus({
          type: 'success',
          message: 'Your financial profile has been updated successfully!'
        });
        setHasChanges(false);

        setTimeout(() => {
          setStatus({ type: '', message: '' });
        }, 5000);
      } else {
        setStatus({
          type: 'error',
          message: data?.message || 'Unable to save changes. Please try again.'
        });
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to save changes. Please try again.';
      setStatus({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldInfo = {
    incomeFrequency: 'How often you receive income',
    incomeSources: 'e.g., Salary, Freelance, Investments',
    priorities: 'Your primary financial goal',
    riskTolerance: 'Your comfort level with investment risk'
  };

  return (
    <div className="settings-page">
      <AppNavbar />

      <div className="settings-container">
        {/* Header */}
        <header className="settings-header">
          <Link to="/dashboard" className="back-link">
            <FaArrowLeft />
            Back to Dashboard
          </Link>

          <div className="header-content">
            <span className="eyebrow">Configuration</span>
            <h1>Financial Profile</h1>
            <p>Customize your financial preferences to get personalized insights and recommendations tailored to your goals.</p>
          </div>
        </header>

        {/* Status Messages */}
        {status.message && (
          <div className={`status-message ${status.type}`}>
            <div className="status-icon">
              {status.type === 'success' ? <FaCheck /> : <FaExclamationTriangle />}
            </div>
            <p>{status.message}</p>
            <button onClick={() => setStatus({ type: '', message: '' })} className="close-status">
              <FaTimes />
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="settings-form">
          {/* Income Information Section */}
          <section className="settings-card">
            <div className="card-header">
              <div className="card-icon blue">
                <FaWallet />
              </div>
              <div>
                <h2>Income Information</h2>
                <p>Help us understand your income patterns</p>
              </div>
            </div>

            <div className="form-grid">
              {/* Income Frequency */}
              <div className="form-group">
                <label htmlFor="incomeFrequency">
                  Income Frequency <span className="required">*</span>
                </label>
                <p className="field-info">{fieldInfo.incomeFrequency}</p>
                <div className="select-wrapper">
                  <select
                    id="incomeFrequency"
                    name="incomeFrequency"
                    value={formData.incomeFrequency}
                    onChange={handleChange}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              {/* Income Sources */}
              <div className="form-group">
                <label htmlFor="incomeSources">Income Sources</label>
                <p className="field-info">{fieldInfo.incomeSources}</p>
                <input
                  id="incomeSources"
                  type="text"
                  name="incomeSources"
                  value={formData.incomeSources}
                  onChange={handleChange}
                  placeholder="Enter your income sources"
                />
              </div>
            </div>
          </section>

          {/* Financial Goals Section */}
          <section className="settings-card">
            <div className="card-header">
              <div className="card-icon purple">
                <FaBullseye />
              </div>
              <div>
                <h2>Financial Goals & Preferences</h2>
                <p>Define your financial priorities and risk appetite</p>
              </div>
            </div>

            <div className="form-grid">
              {/* Financial Priorities */}
              <div className="form-group">
                <label htmlFor="priorities">
                  Financial Priorities <span className="required">*</span>
                </label>
                <p className="field-info">{fieldInfo.priorities}</p>
                <div className="select-wrapper">
                  <select
                    id="priorities"
                    name="priorities"
                    value={formData.priorities}
                    onChange={handleChange}
                  >
                    <option value="Saving">Saving</option>
                    <option value="Investing">Investing</option>
                    <option value="Debt Payoff">Debt Payoff</option>
                    <option value="Balanced">Balanced</option>
                  </select>
                </div>
              </div>

              {/* Risk Tolerance */}
              <div className="form-group">
                <label htmlFor="riskTolerance">
                  Risk Tolerance <span className="required">*</span>
                </label>
                <p className="field-info">{fieldInfo.riskTolerance}</p>
                <div className="select-wrapper">
                  <select
                    id="riskTolerance"
                    name="riskTolerance"
                    value={formData.riskTolerance}
                    onChange={handleChange}
                  >
                    <option value="Conservative">Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
            </div>
          </section>
        </form>

        {/* Static Footer */}
        <div className="settings-footer">
          <div className="footer-content">
            <div className="unsaved-changes">
              {hasChanges && (
                <>
                  <FaExclamationTriangle />
                  <span>You have unsaved changes</span>
                </>
              )}
            </div>

            <div className="footer-actions">
              <button
                type="button"
                onClick={handleReset}
                disabled={loading || isSaving || !user || !hasChanges}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSave}
                disabled={loading || isSaving || !user || !hasChanges}
                className="btn-primary"
              >
                {isSaving ? (
                  <>
                    <div className="spinner-small"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;