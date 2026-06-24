import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { logClientEvent } from "@/src/logging/clientLogger";
import { useToast } from "@/src/components/shared/ToastProvider";
import {
  getGoogleOAuthAvailability,
  getGoogleOAuthStartUrl,
  getLocalHttpsCertificateWarning,
} from "@/src/services/authService";
import { authTestIds } from "@/src/testing/authTestIds";
import { formatRoleLabels } from "@/src/utils/roleLabels";
import { hapticFeedback } from "@/src/utils/haptics";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { FormButton } from "@/src/components/form";

export default function AccountScreen() {
  const router = useRouter();
  const { email, isAuthenticated, logout, roles } = useAuth();
  const { showToast } = useToast();
  // Only offer the Google button when the provider is configured server-side — otherwise
  // tapping it would navigate to a 400 ("Google OAuth no está configurado").
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void getGoogleOAuthAvailability().then((available) => {
      if (active) setGoogleAvailable(available);
    });
    return () => {
      active = false;
    };
  }, []);

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
    router.replace("/login");
  };

  return (
    <MobileWorkspaceShell
      testID={authTestIds.account.screenRoot}
      nativeID={authTestIds.account.screenRoot}
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
        </View>

        {isAuthenticated && roles.includes("CLIENT") ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tu cuidado</Text>
            <Pressable
              testID={authTestIds.account.profileLink}
              nativeID={authTestIds.account.profileLink}
              accessibilityRole="button"
              accessibilityLabel="Abrir mi perfil"
              onPress={() => {
                hapticFeedback.selection();
                router.push("/client-profile" as never);
              }}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            >
              <View>
                <Text style={styles.linkTitle}>Mi perfil</Text>
                <Text style={styles.linkBody}>Datos personales y contacto de emergencia.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <Pressable
              testID={authTestIds.account.notificationsLink}
              nativeID={authTestIds.account.notificationsLink}
              accessibilityRole="button"
              accessibilityLabel="Abrir avisos"
              onPress={() => {
                hapticFeedback.selection();
                router.push("/client-notifications" as never);
              }}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            >
              <View>
                <Text style={styles.linkTitle}>Avisos</Text>
                <Text style={styles.linkBody}>Cambios importantes de tus solicitudes.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.card, styles.actionsCard]}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <Text style={styles.copy}>
            Gestiona tu acceso utilizando los servicios vinculados o cambia de cuenta.
          </Text>

          {googleAvailable && (
            <FormButton
              testID={authTestIds.account.googleButton}
              onPress={onGoogleLogin}
              variant="secondary"
              style={styles.actionButton}
            >
              {isAuthenticated ? "Cambiar cuenta con Google" : "Continuar con Google"}
            </FormButton>
          )}

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
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
  },
  linkTitle: {
    ...designTokens.text.bodyStrong,
  },
  linkBody: {
    ...designTokens.text.caption,
    marginTop: designTokens.spacing.xs,
  },
  chevron: {
    ...designTokens.text.title,
    color: designTokens.color.ink.muted,
    fontWeight: "400",
  },
  pressed: {
    opacity: 0.75,
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
