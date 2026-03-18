import { useSyncExternalStore } from "react";

export interface ClientLogEntry {
  id: string;
  correlationId: string;
  timestamp: string;
  level: "info" | "error";
  source: string;
  message: string;
  data?: unknown;
}

const MAX_ENTRIES = 150;
const listeners = new Set<() => void>();
let entries: ClientLogEntry[] = [];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => {
      const lowered = key.toLowerCase();

      if (lowered.includes("password") || lowered.includes("authorization") || lowered.includes("token")) {
        return [key, "[REDACTED]"];
      }

      return [key, sanitizeData(value)];
    }),
  );
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function createCorrelationId() {
  return createId();
}

export function extractCorrelationId(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }

  const candidate = (data as { correlationId?: unknown }).correlationId;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : undefined;
}

export function logClientEvent(
  source: string,
  message: string,
  data?: unknown,
  level: "info" | "error" = "info",
) {
  const sanitizedData = sanitizeData(data);
  const correlationId = extractCorrelationId(sanitizedData) ?? createCorrelationId();
  const entry: ClientLogEntry = {
    id: createId(),
    correlationId,
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    data:
      sanitizedData && typeof sanitizedData === "object" && !Array.isArray(sanitizedData)
        ? { correlationId, ...(sanitizedData as Record<string, unknown>) }
        : sanitizedData,
  };

  entries = [entry, ...entries].slice(0, MAX_ENTRIES);

  const logMethod = level === "error" ? console.error : console.info;
  logMethod(`[${source}] ${message}`, entry.data ?? "");

  emit();
}

export function clearClientLogs() {
  entries = [];
  emit();
}

export function getClientLogsSnapshot() {
  return entries;
}

export function useClientLogs() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => entries,
    () => entries,
  );
}
