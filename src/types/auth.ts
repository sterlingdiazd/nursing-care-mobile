export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAtUtc: string | null;
  userId: string;
  email: string;
  roles: string[];
  requiresProfileCompletion: boolean;
  correlationId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
