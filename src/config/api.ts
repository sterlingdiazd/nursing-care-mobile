import Constants from "expo-constants";
import * as Linking from "expo-linking";

const getApiBaseUrl = () => {
  // Priority 1: User-set environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl?.trim()) {
    return envUrl.trim();
  }

  // Priority 2: Dynamic detection of the Metro Host
  // On physical devices, hostUri is the most reliable way to find the workstation IP
  let hostIp = "";
  
  // Try getting it from Constants (Debugger Host)
  const debuggerHost = Constants.expoConfig?.hostUri || "";
  if (debuggerHost) {
    hostIp = debuggerHost.split(":")[0];
  }

  // Double check with Linking if hostIp is still empty
  if (!hostIp) {
    const fullUrl = Linking.createURL("/");
    // Extracts IP from exp://10.0.0.33:8081/
    const match = fullUrl.match(/exp:\/\/([^:/]+)/);
    if (match) {
      hostIp = match[1];
    }
  }

  if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
    const dynamicDomain = hostIp.replace(/\./g, "-") + ".sslip.io";
    return `https://${dynamicDomain}:5050`;
  }

  // Priority 3: Fallback if everything else fails
  return "https://10-0-0-33.sslip.io:5050";
};

export const API_BASE_URL = getApiBaseUrl();
