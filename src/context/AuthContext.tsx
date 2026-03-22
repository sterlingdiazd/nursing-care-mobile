import { createContext, ReactNode, useContext, useMemo, useState, useEffect } from "react";

import { logClientEvent } from "@/src/logging/clientLogger";
import {
  completeProfile as completeProfileRequest,
  login as loginRequest,
  registerUser as registerUserRequest,
} from "@/src/services/authService";
import { AuthResponse } from "@/src/types/auth";
import {
  clearAuthSession,
  loadAuthSession,
  resolveUserIdFromToken,
  saveAuthSession,
  subscribeToAuthSession,
} from "@/src/services/authSession";

export enum UserProfileType {
  Client = 0,
  Nurse = 1,
}

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  email: string | null;
  roles: string[];
  profileType: UserProfileType | null;
  requiresProfileCompletion: boolean;
  requiresAdminReview: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  setSession: (response: AuthResponse) => void;
  completeOAuthLogin: (response: AuthResponse) => Promise<void>;
  setTokenManually: (token: string) => void;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (
    name: string,
    lastName: string,
    identificationNumber: string,
    phone: string,
    email: string,
    password: string,
    confirmPassword: string,
    hireDate: string | null,
    specialty: string | null,
    licenseId: string | null,
    bankName: string | null,
    accountNumber: string | null,
    profileType: UserProfileType
  ) => Promise<AuthResponse>;
  completeProfile: (
    name: string,
    lastName: string,
    identificationNumber: string,
    phone: string
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function resolveResponseUserId(response: AuthResponse, currentUserId?: string | null) {
  if (response.userId?.trim().length) {
    return response.userId;
  }

  if (response.token?.trim().length) {
    return resolveUserIdFromToken(response.token);
  }

  return currentUserId ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [profileType, setProfileType] = useState<UserProfileType | null>(null);
  const [requiresProfileCompletion, setRequiresProfileCompletion] = useState(false);
  const [requiresAdminReview, setRequiresAdminReview] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncAuthState = async () => {
    const session = await loadAuthSession();

    if (!session) {
      setToken(null);
      setUserId(null);
      setEmail(null);
      setRoles([]);
      setProfileType(null);
      setRequiresProfileCompletion(false);
      setRequiresAdminReview(false);
      return;
    }

    setToken(session.token);
    setUserId(session.userId);
    setEmail(session.email || null);
    setRoles(session.roles);
    setProfileType(session.profileType);
    setRequiresProfileCompletion(session.requiresProfileCompletion);
    setRequiresAdminReview(session.requiresAdminReview);
  };

  // Load auth state from AsyncStorage on mount
  useEffect(() => {
    syncAuthState().catch((err) => {
      console.error("Failed to load auth state:", err);
    }).finally(() => {
      setIsReady(true);
    });

    const unsubscribe = subscribeToAuthSession(() => {
      syncAuthState().catch((err) => {
        console.error("Failed to sync auth state:", err);
      });
    });

    return unsubscribe;
  }, []);

  const setSession = (response: AuthResponse) => {
    const resolvedUserId = resolveResponseUserId(response, userId);

    setToken(response.token);
    setUserId(resolvedUserId);
    setEmail(response.email);
    setRoles(response.roles ?? []);
    setRequiresProfileCompletion(response.requiresProfileCompletion);
    setRequiresAdminReview(response.requiresAdminReview);
    logClientEvent("mobile.auth", "Session loaded", {
      email: response.email,
      roles: response.roles,
    });
  };

  const resolveProfileType = (response: AuthResponse, fallbackProfileType?: UserProfileType | null) =>
    response.roles?.includes("Nurse") ? UserProfileType.Nurse : (fallbackProfileType ?? UserProfileType.Client);

  const persistSession = async (response: AuthResponse, fallbackProfileType?: UserProfileType | null) => {
    const detectedProfileType = resolveProfileType(response, fallbackProfileType);
    const resolvedUserId = resolveResponseUserId(response, userId);

    if (!resolvedUserId) {
      throw new Error("Could not resolve the authenticated user identifier.");
    }

    setSession({
      ...response,
      userId: resolvedUserId,
    });
    setProfileType(detectedProfileType);

    await saveAuthSession({
      token: response.token,
      refreshToken: response.refreshToken,
      expiresAtUtc: response.expiresAtUtc,
      userId: resolvedUserId,
      email: response.email,
      roles: response.roles ?? [],
      profileType: detectedProfileType,
      requiresProfileCompletion: response.requiresProfileCompletion,
      requiresAdminReview: response.requiresAdminReview,
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
        userId: userId ?? "",
        email: email ?? "",
        roles,
        profileType,
        requiresProfileCompletion,
        requiresAdminReview,
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
      const errorMsg = err instanceof Error ? err.message : "No fue posible iniciar sesion.";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    lastName: string,
    identificationNumber: string,
    phone: string,
    emailAddress: string,
    passwordInput: string,
    confirmPasswordInput: string,
    hireDateInput: string | null,
    specialtyInput: string | null,
    licenseIdInput: string | null,
    bankNameInput: string | null,
    accountNumberInput: string | null,
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
        name,
        lastName,
        identificationNumber,
        phone,
        emailAddress,
        passwordInput,
        confirmPasswordInput,
        hireDateInput,
        specialtyInput,
        licenseIdInput,
        bankNameInput,
        accountNumberInput,
        profileTypeInput
      );

      await persistSession(response, profileTypeInput);

      logClientEvent("mobile.auth", "Registration successful", {
        email: response.email,
        requiresAdminReview: response.requiresAdminReview,
      });

      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "No fue posible completar el registro.";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const completeProfile = async (
    name: string,
    lastName: string,
    identificationNumber: string,
    phone: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await completeProfileRequest({
        name,
        lastName,
        identificationNumber,
        phone,
      });

      await persistSession(response, UserProfileType.Client);
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "No fue posible completar el perfil.";
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
    setUserId(null);
    setEmail(null);
    setRoles([]);
    setProfileType(null);
    setRequiresProfileCompletion(false);
    setRequiresAdminReview(false);
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
      userId,
      email,
      roles,
      profileType,
      requiresProfileCompletion,
      requiresAdminReview,
      isAuthenticated: Boolean(token),
      isReady,
      isLoading,
      error,
      setSession,
      completeOAuthLogin,
      setTokenManually,
      login,
      register,
      completeProfile,
      logout,
      clearError,
    }),
    [token, userId, email, roles, profileType, requiresProfileCompletion, requiresAdminReview, isReady, isLoading, error],
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
