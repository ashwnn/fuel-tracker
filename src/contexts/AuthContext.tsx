'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStoredSession = async () => {
    const raw = localStorage.getItem('auth-token');
    if (!raw) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { token?: string; expiresAt?: number };
      const storedToken = parsed.token;
      const expiresAt = parsed.expiresAt ?? 0;

      // If the token is missing or expired, clear it and bail
      if (!storedToken || Date.now() > expiresAt) {
        localStorage.removeItem('auth-token');
        setLoading(false);
        return;
      }

      const { user } = await api.auth.me(storedToken);
      setUser(user);
      setToken(storedToken);
    } catch (error) {
      // Legacy plain-token format or corrupted data; clear to enforce fresh login
      localStorage.removeItem('auth-token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoredSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      setUser(response.user);
      setToken(response.token);
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
      localStorage.setItem('auth-token', JSON.stringify({ token: response.token, expiresAt }));
    } catch (err) {
      throw err;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      await api.auth.register(email, password);
      // After registration, log in automatically
      await login(email, password);
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      // Ignore logout errors
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth-token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
