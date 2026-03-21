import { API_BASE_URL } from "@/src/config/api";
import { createCorrelationId, logClientEvent } from "@/src/logging/clientLogger";
import { AuthResponse } from "@/src/types/auth";
import {
  clearAuthSession,
  getCachedAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "@/src/services/authSession";

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
  const message = error instanceof Error ? error.message : "Unknown network error";

  return `No fue posible conectarse a ${url}. ${message}. Si estas en iPhone, confirma que el dispositivo confia en el certificado local y puede abrir la URL del API en Safari.`;
}

export function getDisplayErrorMessage(responseText: string, status: number) {
  if (!responseText) {
    return `Request failed with status ${status}`;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      title?: string;
      detail?: string;
      error?: string;
      message?: string;
    };

    return (
      parsed.detail ||
      parsed.error ||
      parsed.message ||
      parsed.title ||
      `Request failed with status ${status}`
    );
  } catch {
    return responseText;
  }
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
    });
  } catch (error) {
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
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-App": "nursing-care-mobile",
        "X-Client-Platform": "expo-go",
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (response) => {
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
      })
      .catch(async () => {
        await clearAuthSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
