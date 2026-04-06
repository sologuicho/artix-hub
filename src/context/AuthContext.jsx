import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Always verify session with backend — never trust localStorage alone
  const checkAuth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          return true;
        }
      }
      // Backend says not authenticated — clear everything
      setUser(null);
      localStorage.removeItem('user');
      return false;
    } catch (error) {
      console.error('Error checking auth:', error);
      // Network error: keep the localStorage snapshot so UX doesn't break on flaky network,
      // but do NOT set user from it — remain in loading:false state with whatever was already set
      setUser(null);
      localStorage.removeItem('user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always verify with backend on mount — do not pre-populate from localStorage.
    // This prevents showing stale/invalid user state before the server response.
    checkAuth();
  }, []);

  const login = async (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    // Re-verify with backend to get fresh data
    await checkAuth();
  };

  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateUser = async (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    await checkAuth();
  };

  const isAuthenticated = () => user !== null;

  const needsProfileSetup = () => user && !user.profileComplete;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        isAuthenticated,
        needsProfileSetup,
        loading,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
