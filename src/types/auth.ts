export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAtUtc: string | null;
  userId: string;
  email: string;
  roles: string[];
  requiresProfileCompletion: boolean;
  requiresAdminReview: boolean;
  nurseServiceType?: 'CasaHogar' | 'Domicilio';
  correlationId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
