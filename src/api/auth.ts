import axios, { AxiosInstance } from "axios";
import { API_BASE_URL } from "../config/env";

// Types
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  roles: string[];
}

// HTTP Client
const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/**
 * Register a new user (Client or Nurse)
 */
export async function registerUser(
  email: string,
  password: string,
  confirmPassword: string,
  profileType: UserProfileType
): Promise<AuthResponse> {
  try {
    const request: RegisterRequest = {
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
      "Registration failed";

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
      "Login failed";

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
      message: "Password must be at least 6 characters",
    };
  }
  return {
    isValid: true,
    message: "Password is strong",
  };
}
