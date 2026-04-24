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
  initialRouteName: "index",
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
      <Stack>
        {/* Auth Screens */}
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
          name="index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="account"
          options={{ title: "Cuenta", headerShown: false }}
        />
        <Stack.Screen
          name="diagnostics"
          options={{ title: "Diagnostico", headerShown: false }}
        />
        <Stack.Screen
          name="tools"
          options={{ title: "Herramientas", headerShown: false }}
        />

        {/* Main App Screens */}
        <Stack.Screen
          name="create-care-request"
          options={{ title: "Crear solicitud", headerShown: false }}
        />
        <Stack.Screen
          name="care-requests/index"
          options={{ title: "Solicitudes", headerShown: false }}
        />
        <Stack.Screen
          name="care-requests/[id]"
          options={{ title: "Detalle de solicitud", headerShown: false }}
        />
        <Stack.Screen
          name="admin/care-requests/[id]"
          options={{ title: "Detalle administrativo", headerShown: false }}
        />
        <Stack.Screen
          name="admin/care-requests/[id]/invoice"
          options={{ title: "Emitir factura", headerShown: false }}
        />
        <Stack.Screen
          name="admin/care-requests/[id]/pay"
          options={{ title: "Registrar pago", headerShown: false }}
        />
        <Stack.Screen
          name="admin/care-requests/[id]/void"
          options={{ title: "Anular solicitud", headerShown: false }}
        />
        <Stack.Screen
          name="admin/care-requests/[id]/receipt"
          options={{ title: "Generar recibo", headerShown: false }}
        />
        <Stack.Screen
          name="admin/index"
          options={{ title: "Panel administrativo", headerShown: false }}
        />
        <Stack.Screen
          name="admin/action-items"
          options={{ title: "Cola administrativa", headerShown: false }}
        />
        <Stack.Screen
          name="admin/notifications"
          options={{ title: "Notificaciones administrativas", headerShown: false }}
        />
        <Stack.Screen
          name="admin/payroll"
          options={{ title: "Nomina", headerShown: false }}
        />
        <Stack.Screen
          name="nurse/payroll"
          options={{ title: "Mi Nomina", headerShown: false }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </AuthProvider>
    </ToastProvider>
  );
}
