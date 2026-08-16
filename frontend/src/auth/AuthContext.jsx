import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMe } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'hraahi_token';
const USER_KEY = 'hraahi_user';

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getMe(token)
      .then((res) => {
        if (!cancelled) {
          setUser(res.data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  function saveAuth(tokenValue, userValue) {
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(USER_KEY, JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  async function login(phone, password) {
    const res = await loginUser(phone, password);
    saveAuth(res.data.token, res.data.user);
    return res.data.user;
  }

  async function register(fields) {
    const res = await registerUser(fields);
    return res.data.user;
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { AuthProvider, useAuth };
