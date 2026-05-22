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
 *
 * The app talks to the backend over the plain HTTP LAN URL (http://<ip>:<port>).
 * We deliberately do NOT route through sslip.io/HTTPS: the local cert path is
 * the recurring cause of "device does not trust the certificate" failures on
 * physical iPhones. The backend binds to 0.0.0.0:<port> and ATS permits the
 * local network, so HTTP over the LAN IP is the supported transport.
 */
const getApiBaseUrl = (): string => {
  const apiPort = process.env.EXPO_PUBLIC_API_PORT || "5050";
  const defaultLocalUrl = `http://localhost:${apiPort}`;

  // Priority 1: Explicit environment override (web automation and device testing)
  const explicitEnvUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL;
  if (explicitEnvUrl?.trim()) {
    return explicitEnvUrl.trim();
  }

  // Priority 2: Web platform uses localhost when no explicit override is present
  if (Platform.OS === "web") {
    return defaultLocalUrl;
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

  // Construct the plain HTTP LAN URL from the detected dev-machine IP.
  if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
    return `http://${hostIp}:${apiPort}`;
  }

  // Fallback when IP detection fails completely (e.g. simulator/web).
  return defaultLocalUrl;
};

export const API_BASE_URL = getApiBaseUrl();
