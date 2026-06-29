// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { loginRequest, AuthUser, LoginRequestError, registerRequest } from "../api/auth";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
};

type StoredAuthSession = {
  token: string;
  user: AuthUser | null;
};

const AUTH_SESSION_STORAGE_KEY = "leafy.auth_session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeStoredUser = (value: unknown): AuthUser | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const user = value as Partial<AuthUser> & { id?: unknown };
  if (
    (typeof user.id !== "string" && typeof user.id !== "number") ||
    typeof user.email !== "string"
  ) {
    return null;
  }

  return {
    id: String(user.id),
    email: user.email,
  };
};

const normalizeStoredSession = (value: unknown): StoredAuthSession | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as Partial<StoredAuthSession>;
  if (typeof session.token !== "string" || session.token.length === 0) {
    return null;
  }

  return {
    token: session.token,
    user: normalizeStoredUser(session.user),
  };
};

const readStoredSession = async (): Promise<StoredAuthSession | null> => {
  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return null;
  }

  const storedValue = await SecureStore.getItemAsync(AUTH_SESSION_STORAGE_KEY);
  if (!storedValue) {
    return null;
  }

  const parsedValue = JSON.parse(storedValue);
  const storedSession = normalizeStoredSession(parsedValue);
  if (!storedSession) {
    await SecureStore.deleteItemAsync(AUTH_SESSION_STORAGE_KEY);
    return null;
  }

  return storedSession;
};

const writeStoredSession = async (session: StoredAuthSession): Promise<void> => {
  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return;
  }

  await SecureStore.setItemAsync(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
};

const deleteStoredSession = async (): Promise<void> => {
  const isAvailable = await SecureStore.isAvailableAsync();
  if (!isAvailable) {
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_SESSION_STORAGE_KEY);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const storedSession = await readStoredSession();

        if (!isMounted || !storedSession) {
          return;
        }

        setToken(storedSession.token);
        setUser(storedSession.user);
      } catch (error) {
        console.log("AuthContext failed to hydrate session:", error);
        await deleteStoredSession().catch((deleteError) => {
          console.log("AuthContext failed to clear invalid session:", deleteError);
        });
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    };

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log("AuthContext login called");

      const res = await loginRequest(email, password);
      console.log("AuthContext login succeeded");

      await writeStoredSession({
        token: res.token,
        user: normalizeStoredUser(res.user),
      }).catch((error) => {
        console.log("AuthContext login failed to persist session:", error);
      });
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
    void deleteStoredSession().catch((error) => {
      console.log("AuthContext logout failed to clear session:", error);
    });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      console.log("AuthContext register called");

      await registerRequest(name, email, password);
      console.log("AuthContext register succeeded");
    } catch (error) {
      console.log("AuthContext register failed:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isHydrating, login, logout, register }}>
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
