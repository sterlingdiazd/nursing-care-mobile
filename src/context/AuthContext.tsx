import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { logClientEvent } from "@/src/logging/clientLogger";
import { login as loginRequest } from "@/src/services/authService";
import { AuthResponse } from "@/src/types/auth";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  roles: string[];
  isAuthenticated: boolean;
  setSession: (response: AuthResponse) => void;
  setTokenManually: (token: string) => void;
  login: (email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);

  const setSession = (response: AuthResponse) => {
    setToken(response.token);
    setEmail(response.email);
    setRoles(response.roles ?? []);
    logClientEvent("mobile.auth", "Session loaded", {
      correlationId: response.correlationId,
      email: response.email,
      roles: response.roles,
    });
  };

  const setTokenManually = (nextToken: string) => {
    const trimmed = nextToken.trim();
    setToken(trimmed.length > 0 ? trimmed : null);
    logClientEvent("mobile.auth", "Manual token updated", {
      hasToken: trimmed.length > 0,
    });
  };

  const login = async (emailAddress: string, password: string) => {
    logClientEvent("mobile.auth", "Login requested", {
      email: emailAddress.trim(),
    });
    const response = await loginRequest({
      email: emailAddress.trim(),
      password,
    });

    setSession(response);
    return response;
  };

  const logout = () => {
    setToken(null);
    setEmail(null);
    setRoles([]);
    logClientEvent("mobile.auth", "Session cleared");
  };

  const value = useMemo(
    () => ({
      token,
      email,
      roles,
      isAuthenticated: Boolean(token),
      setSession,
      setTokenManually,
      login,
      logout,
    }),
    [token, email, roles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
