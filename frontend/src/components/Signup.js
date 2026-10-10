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

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const validateField = (name, value, allValues = formData) => {
    let error = "";
    switch (name) {
      case "studentId":
        if (!value.trim()) error = "Student ID is required";
        break;
      case "fullName":
        if (!value.trim()) error = "Full name is required";
        break;
      case "email":
        if (!value.trim()) {
          error = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          error = "Please enter a valid email address";
        }
        break;
      case "password":
        if (!value) {
          error = "Password is required";
        } else if (value.length < 8) {
          error = "Password must be at least 8 characters";
        } else if (!/[A-Z]/.test(value)) {
          error = "Must contain at least one uppercase letter";
        } else if (!/[a-z]/.test(value)) {
          error = "Must contain at least one lowercase letter";
        } else if (!/[0-9]/.test(value)) {
          error = "Must contain at least one number";
        } else if (!/[^a-zA-Z0-9]/.test(value)) {
          error = "Must contain at least one special character";
        }
        break;
      case "confirmPassword":
        if (!value) {
          error = "Please confirm your password";
        } else if (value !== allValues.password) {
          error = "Passwords do not match";
        }
        break;
      case "phoneNumber":
        if (value && value.length !== 10) {
          error = "Phone number must be 10 digits";
        }
        break;
      case "department":
        if (!value.trim()) error = "Department is required";
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "phoneNumber") {
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }
    const updatedData = { ...formData, [name]: nextValue };
    setFormData(updatedData);

    setErrors((prev) => {
      const nextErrors = { ...prev };
      if (touched[name]) {
        nextErrors[name] = validateField(name, nextValue, updatedData);
      }
      if (name === "password" && (touched.confirmPassword || updatedData.confirmPassword)) {
        nextErrors.confirmPassword = validateField(
          "confirmPassword",
          updatedData.confirmPassword,
          updatedData
        );
      }
      if (name === "confirmPassword" && (touched.password || updatedData.password)) {
        nextErrors.confirmPassword = validateField(
          "confirmPassword",
          nextValue,
          updatedData
        );
      }
      return nextErrors;
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => {
      const nextErrors = {
        ...prev,
        [name]: validateField(name, value, formData),
      };
      if (name === "password" && (touched.confirmPassword || formData.confirmPassword)) {
        nextErrors.confirmPassword = validateField(
          "confirmPassword",
          formData.confirmPassword,
          formData
        );
      }
      return nextErrors;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    setErrors(newErrors);
    setTouched({
      studentId: true,
      email: true,
      password: true,
      confirmPassword: true,
      fullName: true,
      phoneNumber: true,
      department: true,
      year: true,
    });

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the errors in the form before submitting.");
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

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
                onBlur={handleBlur}
                placeholder="Your student ID"
                className={touched.studentId && errors.studentId ? "input-error" : ""}
                aria-invalid={touched.studentId && !!errors.studentId}
                aria-describedby={touched.studentId && errors.studentId ? "studentId-error" : undefined}
                disabled={loading}
              />
              {touched.studentId && errors.studentId && (
                <span id="studentId-error" className="inline-error-message" role="alert">
                  {errors.studentId}
                </span>
              )}
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
                onBlur={handleBlur}
                placeholder="Your full name"
                className={touched.fullName && errors.fullName ? "input-error" : ""}
                aria-invalid={touched.fullName && !!errors.fullName}
                aria-describedby={touched.fullName && errors.fullName ? "fullName-error" : undefined}
                disabled={loading}
              />
              {touched.fullName && errors.fullName && (
                <span id="fullName-error" className="inline-error-message" role="alert">
                  {errors.fullName}
                </span>
              )}
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
              onBlur={handleBlur}
              placeholder="Your email address"
              className={touched.email && errors.email ? "input-error" : ""}
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={touched.email && errors.email ? "email-error" : undefined}
              disabled={loading}
            />
            {touched.email && errors.email && (
              <span id="email-error" className="inline-error-message" role="alert">
                {errors.email}
              </span>
            )}
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
                  onBlur={handleBlur}
                  placeholder="Min 8 characters"
                  className={touched.password && errors.password ? "input-error" : ""}
                  aria-invalid={touched.password && !!errors.password}
                  aria-describedby={touched.password && errors.password ? "password-error" : undefined}
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
              {touched.password && errors.password && (
                <span id="password-error" className="inline-error-message" role="alert">
                  {errors.password}
                </span>
              )}
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
                  onBlur={handleBlur}
                  placeholder="Confirm password"
                  className={touched.confirmPassword && errors.confirmPassword ? "input-error" : ""}
                  aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
                  aria-describedby={touched.confirmPassword && errors.confirmPassword ? "confirmPassword-error" : undefined}
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
              {touched.confirmPassword && errors.confirmPassword && (
                <span id="confirmPassword-error" className="inline-error-message" role="alert">
                  {errors.confirmPassword}
                </span>
              )}
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
                onBlur={handleBlur}
                placeholder="10-digit phone number"
                pattern="[0-9]*"
                maxLength="10"
                className={touched.phoneNumber && errors.phoneNumber ? "input-error" : ""}
                aria-invalid={touched.phoneNumber && !!errors.phoneNumber}
                aria-describedby={touched.phoneNumber && errors.phoneNumber ? "phoneNumber-error" : undefined}
                disabled={loading}
              />
              {touched.phoneNumber && errors.phoneNumber && (
                <span id="phoneNumber-error" className="inline-error-message" role="alert">
                  {errors.phoneNumber}
                </span>
              )}
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
              onBlur={handleBlur}
              placeholder="e.g., Computer Science"
              className={touched.department && errors.department ? "input-error" : ""}
              aria-invalid={touched.department && !!errors.department}
              aria-describedby={touched.department && errors.department ? "department-error" : undefined}
              disabled={loading}
            />
            {touched.department && errors.department && (
              <span id="department-error" className="inline-error-message" role="alert">
                {errors.department}
              </span>
            )}
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