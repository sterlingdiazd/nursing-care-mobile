import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import {
  getGoogleOAuthStartUrl,
  getLocalHttpsCertificateWarning,
  getMobileApiBaseUrl,
} from "@/src/services/authService";
import { authTestIds, testProps } from "@/src/testing/authTestIds";
import { formatRoleLabels } from "@/src/utils/roleLabels";
import { hapticFeedback } from "@/src/utils/haptics";
import { mobilePrimaryButton, mobileSecondaryButton, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";

export default function AccountScreen() {
  const { email, isAuthenticated, logout, roles, token } = useAuth();
  const apiBaseUrl = getMobileApiBaseUrl();

  const onGoogleLogin = async () => {
    const certificateWarning = getLocalHttpsCertificateWarning();

    if (certificateWarning) {
      Alert.alert("Certificado local requerido", certificateWarning);
    }

    try {
      hapticFeedback.light();
      const authUrl = getGoogleOAuthStartUrl("mobile");
      logClientEvent("mobile.ui", "Google OAuth started from account screen", {
        authUrl,
      });
      await Linking.openURL(authUrl);
    } catch (error: any) {
      Alert.alert(
        "No se pudo abrir Google",
        error?.message || "No fue posible abrir Google OAuth.",
      );
    }
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Cuenta"
      title="Acceso y sesion"
      description="Consulta el estado actual de tu cuenta y cambia de acceso cuando lo necesites."
    >
      <View style={styles.card}>
        <Text style={styles.sectionEyebrow}>Sesion</Text>
        <Text style={styles.sectionTitle}>
          {isAuthenticated ? "Tu sesion esta activa." : "No hay una sesion activa."}
        </Text>
        <Text style={styles.copy}>{email ?? "No hay correo cargado."}</Text>
        <Text style={styles.copy}>
          Roles: {formatRoleLabels(roles)}
        </Text>
        <Text style={styles.copy}>
          Token: {token ? `${token.slice(0, 18)}...` : "Sin token cargado"}
        </Text>
        <Text style={styles.copy}>API: {apiBaseUrl}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionEyebrow}>Acceso</Text>
        <Text style={styles.sectionTitle}>
          {isAuthenticated ? "Cambia o cierra la cuenta actual." : "Elige como entrar."}
        </Text>
        <Text style={styles.copy}>
          Google sigue siendo el acceso principal. Tambien puedes abrir las pantallas completas de login.
        </Text>

        <Pressable
          {...testProps(authTestIds.account.googleButton)}
          onPress={() => {
            void onGoogleLogin();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isAuthenticated ? "Cambiar cuenta con Google" : "Continuar con Google"}
          </Text>
        </Pressable>

        {!isAuthenticated && (
          <>
            <Pressable
              onPress={() => {
                hapticFeedback.light();
                router.push("/login");
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Iniciar sesion</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticFeedback.light();
                router.push("/register");
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Registrar</Text>
            </Pressable>
          </>
        )}

        {isAuthenticated && (
          <Pressable
            {...testProps(authTestIds.account.logoutButton)}
            onPress={() => {
              hapticFeedback.light();
              logClientEvent("mobile.ui", "Account screen logout tapped");
              void (async () => {
                await logout();
                router.replace("/");
              })();
            }}
            style={({ pressed }) => [
              styles.dangerButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.dangerButtonText}>Cerrar sesion</Text>
          </Pressable>
        )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  card: {
    ...mobileSurfaceCard,
    borderRadius: mobileTheme.radius.xl,
    padding: 20,
  },
  sectionEyebrow: {
    ...mobileTheme.typography.eyebrow,
    color: mobileTheme.colors.ink.muted,
    marginBottom: 8,
  },
  sectionTitle: {
    ...mobileTheme.typography.title,
    color: mobileTheme.colors.ink.primary,
    marginBottom: 10,
  },
  copy: {
    ...mobileTheme.typography.body,
    color: mobileTheme.colors.ink.secondary,
    marginBottom: 6,
  },
  primaryButton: {
    marginTop: 14,
    ...mobilePrimaryButton,
    borderRadius: mobileTheme.radius.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  secondaryButton: {
    marginTop: 12,
    ...mobileSecondaryButton,
    borderRadius: mobileTheme.radius.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  dangerButton: {
    marginTop: 12,
    backgroundColor: "#fff1f2",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: "#007aff",
    fontSize: 15,
    fontWeight: "700",
  },
  dangerButtonText: {
    color: "#be123c",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
