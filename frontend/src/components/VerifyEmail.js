import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reloadUser } = useAuth();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email.trim() || !otp.trim()) {
      toast.error('Email and OTP are required');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/verify-email', {
        email: email.trim(),
        otp: otp.trim()
      });

      if (data?.success) {
        toast.success('Email verified! Redirecting...');
        await reloadUser();
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } else {
        toast.error(data?.message || 'Verification failed');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Verification failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    setResending(true);
    try {
      const { data } = await api.post('/api/auth/resend-otp', {
        email: email.trim()
      });
      if (data?.success) {
        toast.success('OTP resent. Check your inbox.');
      } else {
        toast.error(data?.message || 'Failed to resend OTP');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Failed to resend OTP. Please try again.';
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="auth-card">
        <div className="auth-header">
          <h1>WalletWise</h1>
          <p className="subtitle">Verify your email to continue.</p>
        </div>

        <form onSubmit={handleVerify} className="auth-form">
          <div className="form-group">
            <label htmlFor="verify-email">Email Address</label>
            <input
              type="email"
              id="verify-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="otp">OTP Code</label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
              maxLength={6}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="demo-btn"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? 'Resending...' : 'Resend OTP'}
          </button>
        </form>
      </div>

      <div className="auth-features">
        <h3>Quick Tips</h3>
        <ul>
          <li>Check spam or promotions</li>
          <li>OTP expires in 10 minutes</li>
          <li>Use the same email you signed up with</li>
        </ul>
      </div>
    </div>
  );
};

export default VerifyEmail;
