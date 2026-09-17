import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/client';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'walletwise-theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const { user: authUser, loading, updateProfile } = useAuth();
  const [theme, setTheme] = useState(getInitialTheme);
  const [isHydrating, setIsHydrating] = useState(true);

  // Apply theme to document (runs immediately on mount and whenever theme changes)
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${theme}`);
    body.setAttribute('data-theme', theme);

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Sync with AuthContext user preference on load
  useEffect(() => {
    if (!loading) {
      if (authUser?.theme && authUser.theme !== theme) {
        setTheme(authUser.theme);
      }
      setIsHydrating(false);
    }
  }, [loading, authUser, theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Apply DOM changes synchronously for zero-latency UI flip
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('dark', newTheme === 'dark');
    root.style.colorScheme = newTheme;
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${newTheme}`);
    body.setAttribute('data-theme', newTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);

    setTheme(newTheme);

    // Sync to backend non-blockingly in background
    if (authUser && updateProfile) {
      api.put('/auth/profile', { theme: newTheme })
        .then(() => updateProfile({ theme: newTheme }))
        .catch((err) => console.error('Failed to sync theme preference to backend:', err));
    }
  }, [theme, authUser, updateProfile]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme]
  );

  // Optional: Prevent brief UI flickers on hard refresh by holding render until the DB confirms our theme state
  if (isHydrating) {
    return null; // The useEffect above already applied the background color to <body>!
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
