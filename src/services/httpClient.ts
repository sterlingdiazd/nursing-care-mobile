import { API_BASE_URL } from "@/src/config/api";
import { createCorrelationId, logClientEvent } from "@/src/logging/clientLogger";
import { AuthResponse } from "@/src/types/auth";
import {
  clearAuthSession,
  getCachedAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "@/src/services/authSession";
import { Platform } from "react-native";

interface JsonRequestOptions {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  correlationId?: string;
  token?: string | null;
  auth?: boolean;
  skipAuthRefresh?: boolean;
  onMeta?: (meta: { correlationId: string; status: number; url: string }) => void;
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
    return `La solicitud no se pudo completar. Codigo ${status}.`;
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
      `La solicitud no se pudo completar. Codigo ${status}.`
    );
  } catch {
    return responseText;
  }
}

export async function requestVoid({
  path,
  method,
  body,
  correlationId: providedCorrelationId,
  token,
  auth,
  skipAuthRefresh,
  onMeta,
}: JsonRequestOptions): Promise<void> {
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

      throw new Error(message);
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

    throw new Error(message);
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
    logClientEvent(
      "mobile.http",
      "Request failed",
      {
        correlationId,
        responseCorrelationId,
        status: response.status,
        responseText,
      },
      "error",
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

      throw new Error(message);
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

    throw new Error(message);
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
    logClientEvent(
      "mobile.http",
      "Request failed",
      {
        correlationId: responseCorrelationId ?? correlationId,
        method,
        url,
        status: response.status,
        response: responseText,
      },
      "error",
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
