import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FaWallet,
  FaChevronDown,
  FaSignOutAlt,
  FaCog,
  FaHome,
  FaExchangeAlt,
  FaChartPie,
  FaBullseye,
  FaChartBar,
  FaUser,
  FaSun,
  FaMoon,
  FaCalendarCheck
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './AppNavbar.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: FaHome, path: '/dashboard' },
  { id: 'transactions', label: 'Transactions', icon: FaExchangeAlt, path: '/transactions' },
  { id: 'budget', label: 'Budget', icon: FaChartPie, path: '/budget' },
  { id: 'goals', label: 'Goals', icon: FaBullseye, path: '/goals' },
  { id: 'reports', label: 'Reports', icon: FaChartBar, path: '/reports' }
];

const profileNavItems = [
  { id: 'goals-profile', label: 'Goals', icon: FaBullseye, path: '/goals' },
  { id: 'wallets', label: 'Wallets', icon: FaWallet, path: '/wallets' },
  { id: 'subscriptions', label: 'Subscriptions', icon: FaCalendarCheck, path: '/subscriptions' },
  { id: 'settings', label: 'Settings', icon: FaCog, path: '/settings' }
];

const AppNavbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileNavMenu, setShowProfileNavMenu] = useState(false);
  const mobileMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const profileNavMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (profileNavMenuRef.current && !profileNavMenuRef.current.contains(event.target)) {
        setShowProfileNavMenu(false);
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

          <li className="nav-profile-item" ref={profileNavMenuRef}>
            <button
              type="button"
              className={`nav-link nav-dropdown-trigger ${showProfileNavMenu ? 'active' : ''}`}
              onClick={() => setShowProfileNavMenu((prev) => !prev)}
              aria-expanded={showProfileNavMenu}
              aria-haspopup="true"
            >
              <FaUser className="nav-icon" />
              <span>Profile</span>
              <FaChevronDown className={`nav-dropdown-arrow ${showProfileNavMenu ? 'open' : ''}`} />
            </button>

            {showProfileNavMenu && (
              <div className="nav-dropdown-menu" role="menu">
                {profileNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) => `nav-dropdown-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setShowProfileNavMenu(false);
                        setIsMobileMenuOpen(false);
                      }}
                      role="menuitem"
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </li>

          <li className="mobile-only-nav-item">
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FaUser className="nav-icon" />
              <span>Profile</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="nav-right" ref={userMenuRef}>
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
              to="/profile"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
            >
              <FaUser />
              <span>Profile</span>
            </Link>

            <div className="dropdown-divider"></div>

            <Link
              to="/settings"
              className="dropdown-item"
              role="menuitem"
              onClick={() => setShowUserMenu(false)}
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
