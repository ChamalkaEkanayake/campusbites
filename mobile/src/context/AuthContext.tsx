import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { UserResponse, authApi, LoginPayload, RegisterPayload } from '../api/authApi';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (updatedUser: UserResponse) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUserData: async () => {}
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial token and profile from AsyncStorage on app launch
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await storage.getToken();
        const storedUser = await storage.getUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Verify token validity with backend in background
          try {
            const freshUser = await authApi.getProfile();
            setUser(freshUser);
            await storage.setUser(freshUser);
          } catch (e) {
            // Token expired or user removed
            await storage.clearAll();
            setToken(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error('Failed loading stored auth state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (payload: LoginPayload) => {
    const data = await authApi.login(payload);
    if (data.token) {
      await storage.setToken(data.token);
      await storage.setUser(data);
      setToken(data.token);
      setUser(data);
    }
  };

  const register = async (payload: RegisterPayload) => {
    const data = await authApi.register(payload);
    if (data.token) {
      await storage.setToken(data.token);
      await storage.setUser(data);
      setToken(data.token);
      setUser(data);
    }
  };

  const updateUserData = async (updatedUser: UserResponse) => {
    setUser(updatedUser);
    await storage.setUser(updatedUser);
  };

  const logout = async () => {
    await storage.clearAll();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
