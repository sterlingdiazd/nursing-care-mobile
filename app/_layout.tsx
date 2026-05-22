import { useEffect } from "react";
import "react-native-reanimated";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { AuthProvider } from "@/src/context/AuthContext";
import { ToastProvider } from "@/src/components/shared/ToastProvider";
import { usePushNotifications } from "@/src/hooks/usePushNotifications";
import BottomBar from "@/src/components/navigation/BottomBar";

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
      <AuthenticatedRoutes />
    </AuthProvider>
    </ToastProvider>
    </SafeAreaProvider>
  );
}

function AuthenticatedRoutes() {
  // Lives inside AuthProvider so the hook can read isReady/isAuthenticated.
  // Registers the device's Expo push token + tap-to-deep-link handler.
  usePushNotifications();
  // BottomBar lives at the root so it persists across every authenticated
  // route — including admin sub-routes like /admin/payroll which are not
  // file-system children of the (tabs) group. The bar self-gates on
  // isAuthenticated, so it stays hidden on login/register/forgot-password.
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="forgot-password"
            options={{ title: "Recuperar contrasena", headerShown: false }}
          />
          <Stack.Screen
            name="reset-password"
            options={{ title: "Restablecer contrasena", headerShown: false }}
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
