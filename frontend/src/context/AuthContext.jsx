import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      await api.post('/api/auth/refresh', {});
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/auth/me');
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
      await api.post('/api/auth/logout', {}).catch(() => { });
      setUser(null);
      window.location.href = '/login';
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = async (payload) => {
    const { data } = await api.post('/api/auth/login', payload);
    if (data?.success) {
      setUser(data.user);
    }
    return data;
  };

  const signup = async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    if (data?.success && !data?.requiresVerification) {
      setUser(data.user);
    }
    return data;
  };

  const updateProfile = async (payload) => {
    const { data } = await api.put('/api/auth/profile', payload);
    if (data?.success) {
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    await api.post('/api/auth/logout', {});
    setUser(null);
  };

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
        refreshSession,
        reloadUser: loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
