import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nexvora_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    localStorage.setItem('nexvora_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (name, email, password, avatar) => {
    const res = await api.register(name, email, password, avatar);
    localStorage.setItem('nexvora_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const googleLogin = async (name, email, avatar, credential) => {
    const res = await api.googleLogin(name, email, avatar, credential);
    localStorage.setItem('nexvora_token', res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('nexvora_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
    if (res.token) {
      localStorage.setItem('nexvora_token', res.token);
      setToken(res.token);
    }
    return res.user;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      googleLogin,
      logout,
      updateProfile,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
