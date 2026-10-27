import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await api.post('/login', { email, password });
    setUser(d.user);
    return d.user;
  };
  const logout = async () => {
    await api.post('/logout').catch(() => {});
    setUser(null);
  };

  if (loading) return <p className="muted center">Loading…</p>;
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}