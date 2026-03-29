import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
const AUTH_TOKEN_KEY = 'walletwise_access_token';

const saveAccessToken = (token) => {
  if (!token) return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

const clearAccessToken = () => {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

const hydrateTokenFromUrl = () => {
  try {
    const currentUrl = new URL(window.location.href);
    const token = currentUrl.searchParams.get('access_token');
    if (!token) return;
    saveAccessToken(token);
    currentUrl.searchParams.delete('access_token');
    window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  } catch (_error) { }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrateTokenFromUrl();
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      await api.post('/auth/refresh', {});
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      if (data?.success) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for forced logout events triggered by the API interceptor
  // (when token refresh fails after a 401). This avoids circular imports
  // between AuthContext and client.js.
  useEffect(() => {
    const handleForceLogout = async () => {
      await api.post('/auth/logout', {}).catch(() => { });
      clearAccessToken();
      setUser(null);

      const publicPaths = ['/login', '/signup', '/forgot-password', '/forgot-password/verify', '/forgot-password/reset', '/verify-email', '/'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    if (data?.success) {
      if (data?.token) {
        saveAccessToken(data.token);
      }
      setUser(data.user);
    }
    return data;
  };

  const signup = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    if (data?.success && !data?.requiresVerification) {
      if (data?.token) {
        saveAccessToken(data.token);
      }
      setUser(data.user);
    }
    return data;
  };

  const updateProfile = async (payload) => {
    const { data } = await api.put('/auth/profile', payload);
    if (data?.success) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    await api.post('/auth/logout', {});
    clearAccessToken();
    setUser(null);
  };

  const deleteAccount = async () => {
    const { data } = await api.delete('/auth/account');
    if (data?.success) {
      clearAccessToken();
      setUser(null);
    }
    return data;
  };

  const updateUserLocally = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        updateProfile,
        logout,
        deleteAccount,
        refreshSession,
        reloadUser: loadUser,
        updateUserLocally
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
