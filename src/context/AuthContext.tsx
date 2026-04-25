import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEV_BYPASS = import.meta.env.VITE_BYPASS_AUTH === 'true'

const MOCK_USER: User = {
  id: 'dev',
  email: 'dev@tenetai.local',
  name: 'Dev User',
  picture: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_BYPASS ? MOCK_USER : null);
  const [token, setToken] = useState<string | null>(DEV_BYPASS ? 'dev-token' : null);
  const [isLoading, setIsLoading] = useState(!DEV_BYPASS);

  useEffect(() => {
    if (DEV_BYPASS) return;
    // Check for existing token
    const savedToken = localStorage.getItem('tenet_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(response.data);
    } catch (error) {
      // Token invalid, clear it
      localStorage.removeItem('tenet_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credential: string) => {
    try {
      const response = await axios.post(`${API_BASE}/auth/google/token`, {
        credential,
      });
      const { access_token, user: userData } = response.data;

      localStorage.setItem('tenet_token', access_token);
      setToken(access_token);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('tenet_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
