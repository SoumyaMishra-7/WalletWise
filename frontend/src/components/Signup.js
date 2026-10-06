import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
  FaArrowLeft,
} from "react-icons/fa";
import "./Auth.css";
import { getApiOrigin } from "../api/client";
import { SUPPORTED_CURRENCIES, detectCurrencyFromLocale } from "../utils/currency";

const Signup = () => {
  const [formData, setFormData] = useState({
    studentId: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phoneNumber: "",
    department: "",
    year: "1st",
    currency: detectCurrencyFromLocale(),
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();
  const { signup } = useAuth();

  const years = ["1st", "2nd", "3rd", "4th", "5th"];

  const {
    studentId,
    email,
    password,
    confirmPassword,
    fullName,
    phoneNumber,
    department,
    year,
    currency,
  } = formData;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateFields = () => {
    const errors = {};
    if (!studentId.trim()) errors.studentId = "Student ID is required";
    if (!fullName.trim()) errors.fullName = "Full name is required";
    if (!email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Invalid email format";
    if (!department.trim()) errors.department = "Department is required";
    if (password.length < 8) errors.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password)) errors.password = "Must contain an uppercase letter";
    else if (!/[a-z]/.test(password)) errors.password = "Must contain a lowercase letter";
    else if (!/[0-9]/.test(password)) errors.password = "Must contain a number";
    else if (!/[^a-zA-Z0-9]/.test(password)) errors.password = "Must contain a special character";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateFields();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
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
        year: year,
        currency: currency,
      });

      if (data?.success && data?.requiresVerification) {
        toast.success("Registration successful! Please verify your email.");
        navigate(
          `/verify-email?email=${encodeURIComponent(data.email || email)}`,
        );
      } else if (data?.success) {
        toast.success("Registration successful! Redirecting...");
        setTimeout(() => {
          window.sessionStorage.setItem("walletwise-show-tour-once", "true");
          navigate("/dashboard");
        }, 1500);
      } else {
        toast.error(data?.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);

      let errorMessage = "Registration failed. Please try again.";

      if (error.response) {
        const { status, data } = error.response;
        console.error(`Server error ${status}:`, data);

        if (status === 400) {
          // Handle validation errors
          if (data.errors && data.errors.length > 0) {
            errorMessage =
              data.errors[0].msg || "Please check your input fields";
          } else {
            errorMessage = data.message || "Please check your input fields";
          }
        } else if (status === 409 || status === 422) {
          errorMessage =
            data.message || "User already exists with this email or student ID";
        } else if (status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (status === 429) {
          errorMessage = data.message || "Too many attempts. Please try again in 15 minutes.";
        }
      } else if (error.request) {
        console.error("No response from server. Is backend running?");
        const apiOrigin = getApiOrigin();
        errorMessage =
          `Cannot connect to server. Please make sure the backend is reachable at ${apiOrigin}`;
      } else {
        console.error("Error:", error.message);
        if (error.message.includes("Network Error")) {
          errorMessage =
            "Network error. Check your connection and CORS settings.";
        }
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
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
            const apiBase = getApiOrigin();
            window.sessionStorage.setItem("walletwise-show-tour-once", "true");
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
                className={fieldErrors.fullName ? 'field-error' : ''}
              />
              {fieldErrors.fullName && <span className="field-error-msg">{fieldErrors.fullName}</span>}
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
              className={fieldErrors.email ? 'field-error' : ''}
            />
            {fieldErrors.email && <span className="field-error-msg">{fieldErrors.email}</span>}
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
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "");
                }}
                placeholder="10-digit phone number"
                pattern="[0-9]*"
                maxLength="10"
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
            <label htmlFor="currency">Currency *</label>

            <select
              id="currency"
              name="currency"
              value={currency}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
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
                I agree to the <Link to="/terms">Terms & Conditions</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>
              </span>
            </label>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?
            <Link to="/login" className="auth-link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
