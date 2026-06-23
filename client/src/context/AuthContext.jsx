import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
      if (!tokens.accessToken) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await authService.getProfile();
        setUser(data.data.user);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      } catch {
        // Token invalid — clear
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    const { user: userData, accessToken, refreshToken } = data.data;

    localStorage.setItem('tokens', JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await authService.register({ username, email, password });
    const { user: userData, accessToken, refreshToken } = data.data;

    localStorage.setItem('tokens', JSON.stringify({ accessToken, refreshToken }));
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const getToken = useCallback(() => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    return tokens.accessToken || null;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, getToken, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};
