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
        if (value && value.length < 10) {
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
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);

    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value, updatedData),
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
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
        if (status === 400) {
          errorMessage = data.errors?.[0]?.msg || data.message || "Please check your input fields";
        } else if (status === 409 || status === 422) {
          errorMessage = data.message || "User already exists with this email or student ID";
        } else if (status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (status === 429) {
          errorMessage = data.message || "Too many attempts. Please try again in 15 minutes.";
        }
      } else if (error.request) {
        errorMessage = `Cannot connect to server.`;
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
                disabled={loading}
              />
              {touched.studentId && errors.studentId && (
                <span className="inline-error-message">{errors.studentId}</span>
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
                disabled={loading}
              />
              {touched.fullName && errors.fullName && (
                <span className="inline-error-message">{errors.fullName}</span>
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
              disabled={loading}
            />
            {touched.email && errors.email && (
              <span className="inline-error-message">{errors.email}</span>
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
                <span className="inline-error-message">{errors.password}</span>
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
                <span className="inline-error-message">{errors.confirmPassword}</span>
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
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "");
                }}
                placeholder="10-digit phone number"
                pattern="[0-9]*"
                maxLength="10"
                className={touched.phoneNumber && errors.phoneNumber ? "input-error" : ""}
                disabled={loading}
              />
              {touched.phoneNumber && errors.phoneNumber && (
                <span className="inline-error-message">{errors.phoneNumber}</span>
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
              disabled={loading}
            />
            {touched.department && errors.department && (
              <span className="inline-error-message">{errors.department}</span>
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