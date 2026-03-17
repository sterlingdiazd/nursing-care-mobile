import { API_BASE_URL } from "@/src/config/api";
import { createCorrelationId, logClientEvent } from "@/src/logging/clientLogger";

interface JsonRequestOptions {
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  onMeta?: (meta: { correlationId: string; status: number; url: string }) => void;
}

function getNetworkErrorMessage(url: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown network error";

  return `Unable to reach ${url}. ${message}. If you are on iPhone, confirm the device trusts the local certificate and can open the API URL in Safari.`;
}

function getDisplayErrorMessage(responseText: string, status: number) {
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
  token,
  onMeta,
}: JsonRequestOptions): Promise<T> {
  const correlationId = createCorrelationId();
  const url = `${API_BASE_URL}${path}`;

  logClientEvent("mobile.http", "Request started", {
    correlationId,
    method,
    url,
    hasAuthorization: Boolean(token),
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
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
