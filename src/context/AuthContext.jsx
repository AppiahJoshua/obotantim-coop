import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('obotantim_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('obotantim_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem('obotantim_token');
        localStorage.removeItem('obotantim_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('obotantim_token', data.token);
    localStorage.setItem('obotantim_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('obotantim_token');
    localStorage.removeItem('obotantim_user');
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  const hasMinRole = useCallback((minRole) => {
    const hierarchy = { content_editor: 1, manager: 2, super_admin: 3 };
    
    if (!user) return false;

    // Fallback logic: If it's a new custom role, treat it as a level 1 (base staff) 
    const userRoleValue = hierarchy[user.role] !== undefined ? hierarchy[user.role] : 1;
    const minRoleValue = hierarchy[minRole] || 0;

    return userRoleValue >= minRoleValue;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, hasMinRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};