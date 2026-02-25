import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { VaultProvider } from './context/VaultContext';

// Import your existing components
import Homepage from './components/Homepage';
import Dashboard from './components/Dashboard';
import AddExpense from './pages/AddExpense';
import SetBudget from './pages/SetBudget';
import SavingGoal from './pages/SavingGoal';
import BehaviourDashboard from './pages/BehaviourDashboard'; // NEW: Import Behaviour Dashboard
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import SubscriptionDashboard from './pages/SubscriptionDashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import DecisionHelper from './pages/DecisionHelper';
import MoodInsight from './pages/MoodInsight';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';

// Import authentication components
import Login from './components/Login';
import Signup from './components/Signup';
import VerifyEmail from './components/VerifyEmail';
import ForgotPassword from './components/ForgotPassword';
import VerifyResetOtp from './components/VerifyResetOtp';
import ResetPassword from './components/ResetPassword';

import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';



function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <VaultProvider>
          <Router>
            <div className="app">
              {/* Toast Notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <ScrollToTop />

              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Homepage />} />

                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <Signup />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <ForgotPassword />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/forgot-password/verify"
                  element={
                    <PublicRoute>
                      <VerifyResetOtp />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/forgot-password/reset"
                  element={
                    <PublicRoute>
                      <ResetPassword />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/verify-email"
                  element={
                    <PublicRoute>
                      <VerifyEmail />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicRoute>
                      <ForgotPassword />
                    </PublicRoute>
                  }
                />


                {/* Protected Routes - Only accessible when logged in */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* NEW: Behaviour Analysis Route */}
                <Route
                  path="/behaviour-analysis"
                  element={
                    <ProtectedRoute>
                      <BehaviourDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/add-expense"
                  element={
                    <ProtectedRoute>
                      <AddExpense />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/set-budget"
                  element={
                    <ProtectedRoute>
                      <SetBudget />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/saving-goal"
                  element={
                    <ProtectedRoute>
                      <SavingGoal />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute>
                      <Transactions />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/budget"
                  element={
                    <ProtectedRoute>
                      <Budget />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/goals"
                  element={
                    <ProtectedRoute>
                      <Goals />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/subscriptions"
                  element={
                    <ProtectedRoute>
                      <SubscriptionDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/decision-helper"
                  element={
                    <ProtectedRoute>
                      <DecisionHelper />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/mood-insight"
                  element={
                    <ProtectedRoute>
                      <MoodInsight />
                    </ProtectedRoute>
                  }
                />

                {/* Redirect unknown routes to homepage */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </VaultProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
