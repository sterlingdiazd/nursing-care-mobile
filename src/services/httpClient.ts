import { API_BASE_URL } from "@/src/config/api";
import { createCorrelationId, logClientEvent } from "@/src/logging/clientLogger";
import { AuthResponse } from "@/src/types/auth";
import {
  clearAuthSession,
  getCachedAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "@/src/services/authSession";
import {
  ensureApiBaseUrlReady,
  getCurrentBase,
  probeAndResolveDebounced,
} from "@/src/services/apiBaseUrl";
import { Platform } from "react-native";

/**
 * Error subclass thrown when a request never reaches the server (DNS, network
 * unreachable, TLS, timeout). Lets UI layers distinguish "API is down or
 * mis-pointed" from "API returned 4xx/5xx" so they can fall back to a cached
 * snapshot and show an offline banner instead of a hard error toast.
 */
export class ApiConnectivityError extends Error {
  public readonly isConnectivity = true;
  public readonly url: string;
  public readonly source: string;
  constructor(message: string, url: string, source: string) {
    super(message);
    this.name = "ApiConnectivityError";
    this.url = url;
    this.source = source;
  }
}

export function isConnectivityError(error: unknown): error is ApiConnectivityError {
  return error instanceof Error && (error as any).isConnectivity === true;
}

interface JsonRequestOptions {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  correlationId?: string;
  token?: string | null;
  auth?: boolean;
  skipAuthRefresh?: boolean;
  onMeta?: (meta: { correlationId: string; status: number; url: string }) => void;
  /**
   * Internal flag: set by the http client itself when a network failure
   * triggers a one-shot probe-and-retry. Prevents infinite retry loops if
   * the probe-selected URL is also dead.
   */
  _retriedAfterProbe?: boolean;
}

/**
 * Awaits the resolver's initial probe (or up to 3 s, whichever is sooner)
 * before the very first request fires. After init has resolved this is a
 * microtask no-op, so subsequent requests pay no cost.
 */
async function ensureReady(): Promise<void> {
  try {
    await ensureApiBaseUrlReady();
  } catch {
    /* never block a request on a resolver failure */
  }
}

/**
 * Runs after a network failure inside a request. Awaits a probe (coalesced
 * across concurrent failing requests), then returns the freshly-resolved
 * base URL. The caller compares against the URL it just tried and decides
 * whether retrying is worthwhile.
 */
async function probeForRecovery(failedUrl: string): Promise<string | null> {
  try {
    const before = failedUrl;
    await probeAndResolveDebounced();
    const after = getCurrentBase().url;
    return after !== before ? after : null;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

export function getNetworkErrorMessage(url: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Error de red desconocido";
  const browserHint = "Verifica que el backend local esté corriendo y que la URL del API responda en el navegador.";

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const usesLocalHttps = parsedUrl.protocol === "https:" && (
      hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname.endsWith(".sslip.io")
      || hostname.startsWith("10.")
      || hostname.startsWith("192.168.")
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );

    if (Platform.OS === "web") {
      return `No fue posible conectarse a ${url}. ${message}. ${browserHint}`;
    }

    if (usesLocalHttps) {
      return `No fue posible conectarse a ${url}. ${message}. Si estas en iPhone, confirma que el dispositivo confia en el certificado local y puede abrir la URL del API en Safari.`;
    }
  } catch {
    if (Platform.OS === "web") {
      return `No fue posible conectarse a ${url}. ${message}. ${browserHint}`;
    }
  }

  return `No fue posible conectarse a ${url}. ${message}. Revisa la conectividad del API y vuelve a intentarlo.`;
}

export function getDisplayErrorMessage(responseText: string, status: number) {
  if (!responseText) {
    return `La solicitud no se pudo completar. Código ${status}.`;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      title?: string;
      detail?: string;
      error?: string;
      message?: string;
      errors?: Record<string, string[] | undefined>;
    };
    const firstValidationError = parsed.errors
      ? Object.values(parsed.errors).flat().find((value) => Boolean(value))
      : "";

    return (
      parsed.detail ||
      firstValidationError ||
      parsed.error ||
      parsed.message ||
      parsed.title ||
      `La solicitud no se pudo completar. Código ${status}.`
    );
  } catch {
    return responseText;
  }
}

function triggerSelfHealProbe(reason: string) {
  // Fire-and-forget. The probe coalesces concurrent calls and updates the
  // resolver state asynchronously; the next request will pick up any new URL
  // via the ES module live binding on API_BASE_URL.
  void probeAndResolveDebounced().catch(() => {
    /* probe failures are surfaced via diagnostics; never block a request */
  });
  logClientEvent("mobile.http", "Self-heal probe triggered", { reason }, "info");
}

export async function requestVoid(options: JsonRequestOptions): Promise<void> {
  const {
    path,
    method,
    body,
    correlationId: providedCorrelationId,
    token,
    auth,
    skipAuthRefresh,
    onMeta,
    _retriedAfterProbe,
  } = options;
  const correlationId = providedCorrelationId ?? createCorrelationId();
  await ensureReady();
  const url = `${API_BASE_URL}${path}`;
  const shouldUseAuth = auth || Boolean(token);
  const session = shouldUseAuth ? getCachedAuthSession() ?? (await loadAuthSession()) : null;
  const authToken = token ?? session?.token ?? null;

  logClientEvent("mobile.http", "Request started", {
    correlationId,
    method,
    url,
    hasAuthorization: Boolean(authToken),
  });

  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
        "X-Client-App": "nursing-care-mobile",
        "X-Client-Platform": "expo-go",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const baseMessage = isTimeout
      ? `La solicitud tardó demasiado tiempo en responder. Verifica tu conexión a internet y que el servidor esté funcionando. URL: ${url}`
      : getNetworkErrorMessage(url, error);

    logClientEvent(
      "mobile.http",
      isTimeout ? "Request timeout" : "Request failed before reaching the server",
      {
        correlationId,
        method,
        url,
        message: baseMessage,
        ...(isTimeout ? { timeoutMs: 30000 } : {}),
      },
      "error",
    );

    // Auto-recovery: probe candidates synchronously and, if a different URL
    // now responds, retry the request once. The user sees a successful
    // request instead of a connectivity error toast.
    if (!_retriedAfterProbe) {
      const recoveredUrl = await probeForRecovery(url);
      if (recoveredUrl) {
        logClientEvent("mobile.http", "Auto-recovery probe found new URL", {
          correlationId,
          previousUrl: url,
          recoveredUrl,
        });
        return requestVoid({ ...options, _retriedAfterProbe: true });
      }
    }

    // No working candidate found, or we already retried. Surface a
    // typed connectivity error so the caller can fall back to a cached
    // snapshot + offline banner.
    const base = getCurrentBase();
    throw new ApiConnectivityError(baseMessage, url, base.source);
  }

  const responseText = await response.text();
  const responseCorrelationId = response.headers.get("X-Correlation-ID");

  if (response.status === 401 && shouldUseAuth && !skipAuthRefresh) {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      return requestVoid({
        path,
        method,
        body,
        token: refreshedToken,
        auth,
        skipAuthRefresh: true,
        onMeta,
      });
    }
  }

  if (!response.ok) {
    const isExpiredAuth = response.status === 401 && shouldUseAuth;
    logClientEvent(
      "mobile.http",
      isExpiredAuth ? "Auth expired" : "Request failed",
      {
        correlationId,
        responseCorrelationId,
        status: response.status,
        responseText,
      },
      isExpiredAuth ? "info" : "error",
    );

    if (response.status === 204) {
      return;
    }

    throw new Error(getDisplayErrorMessage(responseText, response.status));
  }

  logClientEvent("mobile.http", "Request success", {
    correlationId,
    responseCorrelationId,
    status: response.status,
  });

  onMeta?.({ correlationId, status: response.status, url });
}

