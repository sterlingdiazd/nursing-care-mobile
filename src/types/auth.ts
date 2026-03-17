export interface AuthResponse {
  token: string;
  email: string;
  roles: string[];
  correlationId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
