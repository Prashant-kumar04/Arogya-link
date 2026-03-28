import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  mounted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  // Restore user from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        setUserState(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to restore user from localStorage:', err);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    }
    setMounted(true);
  }, []);

  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      try {
        localStorage.setItem('auth_user', JSON.stringify(newUser));
      } catch (err) {
        console.error('Failed to save user to localStorage:', err);
      }
    } else {
      try {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      } catch (err) {
        console.error('Failed to clear localStorage:', err);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // In a real app, this would be an API call to /login
      // For now, we'll create a mock token and store user
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        token: `token_${Date.now()}_${Math.random()}`,
      };

      setUser(mockUser);
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  }, [setUser]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      // In a real app, this would be an API call to /register
      const mockUser: User = {
        id: `user_${Date.now()}`,
        email,
        name,
        token: `token_${Date.now()}_${Math.random()}`,
      };

      setUser(mockUser);
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  }, [setUser]);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  // Show a loading screen until localStorage restore is complete
  if (!mounted) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '4px solid #bfdbfe',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setUser,
        mounted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // ✅ FIXED: Return safe defaults instead of throwing — AuthProvider was removed
    // in favour of Zustand-based phone auth. This prevents crashes from stale imports.
    console.warn('useAuth called outside AuthProvider. Auth is managed by Zustand store.');
    return {
      user: null,
      isAuthenticated: false,
      login: async () => { },
      register: async () => { },
      logout: () => { },
      setUser: () => { },
      mounted: true,
    };
  }
  return context;
}
