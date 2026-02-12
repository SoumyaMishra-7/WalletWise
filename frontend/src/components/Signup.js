import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaIdCard,
  FaUniversity,
  FaGraduationCap,
  FaPhone,
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaArrowLeft
} from 'react-icons/fa';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    studentId: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    department: '',
    year: '1st'
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const years = ['1st', '2nd', '3rd', '4th', '5th'];

  const {
    studentId,
    email,
    password,
    confirmPassword,
    fullName,
    phoneNumber,
    department,
    year
  } = formData;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validations
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!studentId.trim()) {
      toast.error('Student ID is required');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!department.trim()) {
      toast.error('Department is required');
      return;
    }

    setLoading(true);

    try {
      const data = await signup({
        studentId: studentId.trim(),
        email: email.toLowerCase().trim(),
        password: password,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        department: department.trim(),
        year: year
      });

      if (data?.success && data?.requiresVerification) {
        toast.success('Registration successful! Please verify your email.');
        navigate(`/verify-email?email=${encodeURIComponent(data.email || email)}`);
      } else if (data?.success) {
        toast.success('Registration successful! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        toast.error(data?.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);

      let errorMessage = 'Registration failed. Please try again.';

      if (error.response) {
        const { status, data } = error.response;
        console.error(`Server error ${status}:`, data);

        if (status === 400) {
          // Handle validation errors
          if (data.errors && data.errors.length > 0) {
            errorMessage = data.errors[0].msg || 'Please check your input fields';
          } else {
            errorMessage = data.message || 'Please check your input fields';
          }
        } else if (status === 409 || status === 422) {
          errorMessage = data.message || 'User already exists with this email or student ID';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        console.error('No response from server. Is backend running?');
        errorMessage =
          'Cannot connect to server. Please make sure the backend is running on http://localhost:5000';
      } else {
        console.error('Error:', error.message);
        if (error.message.includes('Network Error')) {
          errorMessage =
            'Network error. Check your connection and CORS settings.';
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container split-layout">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="auth-features">
        <h1>Student Benefits</h1>
        <ul>
          <li>No-cost student plan</li>
          <li>Smart budgeting templates</li>
          <li>Insightful weekly summaries</li>
          <li>Alerts for overspending</li>
          <li>Export-ready reports</li>
        </ul>
      </div>

      <div className="auth-card">
        <Link to="/" className="back-to-home">
          <FaArrowLeft /> Back to Home
        </Link>
        <div className="auth-header">
          <h1>WalletWise</h1>
          <p className="subtitle">Create your student account</p>

        </div>

        <button
          type="button"
          className="demo-btn google-btn"
          onClick={() => {
            const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            window.location.href = `${apiBase}/auth/google`;
          }}
        >
          <FaGoogle className="google-icon" />
          Sign Up with Google
        </button>

        <div className="auth-divider">
          <span>OR</span>
        </div>


        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="studentId">
                <FaIdCard className="input-icon" />
                Student ID *
              </label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={studentId}
                onChange={handleChange}
                placeholder="Your student ID"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fullName">
                <FaUser className="input-icon" />
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={handleChange}
                placeholder="Your full name"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="Your email address"
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">
                <FaLock className="input-icon" />
                Password *
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <FaLock className="input-icon" />
                Confirm Password *
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phoneNumber">
                <FaPhone className="input-icon" />
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={phoneNumber}
                onChange={handleChange}
                placeholder="Your phone number"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="year">
                <FaGraduationCap className="input-icon" />
                Year *
              </label>
              <select
                id="year"
                name="year"
                value={year}
                onChange={handleChange}
                required
                disabled={loading}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} Year
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">
              <FaUniversity className="input-icon" />
              Department *
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={department}
              onChange={handleChange}
              placeholder="e.g., Computer Science"
              required
              disabled={loading}
            />
          </div>

          <div className="terms-agreement">
            <label>
              <input type="checkbox" required disabled={loading} />
              <span>
                I agree to the <Link to="/terms">Terms & Conditions</Link> and{' '}
                <Link to="/privacy">Privacy Policy</Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>

        </form>

        <div className="auth-footer">
          <p>
            Already have an account?
            <Link to="/login" className="auth-link">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
