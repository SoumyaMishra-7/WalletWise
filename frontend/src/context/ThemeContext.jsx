import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
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
  }, [loading, authUser]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    // Optimistic UI update
    setTheme(newTheme);

    // Sync to DB in background if user is logged in
    if (authUser && updateProfile) {
      try {
        await api.put('/auth/profile', { theme: newTheme });
        await updateProfile({ theme: newTheme });
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
