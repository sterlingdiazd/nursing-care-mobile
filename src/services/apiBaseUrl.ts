import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Multi-strategy API base URL resolver for the mobile app.
 *
 * The recurring demo failure was: the API base URL was computed once at module
 * load from Metro's debugger host. Any change in laptop IP (Wi-Fi switch, DHCP
 * renewal, sleep/wake, different network) left the app frozen pointing at a
 * dead host, with no way to fix it on-device.
 *
 * Strategies, in priority order:
 *
 *   1. manual-override       — user-set URL persisted in AsyncStorage (visible
 *                              and editable from the Diagnóstico screen). Top
 *                              priority: it is an explicit choice.
 *   2. env-override          — EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_API_URL.
 *                              Used for demo builds that bake a tunnel URL.
 *   3. baked-tunnel          — EXPO_PUBLIC_DEMO_TUNNEL_URL: a public tunnel
 *                              (cloudflared / ngrok) the demo build was shipped
 *                              with. Resilient to any LAN changes.
 *   4. debugger-host         — Metro's hostUri (IP form). Dev default.
 *   5. linking-url           — Linking.createURL fallback (also Metro-derived).
 *   6. mdns-hostname         — http://<EXPO_PUBLIC_API_HOSTNAME>.local:<port>.
 *                              Survives DHCP renewals on the same Wi-Fi.
 *   7. last-known-good       — the last URL that responded 200 to /api/health,
 *                              persisted across launches. Picks up the previous
 *                              session's good answer when nothing else works.
 *   8. localhost-fallback    — for web / simulator only.
 *
 * On startup we probe these candidates against /api/health (1.8s timeout each)
 * and pick the first 2xx winner. The winner is cached as last-known-good. On
 * any subsequent network failure, the http client triggers another probe to
 * self-heal — the user never sees a dead URL toast unless every candidate has
 * failed.
 */

const STORAGE_KEY_OVERRIDE = "nursing.api.manualOverride.v1";
const STORAGE_KEY_LAST_GOOD = "nursing.api.lastKnownGood.v1";
const HEALTH_PATH = "/api/health";
const PROBE_TIMEOUT_MS = 1800;

export type DetectionSource =
  | "manual-override"
  | "env-override"
  | "baked-tunnel"
  | "debugger-host"
  | "linking-url"
  | "mdns-hostname"
  | "last-known-good"
  | "localhost-fallback";

export interface ResolvedApiBase {
  url: string;
  source: DetectionSource;
}

export interface CandidateProbeResult {
  url: string;
  source: DetectionSource;
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
}

export interface ApiDiagnostics {
  current: ResolvedApiBase;
  candidates: CandidateProbeResult[];
  lastProbedAt: string | null;
  hasManualOverride: boolean;
  lastKnownGood: string | null;
}

type Listener = (next: string) => void;

const listeners: Set<Listener> = new Set();
let currentBase: ResolvedApiBase;
let lastProbed: { at: string; results: CandidateProbeResult[] } | null = null;
let manualOverrideCache: string | null = null;
let lastKnownGoodCache: string | null = null;

function notify(url: string) {
  for (const listener of listeners) {
    try {
      listener(url);
    } catch {
      /* listener errors must not break the resolver */
    }
  }
}

function setCurrent(next: ResolvedApiBase) {
  if (currentBase && currentBase.url === next.url && currentBase.source === next.source) {
    return;
  }
  currentBase = next;
  notify(next.url);
}

function apiPort(): string {
  return process.env.EXPO_PUBLIC_API_PORT || "5050";
}

function envOverride(): string | null {
  const value = (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || "").trim();
  return value ? stripTrailingSlash(value) : null;
}

function bakedTunnel(): string | null {
  const value = (process.env.EXPO_PUBLIC_DEMO_TUNNEL_URL || "").trim();
  return value ? stripTrailingSlash(value) : null;
}

function mdnsHostnameUrl(): string | null {
  const raw = (process.env.EXPO_PUBLIC_API_HOSTNAME || "").trim();
  if (!raw) return null;
  const host = raw.endsWith(".local") ? raw : `${raw}.local`;
  return `http://${host}:${apiPort()}`;
}

