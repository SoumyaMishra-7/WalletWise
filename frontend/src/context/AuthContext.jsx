import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      await api.post('/api/auth/refresh');
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
      const refreshed = await refreshSession();
      if (refreshed) {
        try {
          const { data } = await api.get('/api/auth/me');
          if (data?.success) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

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
    await api.post('/api/auth/logout');
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
