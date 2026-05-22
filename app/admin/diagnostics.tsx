import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import {
  clearClientLogs,
  logClientEvent,
  useClientLogs,
} from "@/src/logging/clientLogger";
import { checkBackendHealth, HealthResponse } from "@/src/services/authService";
import { mobileSecondaryButton, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";

export default function DiagnosticsScreen() {
  const logs = useClientLogs();
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const onCheckBackend = async () => {
    setIsCheckingBackend(true);
    setBackendError(null);

    try {
      const health = await checkBackendHealth();
      setBackendHealth(health);
      logClientEvent("mobile.ui", "Backend health check succeeded", health);
    } catch (error: any) {
      const message = error?.message || "No fue posible comunicarse con el backend.";
      setBackendHealth(null);
      setBackendError(message);
      logClientEvent("mobile.ui", "Backend health check failed", { message }, "error");
    } finally {
      setIsCheckingBackend(false);
    }
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Diagnostico"
      title="Estado tecnico"
      description="Verifica backend y revisa los eventos recientes del cliente."
    >
      <View style={styles.card}>
        <Text style={styles.sectionEyebrow}>Backend</Text>
        <Text style={styles.sectionTitle}>Disponibilidad del servicio</Text>
        <Text style={styles.copy}>
          Usa esta verificacion para confirmar si el dispositivo alcanza correctamente el backend protegido.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Probar conexion con backend"
          onPress={onCheckBackend}
          disabled={isCheckingBackend}
          style={({ pressed }) => [
            styles.secondaryButton,
            isCheckingBackend && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {isCheckingBackend ? (
            <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
          ) : (
            <Text style={styles.secondaryButtonText}>Probar conexion con backend</Text>
          )}
        </Pressable>

        {backendHealth && (
          <View style={styles.successCard}>
            <Text style={styles.statusTitle}>Backend disponible</Text>
            <Text style={styles.statusText}>Status: {backendHealth.status}</Text>
            <Text style={styles.statusText}>Database: {backendHealth.database}</Text>
            <Text style={styles.statusText}>{backendHealth.timestamp}</Text>
          </View>
        )}

        {backendError && (
          <View style={styles.errorCard}>
            <Text style={styles.statusTitle}>No se pudo validar el backend</Text>
            <Text style={styles.statusText}>{backendError}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.logHeader}>
          <View style={styles.logHeaderText}>
            <Text style={styles.sectionEyebrow}>Visibilidad</Text>
            <Text style={styles.sectionTitle}>Logs recientes del cliente</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpiar logs"
            onPress={() => clearClientLogs()}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.clearButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Limpiar logs</Text>
          </Pressable>
        </View>

        {logs.length === 0 ? (
          <Text style={styles.copy}>Todavia no hay logs del cliente.</Text>
        ) : (
          logs.slice(0, 15).map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <Text style={styles.logMeta}>
                {log.timestamp} {log.level.toUpperCase()} {log.source}
              </Text>
              <Text style={styles.logCorrelation}>Correlation ID: {log.correlationId}</Text>
              <Text style={styles.logMessage}>{log.message}</Text>
              {Boolean(log.data) && (
                <Text style={styles.logData}>
                  {String(JSON.stringify(log.data, null, 2))}
                </Text>
              )}
            </View>
          ))
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
    marginBottom: 12,
  },
  secondaryButton: {
    ...mobileSecondaryButton,
    borderRadius: mobileTheme.radius.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  clearButton: {
    minWidth: 132,
  },
  secondaryButtonText: {
    color: designTokens.color.ink.accent,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  successCard: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    padding: 14,
  },
  errorCard: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    padding: 14,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    color: designTokens.color.ink.secondary,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 4,
  },
  logHeaderText: {
    flex: 1,
  },
  logEntry: {
    borderTopWidth: 1,
    borderTopColor: designTokens.color.border.subtle,
    paddingTop: 12,
    marginTop: 12,
  },
  logMeta: {
    fontSize: 11,
    color: designTokens.color.ink.muted,
    marginBottom: 4,
  },
  logCorrelation: {
    fontSize: 12,
    color: designTokens.color.ink.accent,
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
    marginBottom: 4,
  },
  logData: {
    fontSize: 12,
    lineHeight: 18,
    color: designTokens.color.ink.secondary,
  },
});
