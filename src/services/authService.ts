import { requestJson } from "@/src/services/httpClient";
import { API_BASE_URL } from "@/src/config/api";
import { AuthResponse, LoginRequest } from "@/src/types/auth";

export async function login(request: LoginRequest): Promise<AuthResponse> {
  let responseMeta:
    | {
        correlationId: string;
      }
    | undefined;

  const response = await requestJson<AuthResponse>({
    path: "/api/auth/login",
    method: "POST",
    body: request,
    onMeta: (meta) => {
      responseMeta = { correlationId: meta.correlationId };
    },
  });

  return {
    ...response,
    correlationId: responseMeta?.correlationId,
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: string;
}

export function getMobileApiBaseUrl() {
  return API_BASE_URL;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>({
    path: "/api/health",
    method: "GET",
  });
}
