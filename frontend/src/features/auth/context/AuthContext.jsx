import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
          if (error?.status !== 401) {
            console.error('Failed to fetch user:', error);
          }
          logout({ preservePath: true });
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const role = useMemo(() => user?.role ?? null, [user]);
  const isAdmin = role === 'ADMIN';
  const isOperator = role === 'OPERATOR';
  const isStaff = role === 'STAFF';
  const isUser = role === 'USER';

  const login = async (email, password) => {
    const response = await apiFetch(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const { accessToken, user: userData } = response;

    localStorage.setItem('accessToken', accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    await apiFetch(endpoints.auth.register, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    navigate('/auth/login');
  };

  const logout = ({ preservePath = false } = {}) => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    if (preservePath) {
      navigate('/auth/login', {
        state: {
          from: {
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
          },
        },
        replace: true,
      });
      return;
    }
    navigate('/auth/login', { replace: true });
  };

  const clearAuthState = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (nextUser) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, loading, updateUserProfile, clearAuthState, role, isAdmin, isOperator, isStaff, isUser }}>
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
