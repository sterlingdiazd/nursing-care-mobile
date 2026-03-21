import { requestJson } from "@/src/services/httpClient";
import { API_BASE_URL } from "@/src/config/api";
import { AuthResponse, LoginRequest } from "@/src/types/auth";

export enum UserProfileType {
  Client = 0,
  Nurse = 1,
}

export interface RegisterRequest {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
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
  name: string,
  lastName: string,
  identificationNumber: string,
  phone: string,
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
    name,
    lastName,
    identificationNumber,
    phone,
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

export async function completeProfile(request: {
  name: string;
  lastName: string;
  identificationNumber: string;
  phone: string;
}): Promise<AuthResponse> {
  let responseMeta:
    | {
        correlationId: string;
      }
    | undefined;

  const response = await requestJson<AuthResponse>({
    path: "/api/auth/complete-profile",
    method: "POST",
    body: request,
    auth: true,
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

export function getLocalHttpsCertificateWarning(): string | null {
  try {
    const apiUrl = new URL(API_BASE_URL);

    if (apiUrl.protocol !== "https:") {
      return null;
    }

    const hostname = apiUrl.hostname;
    const isPrivateLanHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (!isPrivateLanHost) {
      return null;
    }

    return `El backend usa HTTPS local en ${apiUrl.host}. Si el iPhone no confia el certificado raiz del entorno, Safari mostrara "Your connection is not private" antes de llegar a Google. Instala y habilita la CA local en el dispositivo, luego prueba otra vez.`;
  } catch {
    return null;
  }
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
