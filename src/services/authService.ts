import { requestJson } from "@/src/services/httpClient";
import { API_BASE_URL } from "@/src/config/api";
import { AuthResponse, LoginRequest } from "@/src/types/auth";

export enum UserProfileType {
  Client = 0,
  Nurse = 1,
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  profileType: UserProfileType;
}

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

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  let responseMeta:
    | {
        correlationId: string;
      }
    | undefined;

  const response = await requestJson<AuthResponse>({
    path: "/api/auth/refresh",
    method: "POST",
    body: { refreshToken },
    skipAuthRefresh: true,
    onMeta: (meta) => {
      responseMeta = { correlationId: meta.correlationId };
    },
  });

  return {
    ...response,
    correlationId: responseMeta?.correlationId,
  };
}

export async function registerUser(
  email: string,
  password: string,
  confirmPassword: string,
  profileType: UserProfileType
): Promise<AuthResponse> {
  let responseMeta:
    | {
        correlationId: string;
      }
    | undefined;

  const request: RegisterRequest = {
    email,
    password,
    confirmPassword,
    profileType,
  };

  const response = await requestJson<AuthResponse>({
    path: "/api/auth/register",
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

export function getGoogleOAuthStartUrl(target: "web" | "mobile" = "mobile") {
  return `${API_BASE_URL.replace(/\/$/, "")}/api/auth/google/start?target=${target}`;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>({
    path: "/api/health",
    method: "GET",
  });
}
