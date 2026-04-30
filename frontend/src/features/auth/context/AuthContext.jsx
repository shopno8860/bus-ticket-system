import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await apiFetch(endpoints.users.me);
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const response = await apiFetch(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const { accessToken, user: userData } = response;
    
    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser(userData);

    if (userData?.role === 'ADMIN') {
      navigate('/admin/dashboard');
      return;
    }

    navigate('/');
  };

  const register = async (data) => {
    await apiFetch(endpoints.auth.register, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    // After registration, we can either auto-login or redirect to login
    // Let's redirect to login for simplicity or login immediately if response has token
    navigate('/auth/login');
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    navigate('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
