import AsyncStorage from "@react-native-async-storage/async-storage";
import { logClientEvent } from "@/src/logging/clientLogger";

/**
 * Typed snapshot cache backed by AsyncStorage.
 *
 * Pattern: every successful API call that drives a critical screen also
 * writes the response into a per-screen snapshot bucket. If a subsequent
 * fetch fails with a connectivity error, the screen reads the cached
 * snapshot and renders it behind an "Sin conexión — mostrando últimos
 * datos" banner instead of an empty white screen + red toast.
 *
 * The demo always shows *something* even when the backend is unreachable.
 */

const STORAGE_PREFIX = "nursing.snapshot.v1.";

interface CachedEnvelope<T> {
  data: T;
  capturedAtUtc: string;
}

export interface CachedSnapshot<T> {
  data: T;
  capturedAtUtc: string;
  ageMs: number;
}

function key(bucket: string): string {
  return `${STORAGE_PREFIX}${bucket}`;
}

export async function writeSnapshot<T>(bucket: string, data: T): Promise<void> {
  try {
    const envelope: CachedEnvelope<T> = {
      data,
      capturedAtUtc: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key(bucket), JSON.stringify(envelope));
  } catch (error) {
    logClientEvent(
      "mobile.cache",
      "Snapshot write failed",
      { bucket, message: error instanceof Error ? error.message : String(error) },
      "info",
    );
  }
}

export async function readSnapshot<T>(bucket: string): Promise<CachedSnapshot<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key(bucket));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CachedEnvelope<T>;
    if (!envelope || typeof envelope !== "object" || !("data" in envelope)) return null;
    const captured = envelope.capturedAtUtc ? new Date(envelope.capturedAtUtc).getTime() : Date.now();
    return {
      data: envelope.data,
      capturedAtUtc: envelope.capturedAtUtc,
      ageMs: Math.max(0, Date.now() - captured),
    };
  } catch (error) {
    logClientEvent(
      "mobile.cache",
      "Snapshot read failed",
      { bucket, message: error instanceof Error ? error.message : String(error) },
      "info",
    );
    return null;
  }
}

export async function clearSnapshot(bucket: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(bucket));
  } catch {
    /* ignore */
  }
}

export const SnapshotBuckets = {
  adminDashboard: "adminDashboard",
  // Care-requests list bucket is suffixed at the call site with the active
  // role + status filter so each "view" gets its own cached snapshot.
  careRequestsList: (suffix: string) => `careRequestsList.${suffix}`,
  // Nurse payroll summary.
  nursePayrollSummary: "nursePayrollSummary",
  // Client notifications list.
  clientNotifications: "clientNotifications",
} as const;
