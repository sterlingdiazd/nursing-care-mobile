import { useEffect } from "react";
import "react-native-reanimated";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/src/context/AuthContext";
import { ToastProvider } from "@/src/components/shared/ToastProvider";

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
    <ToastProvider>
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Tab group — contains all authenticated screens */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Auth screens — outside tab group, no tab bar */}
        <Stack.Screen
          name="register"
          options={{
            title: "Registro",
            headerShown: true,
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: "Iniciar sesion",
            headerShown: true,
            headerBackVisible: true,
          }}
        />
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
    </AuthProvider>
    </ToastProvider>
  );
}
