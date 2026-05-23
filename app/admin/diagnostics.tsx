import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { Banner } from "@/src/components/shared/Banner";
import { FormButton } from "@/src/components/form/FormButton";
import { FormPanel } from "@/src/components/shared/FormPanel";
import {
  clearClientLogs,
  logClientEvent,
  useClientLogs,
} from "@/src/logging/clientLogger";
import { checkBackendHealth, HealthResponse } from "@/src/services/authService";
import { mobileTheme } from "@/src/design-system/mobileStyles";

export default function DiagnosticsScreen() {
  const logs = useClientLogs();
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const onCheckBackend = async () => {
    setIsCheckingBackend(true);
    setBackendError(null);
    setBackendHealth(null);

    try {
      const health = await checkBackendHealth();
      setBackendHealth(health);
      logClientEvent("mobile.ui", "Backend health check succeeded", health);
    } catch (error: any) {
      const message = error?.message || "No fue posible comunicarse con el backend.";
      setBackendError(message);
      logClientEvent("mobile.ui", "Backend health check failed", { message }, "error");
    } finally {
      setIsCheckingBackend(false);
    }
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Diagnóstico"
      title="Estado técnico"
      description="Verifica el backend y revisa los eventos recientes del cliente."
    >
      <FormPanel
        eyebrow="Backend"
        title="Disponibilidad del servicio"
        testID="diagnostics-backend-panel"
      >
        <FormButton
          variant="secondary"
          onPress={onCheckBackend}
          isLoading={isCheckingBackend}
          disabled={isCheckingBackend}
          testID="diagnostics-check-backend-btn"
          accessibilityLabel="Probar conexión con backend"
        >
          Probar conexión
        </FormButton>

        <Banner
          tone="error"
          message={backendError}
          testID="diagnostics-backend-error-banner"
        />

        {backendHealth && (
          <View style={styles.healthCard}>
            <Text style={styles.healthTitle}>Backend disponible</Text>
            <Text style={styles.healthRow}>
              <Text style={styles.healthLabel}>Estado: </Text>
              <Text style={styles.healthValue}>{backendHealth.status}</Text>
            </Text>
            <Text style={styles.healthRow}>
              <Text style={styles.healthLabel}>Base de datos: </Text>
              <Text style={styles.healthValue}>{backendHealth.database}</Text>
            </Text>
            <Text style={styles.healthRow}>
              <Text style={styles.healthLabel}>Verificado: </Text>
              <Text style={styles.healthValue}>{backendHealth.timestamp}</Text>
            </Text>
          </View>
        )}
      </FormPanel>

      <FormPanel
        eyebrow="Visibilidad"
        title="Logs recientes del cliente"
        testID="diagnostics-logs-panel"
        footer={
          <FormButton
            variant="secondary"
            onPress={() => clearClientLogs()}
            testID="diagnostics-clear-logs-btn"
            accessibilityLabel="Limpiar logs"
          >
            Limpiar
          </FormButton>
        }
      >
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay logs del cliente.</Text>
        ) : (
          logs.slice(0, 15).map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <Text style={styles.logMeta}>
                {log.timestamp} {log.level.toUpperCase()} {log.source}
              </Text>
              <Text style={styles.logCorrelation}>ID de correlación: {log.correlationId}</Text>
              <Text style={styles.logMessage}>{log.message}</Text>
              {Boolean(log.data) && (
                <Text style={styles.logData}>
                  {String(JSON.stringify(log.data, null, 2))}
                </Text>
              )}
            </View>
          ))
        )}
      </FormPanel>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  healthCard: {
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.success,
    borderRadius: designTokens.radius.md,
    padding: 12,
    gap: 4,
  },
  healthTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: designTokens.color.status.successText,
    marginBottom: 6,
  },
  healthRow: {
    fontSize: 13,
    lineHeight: 20,
  },
  healthLabel: {
    color: designTokens.color.ink.secondary,
    fontWeight: "600",
  },
  healthValue: {
    color: designTokens.color.ink.primary,
  },
  emptyText: {
    ...mobileTheme.typography.body,
    color: mobileTheme.colors.ink.secondary,
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
