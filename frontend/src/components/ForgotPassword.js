import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { FaUser } from 'react-icons/fa';
import api from '../api/client';
import 'react-toastify/dist/ReactToastify.css';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/auth/forgot-password', { email });
      if (response?.data?.success) {
        const devResetLink = response?.data?.devResetLink;
        if (devResetLink) {
          toast.info('Email service is not configured. Opening development reset link.');
          window.location.href = devResetLink;
          return;
        }

        toast.success('Reset link sent. Check your inbox.');
      } else {
        toast.error(response?.data?.message || 'Failed to send reset link');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        'Failed to send reset link. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="auth-card">
        <div className="auth-header">
          <h1>Forgot Password</h1>
          <p className="subtitle">Enter your email to receive a password reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              <FaUser className="input-icon" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remembered your password?
            <Link to="/login" className="auth-link"> Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
