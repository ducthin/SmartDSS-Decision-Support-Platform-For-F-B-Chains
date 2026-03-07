/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import type { LoginRequest, User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      authService.getMe()
        .then((res) => setUser(res.data.data))
        .catch((err) => {
          if (err?.response?.status === 401) {
            localStorage.removeItem('token');
            setToken(null);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const login = async (data: LoginRequest) => {
    const res = await authService.login(data);
    const { token: newToken } = res.data.data;
    localStorage.setItem('token', newToken);
    setLoading(true);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
