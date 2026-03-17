const fallbackApiBaseUrl = "https://10.0.0.33:5050";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || fallbackApiBaseUrl;
