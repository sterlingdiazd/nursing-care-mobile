import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, Platform } from "react-native";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { useToast } from "@/src/components/shared/ToastProvider";
import {
  getGoogleOAuthStartUrl,
  getLocalHttpsCertificateWarning,
  getMobileApiBaseUrl,
} from "@/src/services/authService";
import { authTestIds } from "@/src/testing/authTestIds";
import { testProps } from "@/src/testing/testIds";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";
import { formatRoleLabels } from "@/src/utils/roleLabels";
import { hapticFeedback } from "@/src/utils/haptics";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { FormButton } from "@/src/components/form";

export default function AccountScreen() {
  const router = useRouter();
  const { email, isAuthenticated, logout, roles, token } = useAuth();
  const { showToast } = useToast();
  const apiBaseUrl = getMobileApiBaseUrl();

  const onGoogleLogin = async () => {
    const certificateWarning = getLocalHttpsCertificateWarning();

    if (certificateWarning) {
      showToast({ variant: "error", message: certificateWarning });
    }

    try {
      hapticFeedback.selection();
      const authUrl = getGoogleOAuthStartUrl("mobile");
      logClientEvent("mobile.ui", "Google OAuth started from account screen", {
        authUrl,
      });
      await Linking.openURL(authUrl);
    } catch (error: any) {
      hapticFeedback.error();
      showToast({ variant: "error", message: error?.message || "No fue posible abrir Google OAuth." });
    }
  };

  const onLogout = async () => {
    hapticFeedback.selection();
    logClientEvent("mobile.ui", "Account screen logout tapped");
    await logout();
    router.replace("/");
  };

  return (
    <MobileWorkspaceShell
      testID={navigationTestIds.screens.accountRoot}
      nativeID={navigationTestIds.screens.accountRoot}
      eyebrow="Cuenta"
      title="Acceso y sesión"
      description="Consulta el estado actual de tu cuenta y gestiona tu sesión."
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Estado de Sesión</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Usuario</Text>
            <Text style={styles.infoValue}>{email ?? "No autenticado"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Roles</Text>
            <Text style={styles.infoValue}>{formatRoleLabels(roles) || "Ninguno"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Servidor</Text>
            <Text style={styles.infoValue}>{apiBaseUrl}</Text>
          </View>

          {token ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Token de acceso</Text>
              <Text style={styles.tokenValue}>{token.slice(0, 32)}...</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, styles.actionsCard]}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <Text style={styles.copy}>
            Gestiona tu acceso utilizando los servicios vinculados o cambia de cuenta.
          </Text>

          <FormButton
            testID={authTestIds.account.googleButton}
            onPress={onGoogleLogin}
            variant="secondary"
            style={styles.actionButton}
          >
            {isAuthenticated ? "Cambiar cuenta con Google" : "Continuar con Google"}
          </FormButton>

          {!isAuthenticated && (
            <>
              <FormButton
                testID="account-login-redirect"
                onPress={() => {
                  hapticFeedback.selection();
                  router.push("/login");
                }}
                variant="secondary"
                style={styles.actionButton}
              >
                Ir a Iniciar Sesión
              </FormButton>

              <FormButton
                testID="account-register-redirect"
                onPress={() => {
                  hapticFeedback.selection();
                  router.push("/register");
                }}
                variant="secondary"
                style={styles.actionButton}
              >
                Ir a Registro
              </FormButton>
            </>
          )}

          {isAuthenticated && (
            <FormButton
              testID={authTestIds.account.logoutButton}
              onPress={onLogout}
              variant="danger"
              style={styles.logoutButton}
            >
              Cerrar Sesión
            </FormButton>
          )}
        </View>
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: designTokens.spacing.xxl,
  },
  card: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.xl,
    marginBottom: designTokens.spacing.lg,
  },
  actionsCard: {
    backgroundColor: designTokens.color.surface.secondary,
  },
  sectionTitle: {
    ...designTokens.typography.sectionTitle,
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.color.border.subtle,
  },
  infoLabel: {
    ...designTokens.typography.label,
    color: designTokens.color.ink.secondary,
  },
  infoValue: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.primary,
    fontWeight: "600",
  },
  tokenBox: {
    marginTop: designTokens.spacing.md,
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.color.surface.tertiary,
    borderRadius: designTokens.radius.md,
  },
  tokenLabel: {
    ...designTokens.typography.eyebrow,
    fontSize: 10,
    color: designTokens.color.ink.muted,
    marginBottom: 4,
  },
  tokenValue: {
    ...designTokens.typography.body,
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: designTokens.color.ink.secondary,
  },
  copy: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.secondary,
    marginBottom: designTokens.spacing.xl,
  },
  actionButton: {
    marginBottom: designTokens.spacing.md,
  },
  logoutButton: {
    marginTop: designTokens.spacing.sm,
  },
});
