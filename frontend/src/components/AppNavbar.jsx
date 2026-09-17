import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FaWallet,
  FaChevronDown,
  FaSignOutAlt,
  FaCog,
  FaUserCircle,
  FaHome,
  FaExchangeAlt,
  FaChartPie,
  FaBullseye,
  FaChartBar,
  FaSun,
  FaMoon,
  FaCalendarCheck,
  FaTrophy
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { calculateLevel } from '../utils/gamificationConstants';
import './AppNavbar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: FaHome, path: '/dashboard' },
  { id: 'transactions', label: 'Transactions', icon: FaExchangeAlt, path: '/transactions' },
  { id: 'budget', label: 'Budget', icon: FaChartPie, path: '/budget' },
  { id: 'goals', label: 'Goals', icon: FaBullseye, path: '/goals' },
  { id: 'reports', label: 'Reports', icon: FaChartBar, path: '/reports' },
  { id: 'profile-top', label: 'Profile', icon: FaUserCircle, path: '/profile' }
];

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const mobileMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const levelInfo = calculateLevel(user?.totalXP || 0);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }
    navigate('/login');
  };

  const displayName = user?.fullName || user?.name || 'User';
  const displayEmail = user?.email || '';
  const userInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <header className="dashboard-header app-navbar">
      <div className="nav-left">
        <Link to="/dashboard" className="logo-container">
          <FaWallet className="logo-icon" />
          <h1 className="logo-text">WalletWise</h1>
        </Link>
      </div>

      <nav className="nav-center" ref={mobileMenuRef}>
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          type="button"
        >
          <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}></span>
        </button>

        <ul className={`nav-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  aria-label={item.label}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}

        </ul>
      </nav>

      <div className="nav-right" ref={userMenuRef}>
        <Link
          to="/gamification"
          className="nav-level-badge"
          title={`Level ${levelInfo.level}: ${levelInfo.title}`}
        >
          <FaTrophy className="level-trophy-icon" />
          <span className="level-text">Lvl {levelInfo.level}</span>
        </Link>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          type="button"
        >
          {isDark ? <FaSun /> : <FaMoon />}
        </button>
        <button
          className="user-profile-trigger"
          onClick={() => setShowUserMenu((prev) => !prev)}
          aria-expanded={showUserMenu}
          aria-label="User menu"
          aria-haspopup="true"
          type="button"
        >
          <div className="user-avatar" aria-hidden="true">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="avatar-img" />
            ) : (
              userInitial
            )}
          </div>
          <FaChevronDown className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`} />
        </button>

        {showUserMenu && (
          <div className="user-dropdown-menu" role="menu">
            <div className="user-dropdown-header">
              <div className="dropdown-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="avatar-img" />
                ) : (
                  userInitial
                )}
              </div>
              <div className="dropdown-user-info">
                <span className="dropdown-user-name">{displayName}</span>
                {displayEmail && <span className="dropdown-user-email">{displayEmail}</span>}
              </div>
            </div>

            <div className="dropdown-divider"></div>

            <Link
              to="/gamification"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="View rewards"
            >
              <FaTrophy />
              <span>Rewards</span>
            </Link>

            <div className="dropdown-divider"></div>

            <Link
              to="/dashboard"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open dashboard"
            >
              <FaHome />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/transactions"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open transactions"
            >
              <FaExchangeAlt />
              <span>Transactions</span>
            </Link>

            <Link
              to="/budget"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open budget"
            >
              <FaChartPie />
              <span>Budget</span>
            </Link>

            <Link
              to="/goals"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open goals"
            >
              <FaBullseye />
              <span>Goals</span>
            </Link>

            <Link
              to="/reports"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open reports"
            >
              <FaChartBar />
              <span>Reports</span>
            </Link>

            <Link
              to="/profile"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open profile"
            >
              <FaUserCircle />
              <span>Profile</span>
            </Link>

            <Link
              to="/wallets"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open wallets"
            >
              <FaWallet />
              <span>Wallets</span>
            </Link>

            <Link
              to="/subscriptions"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open subscriptions"
            >
              <FaCalendarCheck />
              <span>Subscriptions</span>
            </Link>

            <Link
              to="/settings"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
              title="Open settings"
            >
              <FaCog />
              <span>Settings</span>
            </Link>

            <div className="dropdown-divider"></div>

            <button
              onClick={handleLogout}
              className="dropdown-item logout"
              role="menuitem"
              type="button"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppNavbar;