function debuggerHostUrl(): string | null {
  const hostUri = Constants.expoConfig?.hostUri || "";
  const host = hostUri.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return `http://${host}:${apiPort()}`;
}

function linkingHostUrl(): string | null {
  try {
    const url = Linking.createURL("/");
    const match = url.match(/exp:\/\/([^:/]+)/);
    if (match && match[1] !== "localhost" && match[1] !== "127.0.0.1") {
      return `http://${match[1]}:${apiPort()}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Best-guess sync resolution. Runs at module load so importers of
 * `API_BASE_URL` see *something* immediately, before the async probe finishes.
 *
 * Priority here is conservative: env beats every dynamic guess, because an
 * explicit env value is almost always the right answer for that build.
 */
function bestGuessSync(): ResolvedApiBase {
  const env = envOverride();
  if (env) return { url: env, source: "env-override" };

  if (Platform.OS === "web") {
    return { url: `http://localhost:${apiPort()}`, source: "localhost-fallback" };
  }

  const tunnel = bakedTunnel();
  if (tunnel) return { url: tunnel, source: "baked-tunnel" };

  const debugger_ = debuggerHostUrl();
  if (debugger_) return { url: debugger_, source: "debugger-host" };

  const linking = linkingHostUrl();
  if (linking) return { url: linking, source: "linking-url" };

  const mdns = mdnsHostnameUrl();
  if (mdns) return { url: mdns, source: "mdns-hostname" };

  return { url: `http://localhost:${apiPort()}`, source: "localhost-fallback" };
}

currentBase = bestGuessSync();

async function readOverrideFromStorage(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY_OVERRIDE);
    return value?.trim() ? stripTrailingSlash(value.trim()) : null;
  } catch {
    return null;
  }
}

async function readLastGoodFromStorage(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY_LAST_GOOD);
    return value?.trim() ? stripTrailingSlash(value.trim()) : null;
  } catch {
    return null;
  }
}

async function writeLastGood(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_GOOD, url);
    lastKnownGoodCache = url;
  } catch {
    /* ignore */
  }
}

export async function setManualOverride(url: string): Promise<ResolvedApiBase> {
  const trimmed = stripTrailingSlash(url.trim());
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("La URL debe comenzar con http:// o https://");
  }
  await AsyncStorage.setItem(STORAGE_KEY_OVERRIDE, trimmed);
  manualOverrideCache = trimmed;
  setCurrent({ url: trimmed, source: "manual-override" });
  return currentBase;
}

export async function clearManualOverride(): Promise<ResolvedApiBase> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_OVERRIDE);
  } catch {
    /* ignore */
  }
  manualOverrideCache = null;
  return probeAndResolve();
}

async function probeUrl(url: string): Promise<{
  ok: boolean;
  status?: number;
  latencyMs: number;
  error?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${url}${HEALTH_PATH}`, {
      method: "GET",
      signal: controller.signal,
    });
    return { ok: response.ok, status: response.status, latencyMs: Date.now() - startedAt };
  } catch (error: any) {
    const message = error?.name === "AbortError" ? "Tiempo de espera agotado" : error?.message || String(error);
    return { ok: false, latencyMs: Date.now() - startedAt, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function buildCandidates(): Promise<Array<{ url: string; source: DetectionSource }>> {
  const ordered: Array<{ url: string; source: DetectionSource }> = [];

  const override = manualOverrideCache ?? (await readOverrideFromStorage());
  if (override) {
    ordered.push({ url: override, source: "manual-override" });
    manualOverrideCache = override;
  }

  const env = envOverride();
  if (env) ordered.push({ url: env, source: "env-override" });

  const tunnel = bakedTunnel();
  if (tunnel) ordered.push({ url: tunnel, source: "baked-tunnel" });

  const debugger_ = debuggerHostUrl();
  if (debugger_) ordered.push({ url: debugger_, source: "debugger-host" });

  const linking = linkingHostUrl();
  if (linking) ordered.push({ url: linking, source: "linking-url" });

  const mdns = mdnsHostnameUrl();
  if (mdns) ordered.push({ url: mdns, source: "mdns-hostname" });

  const lastGood = lastKnownGoodCache ?? (await readLastGoodFromStorage());
  if (lastGood) {
    ordered.push({ url: lastGood, source: "last-known-good" });
    lastKnownGoodCache = lastGood;
  }

  if (Platform.OS === "web") {
    ordered.push({ url: `http://localhost:${apiPort()}`, source: "localhost-fallback" });
  }

  const seen = new Set<string>();
  return ordered.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

