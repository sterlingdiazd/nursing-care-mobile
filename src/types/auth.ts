export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAtUtc: string | null;
  userId: string;
  email: string;
  roles: string[];
  correlationId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
