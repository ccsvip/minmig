import { useState, useCallback, createContext, useContext } from 'react';
import client, { LoginRequest } from '../api/client';

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'));

  const login = useCallback(async (data: LoginRequest) => {
    const res = await client.post('/auth/login', data);
    const { access_token, username } = res.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('username', username);
    setToken(access_token);
    setUsername(username);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
