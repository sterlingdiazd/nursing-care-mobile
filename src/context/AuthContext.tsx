import { createContext, ReactNode, useContext, useMemo, useState, useEffect } from "react";

import { logClientEvent } from "@/src/logging/clientLogger";
import { login as loginRequest, registerUser as registerUserRequest } from "@/src/services/authService";
import { AuthResponse } from "@/src/types/auth";
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  subscribeToAuthSession,
} from "@/src/services/authSession";

export enum UserProfileType {
  Client = 0,
  Nurse = 1,
}

interface AuthContextValue {
  token: string | null;
  email: string | null;
  roles: string[];
  profileType: UserProfileType | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setSession: (response: AuthResponse) => void;
  completeOAuthLogin: (response: AuthResponse) => Promise<void>;
  setTokenManually: (token: string) => void;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (
    email: string,
    password: string,
    confirmPassword: string,
    profileType: UserProfileType
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [profileType, setProfileType] = useState<UserProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncAuthState = async () => {
    const session = await loadAuthSession();

    if (!session) {
      setToken(null);
      setEmail(null);
      setRoles([]);
      setProfileType(null);
      return;
    }

    setToken(session.token);
    setEmail(session.email || null);
    setRoles(session.roles);
    setProfileType(session.profileType);
  };

  // Load auth state from AsyncStorage on mount
  useEffect(() => {
    syncAuthState().catch((err) => {
      console.error("Failed to load auth state:", err);
    });

    const unsubscribe = subscribeToAuthSession(() => {
      syncAuthState().catch((err) => {
        console.error("Failed to sync auth state:", err);
      });
    });

    return unsubscribe;
  }, []);

  const setSession = (response: AuthResponse) => {
    setToken(response.token);
    setEmail(response.email);
    setRoles(response.roles ?? []);
    logClientEvent("mobile.auth", "Session loaded", {
      email: response.email,
      roles: response.roles,
    });
  };

  const resolveProfileType = (response: AuthResponse, fallbackProfileType?: UserProfileType | null) =>
    response.roles?.includes("Nurse") ? UserProfileType.Nurse : (fallbackProfileType ?? UserProfileType.Client);

  const persistSession = async (response: AuthResponse, fallbackProfileType?: UserProfileType | null) => {
    const detectedProfileType = resolveProfileType(response, fallbackProfileType);

    setSession(response);
    setProfileType(detectedProfileType);

    await saveAuthSession({
      token: response.token,
      refreshToken: response.refreshToken,
      expiresAtUtc: response.expiresAtUtc,
      email: response.email,
      roles: response.roles ?? [],
      profileType: detectedProfileType,
    });
  };

  const setTokenManually = (nextToken: string) => {
    const trimmed = nextToken.trim();
    setToken(trimmed.length > 0 ? trimmed : null);

    if (trimmed.length === 0) {
      void clearAuthSession();
    } else {
      void saveAuthSession({
        token: trimmed,
        refreshToken: "",
        expiresAtUtc: null,
        email: email ?? "",
        roles,
        profileType,
      });
    }

    logClientEvent("mobile.auth", "Manual token updated", {
      hasToken: trimmed.length > 0,
    });
  };

  const login = async (emailAddress: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      logClientEvent("mobile.auth", "Login requested", {
        email: emailAddress.trim(),
      });
      const response = await loginRequest({
        email: emailAddress.trim(),
        password,
      });

      await persistSession(response);

      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    emailAddress: string,
    passwordInput: string,
    confirmPasswordInput: string,
    profileTypeInput: UserProfileType
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      logClientEvent("mobile.auth", "Registration requested", {
        email: emailAddress,
        profileType: profileTypeInput === UserProfileType.Nurse ? "Nurse" : "Client",
      });

      const response = await registerUserRequest(
        emailAddress,
        passwordInput,
        confirmPasswordInput,
        profileTypeInput
      );

      if (response.token) {
        // Client registration - token returned, user is active
        await persistSession(response, profileTypeInput);

        logClientEvent("mobile.auth", "Client registration successful", {
          email: response.email,
        });
      } else {
        // Nurse registration - no token, account pending approval
        setEmail(emailAddress);
        setProfileType(profileTypeInput);
        setRoles(response.roles ?? []);
      setToken(null);

      logClientEvent("mobile.auth", "Nurse registration successful - pending approval", {
          email: emailAddress,
        });
      }

      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Registration failed";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const completeOAuthLogin = async (response: AuthResponse) => {
    setError(null);
    await persistSession(response);

    logClientEvent("mobile.auth", "Google OAuth login successful", {
      email: response.email,
      roles: response.roles ?? [],
    });
  };

  const logout = async () => {
    setToken(null);
    setEmail(null);
    setRoles([]);
    setProfileType(null);
    setError(null);

    await clearAuthSession();

    logClientEvent("mobile.auth", "Session cleared");
  };

  const clearError = () => {
    setError(null);
  };

  const value = useMemo(
    () => ({
      token,
      email,
      roles,
      profileType,
      isAuthenticated: Boolean(token),
      isLoading,
      error,
      setSession,
      completeOAuthLogin,
      setTokenManually,
      login,
      register,
      logout,
      clearError,
    }),
    [token, email, roles, profileType, isLoading, error],
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
