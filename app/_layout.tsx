import { useEffect } from "react";
import "react-native-reanimated";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { BrandProvider } from "@/src/context/BrandContext";
import { ToastProvider } from "@/src/components/shared/ToastProvider";
import { usePushNotifications } from "@/src/hooks/usePushNotifications";
import BottomBar from "@/src/components/navigation/BottomBar";
import { initApiBaseUrl } from "@/src/services/apiBaseUrl";
import { logClientEvent } from "@/src/logging/clientLogger";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Give a minimum duration to the splash screen for better branding feel
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 1500);
    }
  }, [loaded]);

  // Kick off the API base-URL probe as soon as the app mounts. The probe
  // races a small candidate list (manual override / env / tunnel /
  // debugger-host / .local hostname / last-known-good) against /api/health
  // and picks the first that responds, then updates the live binding on
  // API_BASE_URL so every subsequent request points at a working host.
  useEffect(() => {
    void initApiBaseUrl()
      .then((resolved) => {
        logClientEvent("mobile.api", "API base URL resolved", resolved);
      })
      .catch((error) => {
        logClientEvent(
          "mobile.api",
          "API base URL probe failed",
          { message: error instanceof Error ? error.message : String(error) },
          "error",
        );
      });
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <ToastProvider>
    <AuthProvider>
      <BrandProvider>
        <AuthenticatedRoutes />
      </BrandProvider>
    </AuthProvider>
    </ToastProvider>
    </SafeAreaProvider>
  );
}

// Top-level route segments that are reachable WITHOUT a session. Everything
// else is treated as protected.
const PUBLIC_ROUTE_SEGMENTS = ["login", "register", "forgot-password", "reset-password"];

function AuthenticatedRoutes() {
  // Lives inside AuthProvider so the hook can read isReady/isAuthenticated.
  // Registers the device's Expo push token + tap-to-deep-link handler.
  usePushNotifications();

  // Global auth guard: the single source of truth for "no session => login".
  // Per-screen guards are easy to forget, so this central effect guarantees that
  // ANY protected route bounces to /login the moment the session is gone (logout,
  // token expiry, storage cleared) — regardless of which screen the user is on.
  const { isReady, isAuthenticated } = useAuth();
  const segments = useSegments();
  useEffect(() => {
    if (!isReady) return;
    const onPublicRoute = PUBLIC_ROUTE_SEGMENTS.includes(segments[0] as string);
    if (!isAuthenticated && !onPublicRoute) {
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, segments]);
  // BottomBar lives at the root so it persists across every authenticated
  // route — including admin sub-routes like /admin/payroll which are not
  // file-system children of the (tabs) group. The bar self-gates on
  // isAuthenticated, so it stays hidden on login/register/forgot-password.
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="forgot-password"
            options={{ title: "Recuperar contraseña", headerShown: false }}
          />
          <Stack.Screen
            name="reset-password"
            options={{ title: "Restablecer contraseña", headerShown: false }}
          />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </View>
      <BottomBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
