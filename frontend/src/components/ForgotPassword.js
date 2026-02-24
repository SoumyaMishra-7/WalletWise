import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { FaUser } from 'react-icons/fa';
import api from '../api/client';
import 'react-toastify/dist/ReactToastify.css';

import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setEmail(e.target.value);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');

      toast.error('Please enter your email');

      return;
    }

    try {
      setLoading(true);

      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('OTP sent to your email successfully!', {
          autoClose: 2000,
          pauseOnHover: false
        });
        
        // Navigate to reset password page with email in query params
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('An error occurred. Please try again later.');
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
        <Link to="/login" className="back-to-home">
          <FaArrowLeft /> Back to Login
        </Link>
        
        <div className="auth-header">
          <h1>WalletWise</h1>
          <p className="subtitle">Enter your email to receive a password reset OTP.</p>
        <div className="auth-header">
          <h1>Forgot Password</h1>
          <p className="subtitle">Enter your email to receive a password reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />

              <FaUser className="input-icon" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}

              onChange={handleChange}

              onChange={(e) => setEmail(e.target.value)}

              placeholder="Enter your email"
              required
            />
          </div>
          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Sending OTP...
              </>
            ) : (
              'Send OTP'
            )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}

          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?
            <Link to="/login" className="auth-link">Login</Link>

            Remembered your password?
            <Link to="/login" className="auth-link"> Back to Login</Link>

          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
