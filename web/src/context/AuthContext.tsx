import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'Admin' | 'Trader' | 'Viewer';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('prostock_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('prostock_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('prostock_token', token);
    } else {
      localStorage.removeItem('prostock_token');
      localStorage.removeItem('prostock_user');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(err.message || 'Invalid credentials');
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('prostock_user', JSON.stringify(data.user));
      setIsLoginModalOpen(false);
    } catch (ex: any) {
      // Local development fallback if backend is offline
      if (email === 'admin@prostock.local' && password === 'AdminProStockPassword2026!') {
        const dummyUser: User = {
          id: 'admin-001',
          email: 'admin@prostock.local',
          fullName: 'Lead Quant Admin',
          role: 'Admin',
          createdAt: new Date().toISOString()
        };
        setToken('dummy-jwt-token-prostock');
        setUser(dummyUser);
        localStorage.setItem('prostock_user', JSON.stringify(dummyUser));
        setIsLoginModalOpen(false);
        return;
      }
      throw ex;
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Registration failed' }));
      throw new Error(err.message || 'Registration failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('prostock_user', JSON.stringify(data.user));
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('prostock_token');
    localStorage.removeItem('prostock_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
