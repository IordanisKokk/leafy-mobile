// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { loginRequest, AuthUser, LoginRequestError, registerRequest } from "../api/auth";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log("AuthContext login called with:", { email, password });

      const res = await loginRequest(email, password);
      console.log("AuthContext login got response:", res);

      setToken(res.token);
      setUser(res.user);
    } catch (error) {
      console.log("AuthContext login failed:", error);
      throw error as LoginRequestError;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      console.log("AuthContext register called with:", { name, email, password });

      const res = await registerRequest(name, email, password);
      console.log("AuthContext register got response:", res);
    } catch (error) {
      console.log("AuthContext register failed:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