export async function requestJson<T>({
  path,
  method,
  body,
  correlationId: providedCorrelationId,
  token,
  auth,
  skipAuthRefresh,
  onMeta,
}: JsonRequestOptions): Promise<T> {
  const correlationId = providedCorrelationId ?? createCorrelationId();
  const url = `${API_BASE_URL}${path}`;
  const shouldUseAuth = auth || Boolean(token);
  const session = shouldUseAuth ? getCachedAuthSession() ?? (await loadAuthSession()) : null;
  const authToken = token ?? session?.token ?? null;

  logClientEvent("mobile.http", "Request started", {
    correlationId,
    method,
    url,
    hasAuthorization: Boolean(authToken),
  });

  let response: Response;

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
        "X-Client-App": "nursing-care-mobile",
        "X-Client-Platform": "expo-go",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      const message = `La solicitud tardó demasiado tiempo en responder. Verifica tu conexión a internet y que el servidor esté funcionando. URL: ${url}`;

      logClientEvent(
        "mobile.http",
        "Request timeout",
        {
          correlationId,
          method,
          url,
          timeoutMs: 30000,
        },
        "error",
      );

      triggerSelfHealProbe("timeout");
      const base = getCurrentBase();
      throw new ApiConnectivityError(message, url, base.source);
    }

    const message = getNetworkErrorMessage(url, error);

    logClientEvent(
      "mobile.http",
      "Request failed before reaching the server",
      {
        correlationId,
        method,
        url,
        message,
      },
      "error",
    );

    triggerSelfHealProbe("network");
    const base = getCurrentBase();
    throw new ApiConnectivityError(message, url, base.source);
  }

  const responseText = await response.text();
  const responseCorrelationId = response.headers.get("X-Correlation-ID");

  if (response.status === 401 && shouldUseAuth && !skipAuthRefresh) {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      return requestJson<T>({
        path,
        method,
        body,
        token: refreshedToken,
        auth,
        skipAuthRefresh: true,
        onMeta,
      });
    }
  }

  if (!response.ok) {
    const isExpiredAuth = response.status === 401 && shouldUseAuth;
    logClientEvent(
      "mobile.http",
      isExpiredAuth ? "Auth expired" : "Request failed",
      {
        correlationId: responseCorrelationId ?? correlationId,
        method,
        url,
        status: response.status,
        response: responseText,
      },
      isExpiredAuth ? "info" : "error",
    );

    throw new Error(getDisplayErrorMessage(responseText, response.status));
  }

  logClientEvent("mobile.http", "Request completed", {
    correlationId: responseCorrelationId ?? correlationId,
    method,
    url,
    status: response.status,
  });

  onMeta?.({
    correlationId: responseCorrelationId ?? correlationId,
    status: response.status,
    url,
  });

  return responseText ? (JSON.parse(responseText) as T) : ({} as T);
}

async function refreshAccessToken() {
  const session = getCachedAuthSession() ?? (await loadAuthSession());

  if (!session?.refreshToken) {
    await clearAuthSession();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Client-App": "nursing-care-mobile",
            "X-Client-Platform": "expo-go",
          },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseText = await response.text();

        if (!response.ok) {
          throw new Error(getDisplayErrorMessage(responseText, response.status));
        }

        const payload = JSON.parse(responseText) as AuthResponse;

        await saveAuthSession({
          token: payload.token,
          refreshToken: payload.refreshToken,
          expiresAtUtc: payload.expiresAtUtc,
          userId: payload.userId,
          email: payload.email,
          roles: payload.roles,
          profileType: session.profileType,
          requiresProfileCompletion: payload.requiresProfileCompletion,
          requiresAdminReview: payload.requiresAdminReview,
        });

        return payload.token;
      } catch (error) {
        // Handle timeout specifically
        if (error instanceof Error && error.name === 'AbortError') {
          logClientEvent(
            "mobile.http",
            "Refresh token timeout",
            {
              timeoutMs: 30000,
            },
            "error",
          );
        }
        await clearAuthSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}