/**
 * Probe every candidate in priority order; first 2xx response wins.
 * Caches the winner as last-known-good (unless the cached value *is* the
 * winner, to avoid a write-loop).
 *
 * If every candidate fails we keep the previous `currentBase` so the app
 * stays usable — the diagnostics panel surfaces the probe results so the
 * operator can pick the right URL manually.
 */
export async function probeAndResolve(): Promise<ResolvedApiBase> {
  const candidates = await buildCandidates();
  const results: CandidateProbeResult[] = [];
  let chosen: ResolvedApiBase | null = null;

  for (const candidate of candidates) {
    const probe = await probeUrl(candidate.url);
    results.push({ url: candidate.url, source: candidate.source, ...probe });
    if (!chosen && probe.ok) {
      chosen = { url: candidate.url, source: candidate.source };
      break;
    }
  }

  lastProbed = { at: new Date().toISOString(), results };

  if (chosen) {
    setCurrent(chosen);
    if (chosen.source !== "last-known-good" && chosen.url !== lastKnownGoodCache) {
      await writeLastGood(chosen.url);
    }
  }

  return currentBase;
}

let probeInFlight: Promise<ResolvedApiBase> | null = null;

/**
 * Coalesce concurrent re-probe requests. Used by the http client on network
 * failure so a burst of failing requests triggers exactly one probe round.
 */
export function probeAndResolveDebounced(): Promise<ResolvedApiBase> {
  if (probeInFlight) return probeInFlight;
  probeInFlight = probeAndResolve().finally(() => {
    probeInFlight = null;
  });
  return probeInFlight;
}

let initPromise: Promise<ResolvedApiBase> | null = null;

/**
 * Startup entry point. Always probes the candidate list (manual override is
 * candidate 1, not a hard force), so a stale override automatically falls back
 * to a working URL without the user having to clear it.
 *
 * Idempotent — repeated calls return the same in-flight promise. Resolves
 * with whatever candidate the probe selected, OR the original best-guess if
 * every candidate failed.
 */
export function initApiBaseUrl(): Promise<ResolvedApiBase> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    manualOverrideCache = await readOverrideFromStorage();
    lastKnownGoodCache = await readLastGoodFromStorage();
    return probeAndResolve();
  })();
  return initPromise;
}

/**
 * Gate for the very first request: callers `await` this before issuing a
 * fetch so the request fires against a URL that has just been verified by
 * the probe. Returns immediately once init has resolved; bounded by
 * `timeoutMs` so a network-pathological probe can never block the UI
 * forever — past the deadline we let the request fire against whatever
 * `currentBase` is, and the http client's auto-retry-after-probe still
 * recovers from a bad guess.
 */
export async function ensureApiBaseUrlReady(timeoutMs: number = 3000): Promise<ResolvedApiBase> {
  const ready = initApiBaseUrl();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<ResolvedApiBase>((resolve) => {
    timer = setTimeout(() => resolve(currentBase), timeoutMs);
  });
  try {
    return await Promise.race([ready, fallback]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getCurrentBase(): ResolvedApiBase {
  return currentBase;
}

export function getEffectiveApiBaseUrl(): string {
  return currentBase.url;
}

export function getDiagnostics(): ApiDiagnostics {
  return {
    current: currentBase,
    candidates: lastProbed?.results ?? [],
    lastProbedAt: lastProbed?.at ?? null,
    hasManualOverride: Boolean(manualOverrideCache),
    lastKnownGood: lastKnownGoodCache,
  };
}

export function subscribeToApiBaseUrlChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
