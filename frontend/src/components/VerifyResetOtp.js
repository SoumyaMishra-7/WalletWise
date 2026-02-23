import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { FaLock } from 'react-icons/fa';
import api from '../api/client';
import 'react-toastify/dist/ReactToastify.css';
import './Auth.css';

const VerifyResetOtp = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const email = sessionStorage.getItem('resetEmail');

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/auth/forgot-password/verify', {
        email,
        otp
      });
      if (response?.data?.success) {
        sessionStorage.setItem('resetOtp', otp);
        toast.success('OTP verified');
        navigate('/forgot-password/reset');
      } else {
        toast.error(response?.data?.message || 'Invalid OTP');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        'OTP verification failed. Please try again.';
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
          <h1>Verify OTP</h1>
          <p className="subtitle">Enter the 6-digit code sent to your email.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="otp">
              <FaLock className="input-icon" />
              OTP Code
            </label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Didn’t get a code?
            <Link to="/forgot-password" className="auth-link"> Resend</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyResetOtp;
