import { warn } from '@/lib/logger';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('token'); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    try { localStorage.removeItem('token'); } catch (e) { warn('logout: storage error', e); }
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      warn('Auth: token invalid or expired, logging out');
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = useCallback(async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    try { localStorage.setItem('token', access_token); } catch (e) { warn('login: storage error', e); }
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return userData;
  }, []);

  const register = useCallback(async (email, password, full_name, phone) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, full_name, phone });
    const { access_token, user: userData } = response.data;
    try { localStorage.setItem('token', access_token); } catch (e) { warn('register: storage error', e); }
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return userData;
  }, []);

  const isAdmin = user?.role === 'admin';

  // Stabilize the context value so consumers don't re-render unnecessarily
  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, isAdmin }),
    [user, token, loading, login, register, logout, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
