import axios, { AxiosInstance } from "axios";
import { API_BASE_URL } from "../config/env";

// Types
export enum UserProfileType {
  ADMIN = 0,
  NURSE = 1,
  CLIENT = 2,
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  email: string;
  roles: string[];
}

export interface PasswordResetResponse {
  message: string;
}

// HTTP Client
const httpClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL.replace(/\/$/, "")}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/**
 * Register a new user (Client or Nurse)
 */
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
  try {
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

    const response = await httpClient.post<AuthResponse>("/auth/register", request);
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      "No fue posible completar el registro";

    throw new Error(errorMessage);
  }
}

/**
 * Login with email and password
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    const request: LoginRequest = {
      email,
      password,
    };

    const response = await httpClient.post<AuthResponse>("/auth/login", request);
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      "No fue posible iniciar sesion";

    throw new Error(errorMessage);
  }
}

/**
 * Request a password reset code
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  try {
    const response = await httpClient.post<{ message: string }>(
      "/auth/forgot-password",
      { email }
    );
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      "No fue posible solicitar el restablecimiento";

    throw new Error(errorMessage);
  }
}

/**
 * Reset password using verification code
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<PasswordResetResponse> {
  try {
    const response = await httpClient.post<PasswordResetResponse>("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    return response.data;
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      "No fue posible restablecer la contrasena";

    throw new Error(errorMessage);
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  message: string;
} {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "La contrasena debe tener al menos 6 caracteres",
    };
  }
  return {
    isValid: true,
    message: "Contrasena valida",
  };
}
