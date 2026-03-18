import AsyncStorage from "@react-native-async-storage/async-storage";

import { UserProfileType } from "@/src/context/AuthContext";

export interface StoredAuthSession {
  token: string;
  refreshToken: string;
  expiresAtUtc: string | null;
  email: string;
  roles: string[];
  profileType: UserProfileType | null;
}

const STORAGE_KEY = "authSession";
let cachedSession: StoredAuthSession | null = null;
const listeners = new Set<() => void>();

export async function loadAuthSession() {
  if (cachedSession) {
    return cachedSession;
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    cachedSession = JSON.parse(raw) as StoredAuthSession;
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
