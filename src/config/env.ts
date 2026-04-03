/**
 * Environment Configuration for Mobile App
 */

// API Base URL - adjust based on environment
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:5254";

// App Configuration
export const APP_CONFIG = {
  name: "NursingCare",
  version: "1.0.0",
  environment: process.env.NODE_ENV || "development",
};

// Feature Flags
export const FEATURES = {
  enableLogging: true,
  enableDebugPanel: process.env.NODE_ENV === "development",
};
