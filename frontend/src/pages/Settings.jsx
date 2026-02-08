import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import './Settings.css';

const Settings = () => {
  const { user, loading, updateProfile } = useAuth();
  const lastUserIdRef = useRef(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    incomeFrequency: 'Monthly',
    incomeSources: '',
    priorities: 'Saving',
    riskTolerance: 'Moderate'
  });

  useEffect(() => {
    if (!user) {
      lastUserIdRef.current = null;
      return;
    }
    if (lastUserIdRef.current === user._id) return;
    setFormData((prev) => ({
      ...prev,
      incomeFrequency: user.incomeFrequency || 'Monthly',
      incomeSources: user.incomeSources || '',
      priorities: user.priorities || 'Saving',
      riskTolerance: user.riskTolerance || 'Moderate'
    }));
    lastUserIdRef.current = user._id;
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    if (!user) return;
    setStatus({ type: '', message: '' });
    setFormData((prev) => ({
      ...prev,
      incomeFrequency: user.incomeFrequency || 'Monthly',
      incomeSources: user.incomeSources || '',
      priorities: user.priorities || 'Saving',
      riskTolerance: user.riskTolerance || 'Moderate'
    }));
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
        setFormData((prev) => ({
          ...prev,
          incomeFrequency: data.user?.incomeFrequency || 'Monthly',
          incomeSources: data.user?.incomeSources || '',
          priorities: data.user?.priorities || 'Saving',
          riskTolerance: data.user?.riskTolerance || 'Moderate'
        }));
        setStatus({ type: 'success', message: 'Settings updated successfully.' });
      } else {
        setStatus({ type: 'error', message: data?.message || 'Unable to save changes.' });
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to save changes.';
      setStatus({ type: 'error', message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <Link to="/dashboard" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <span className="eyebrow">Configuration</span>
          <h1>Financial Profile</h1>
          <p>Update your financial profile to sharpen insights.</p>
        </div>
      </header>

      <section className="settings-section">
        <div className="section-heading">
          <h2>Financial Profile</h2>
          <p>Optional details to improve insights and recommendations.</p>
        </div>
        <div className="profile-card">
          <div className="profile-form">
            <label>
              Income Frequency
              <select name="incomeFrequency" value={formData.incomeFrequency} onChange={handleChange}>
                <option>Monthly</option>
                <option>Bi-Weekly</option>
                <option>Weekly</option>
                <option>Quarterly</option>
              </select>
            </label>
            <label>
              Income Sources
              <input
                type="text"
                name="incomeSources"
                value={formData.incomeSources}
                onChange={handleChange}
              />
            </label>
            <label>
              Financial Priorities
              <select name="priorities" value={formData.priorities} onChange={handleChange}>
                <option>Saving</option>
                <option>Investing</option>
                <option>Debt Payoff</option>
                <option>Balanced</option>
              </select>
            </label>
            <label>
              Risk Tolerance
              <select name="riskTolerance" value={formData.riskTolerance} onChange={handleChange}>
                <option>Conservative</option>
                <option>Moderate</option>
                <option>Aggressive</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <form className="settings-actions" onSubmit={handleSave}>
        {status.message && (
          <div className={`settings-status ${status.type}`}>{status.message}</div>
        )}
        <div className="settings-actions-buttons">
          <button
            className="btn-secondary"
            type="button"
            onClick={handleReset}
            disabled={loading || isSaving || !user}
          >
            Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={loading || isSaving || !user}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
