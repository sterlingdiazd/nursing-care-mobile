import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

/**
 * Configuration strategy for API base URL
 *
 * Priority order:
 * 1. Environment variable (for explicit override or web platform testing)
 * 2. Dynamic IP detection via Expo (best for physical devices on LAN)
 * 3. Fallback to localhost for web/testing
 * 4. Default sslip.io URL
 */
const getApiBaseUrl = (): string => {
  // Priority 1: Web platform always uses localhost (Expo web = dev/automation only)
  if (Platform.OS === "web") {
    return "http://localhost:5050";
  }

  // Priority 2: User-set environment variable (mobile devices)
  // Only use if it's explicitly set and not empty
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim() && envUrl.trim() !== "http://localhost:5050") {
    return envUrl.trim();
  }

  // Priority 3: Dynamic detection of the development machine IP
  // This works on physical devices, Android emulators, and iOS simulators
  // The Expo debug host provides the IP address of the machine running the dev server
  let hostIp = "";
  let detectionMethod = "";

  // Try getting from Constants (most reliable on physical devices)
  const debuggerHost = Constants.expoConfig?.hostUri || "";
  if (debuggerHost) {
    hostIp = debuggerHost.split(":")[0];
    detectionMethod = "debuggerHost";
  }

  // Fallback to Linking for additional detection methods
  if (!hostIp) {
    try {
      const fullUrl = Linking.createURL("/");
      // Extracts IP from exp://10.0.0.33:8081/
      const match = fullUrl.match(/exp:\/\/([^:/]+)/);
      if (match) {
        hostIp = match[1];
        detectionMethod = "linkingUrl";
      }
    } catch {
      // Linking might fail in some scenarios, that's okay
    }
  }

  // Construct URL using detected IP (convert to sslip.io domain for HTTPS)
  if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
    const dynamicDomain = hostIp.replace(/\./g, "-") + ".sslip.io";
    return `https://${dynamicDomain}:5050`;
  }

  // Priority 4: Fallback with reasonable defaults
  // This will be used if IP detection fails completely
  return "https://10-0-0-34.sslip.io:5050";
};

export const API_BASE_URL = getApiBaseUrl();
