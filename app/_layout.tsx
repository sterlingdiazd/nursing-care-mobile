import { useEffect } from "react";
import "react-native-reanimated";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/src/context/AuthContext";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
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
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <AuthProvider>
      <Stack>
        {/* Auth Screens */}
        <Stack.Screen
          name="register"
          options={{
            title: "Register",
            headerShown: true,
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: "Log In",
            headerShown: true,
            headerBackVisible: true,
          }}
        />

        {/* Main App Screens */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="create-care-request"
          options={{ title: "Create Care Request" }}
        />
        <Stack.Screen
          name="care-requests/index"
          options={{ title: "Care Requests" }}
        />
        <Stack.Screen
          name="care-requests/[id]"
          options={{ title: "Request Detail" }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </AuthProvider>
  );
}
