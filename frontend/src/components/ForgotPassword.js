import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import api from '../api/client';
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
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/auth/forgot-password', { email });

      if (data?.success) {
        sessionStorage.setItem('resetEmail', email);
        toast.success('OTP sent to your email successfully!', {
          autoClose: 2000,
          pauseOnHover: false
        });

        setTimeout(() => {
          navigate('/forgot-password/verify');
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to send OTP. Please try again.');

        if (data?.devOtp) {
          toast.info(`Dev Mode OTP: ${data.devOtp}`, { autoClose: false });
        }

        if (data?.devResetLink) {
          toast.info('Email service is not configured. Opening development reset link.');
          window.location.href = data.devResetLink;
          return;
        }
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        'An error occurred. Please try again later.';
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
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />
              Email Address
            </label>

            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
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
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remember your password?
            <Link to="/login" className="auth-link"> Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
