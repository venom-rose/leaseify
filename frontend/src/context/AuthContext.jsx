import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

const DEFAULT_ADMIN = {
  id: 'user-1',
  name: 'Sarah Jenkins',
  email: 'admin@leaseify.com',
  role: 'admin',
  title: 'Property Manager',
  phone: '+1 (555) 234-5678',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
};

const DEFAULT_TENANT = {
  id: 'user-2',
  name: 'Alex Rivera',
  email: 'tenant@leaseify.com',
  role: 'user',
  title: 'Resident Tenant (Suite 44B)',
  phone: '+1 (555) 876-5432',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('leaseify_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('leaseify_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('leaseify_token'));
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => {
    try {
      const saved = localStorage.getItem('leaseify_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.role === 'admin' ? 'dashboard' : 'tenant-portal';
      }
    } catch {}
    return 'dashboard';
  });

  useEffect(() => {
    // Check backend health
    const checkConnection = async () => {
      const isUp = await api.checkHealth();
      setIsBackendConnected(isUp);
    };
    checkConnection();
    const timer = setInterval(checkConnection, 15000);
    return () => clearInterval(timer);
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      setIsAuthenticated(true);
      localStorage.setItem('leaseify_user', JSON.stringify(res.user));
      localStorage.setItem('leaseify_token', res.token);

      // Automatic role-based redirect
      if (res.user.role === 'admin') {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab('tenant-portal');
      }

      return { success: true };
    }
    return { 
      success: false, 
      message: res.message || 'Login failed',
      isUnverified: res.isUnverified,
      userId: res.userId,
      email: res.email
    };
  };

  const register = async (data) => {
    const res = await api.register(data);
    if (res.success) {
      if (res.demoMode) {
        setUser(res.user);
        setToken(res.token);
        setIsAuthenticated(true);
        localStorage.setItem('leaseify_user', JSON.stringify(res.user));
        localStorage.setItem('leaseify_token', res.token);
        setCurrentTab('tenant-portal');
        return { success: true, demoMode: true };
      }
      return { success: true, needsOtp: true, email: data.email };
    }
    return { success: false, message: res.message || 'Registration failed' };
  };

  const verifyOtp = async (email, otp, signupData) => {
    const res = await api.verifyOtp(email, otp, signupData);
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      setIsAuthenticated(true);
      localStorage.setItem('leaseify_user', JSON.stringify(res.user));
      localStorage.setItem('leaseify_token', res.token);
      setCurrentTab('tenant-portal');
      return { success: true };
    }
    return { success: false, message: res.message || 'OTP Verification failed' };
  };

  const resendOtp = async (email) => {
    const res = await api.resendOtp(email);
    if (res.success) {
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('leaseify_user');
    localStorage.removeItem('leaseify_token');
  };

  // Quick Demo Role Switcher
  const switchRole = (newRole) => {
    const targetUser = newRole === 'admin' ? DEFAULT_ADMIN : DEFAULT_TENANT;
    const demoToken = 'demo-jwt-' + newRole + '-token';
    setUser(targetUser);
    setToken(demoToken);
    setIsAuthenticated(true);
    localStorage.setItem('leaseify_user', JSON.stringify(targetUser));
    localStorage.setItem('leaseify_token', demoToken);

    // Redirect based on selected role
    if (newRole === 'admin') {
      setCurrentTab('dashboard');
    } else {
      setCurrentTab('tenant-portal');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'user',
        token,
        isAuthenticated,
        isBackendConnected,
        currentTab,
        setCurrentTab,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
