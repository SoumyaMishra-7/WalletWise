import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

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
  const { user: authUser } = useAuth();
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme to document
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

  // Sync with AuthContext user preference on login
  useEffect(() => {
    if (authUser?.theme && authUser.theme !== theme) {
      setTheme(authUser.theme);
    }
  }, [authUser?.id]); // Only sync when the user changes (login)

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    // Sync to DB in background if user is logged in
    if (authUser) {
      try {
        await api.put('/api/auth/profile', { theme: newTheme });
      } catch (err) {
        console.error('Failed to sync theme preference to backend:', err);
      }
    }
  };

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, authUser]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
