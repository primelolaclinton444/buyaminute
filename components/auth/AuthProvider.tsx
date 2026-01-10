"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, AuthSession, LoginPayload, SignupPayload, authApi } from "@/lib/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  session: AuthSession | null;
  status: AuthStatus;
  error: string | null;
  expired: boolean;
  refreshSession: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  signup: (payload: SignupPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const nextSession = await authApi.getSession();
      if (nextSession.user) {
        setSession(nextSession);
        setStatus("authenticated");
        setHasAuthenticated(true);
        setExpired(false);
        return;
      }

      setSession(null);
      setStatus("unauthenticated");
      setExpired(hasAuthenticated);
    } catch (err) {
      const apiError = err as ApiError;
      setSession(null);
      setStatus("unauthenticated");
      setExpired(hasAuthenticated || apiError?.status === 401);
      setError(apiError.message ?? "Unable to load session");
    }
  }, [hasAuthenticated]);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    const nextSession = await authApi.login(payload);
    setSession(nextSession);
    setStatus("authenticated");
    setHasAuthenticated(true);
    setExpired(false);
    return nextSession;
  }, []);

  const signup = useCallback(async (payload: SignupPayload) => {
    setError(null);
    const nextSession = await authApi.signup(payload);
    setSession(nextSession);
    setStatus("authenticated");
    setHasAuthenticated(true);
    setExpired(false);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authApi.logout();
    } finally {
      setSession(null);
      setStatus("unauthenticated");
      setExpired(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      session,
      status,
      error,
      expired,
      refreshSession,
      login,
      signup,
      logout,
    }),
    [session, status, error, expired, refreshSession, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
