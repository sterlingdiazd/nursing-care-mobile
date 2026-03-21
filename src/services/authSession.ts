import AsyncStorage from "@react-native-async-storage/async-storage";

import { UserProfileType } from "@/src/context/AuthContext";

export interface StoredAuthSession {
  token: string;
  refreshToken: string;
  expiresAtUtc: string | null;
  userId: string;
  email: string;
  roles: string[];
  profileType: UserProfileType | null;
  requiresProfileCompletion: boolean;
}

const STORAGE_KEY = "authSession";
let cachedSession: StoredAuthSession | null = null;
const listeners = new Set<() => void>();

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return globalThis.atob(padded);
}

export function resolveUserIdFromToken(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
    const candidates = [
      parsed.userId,
      parsed.sub,
      parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
    ];

    const resolved = candidates.find(
      (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
    );

    return typeof resolved === "string" ? resolved : null;
  } catch {
    return null;
  }
}

export async function loadAuthSession() {
  if (cachedSession) {
    return cachedSession;
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession> & { token?: string };
    const userId = parsed.userId || (parsed.token ? resolveUserIdFromToken(parsed.token) : null);

    if (
      !parsed.token ||
      !parsed.refreshToken ||
      !Object.prototype.hasOwnProperty.call(parsed, "expiresAtUtc") ||
      !parsed.email ||
      !Array.isArray(parsed.roles) ||
      !userId
    ) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    cachedSession = {
      token: parsed.token,
      refreshToken: parsed.refreshToken,
      expiresAtUtc: parsed.expiresAtUtc ?? null,
      userId,
      email: parsed.email,
      roles: parsed.roles,
      profileType: parsed.profileType ?? null,
      requiresProfileCompletion: parsed.requiresProfileCompletion ?? false,
    };

    if (parsed.userId !== userId) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSession));
    }

    return cachedSession;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function getCachedAuthSession() {
  return cachedSession;
}

export async function saveAuthSession(session: StoredAuthSession) {
  cachedSession = session;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notifyListeners();
}

export async function clearAuthSession() {
  cachedSession = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
  notifyListeners();
}

export function subscribeToAuthSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}
