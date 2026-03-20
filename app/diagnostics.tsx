import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import {
  clearClientLogs,
  logClientEvent,
  useClientLogs,
} from "@/src/logging/clientLogger";
import { checkBackendHealth, HealthResponse } from "@/src/services/authService";

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
      title="Comprueba backend, errores y trazas del cliente."
      description="La observabilidad se separa del acceso para que la experiencia normal no se mezcle con soporte y depuracion."
    >
      <View style={styles.card}>
        <Text style={styles.sectionEyebrow}>Backend</Text>
        <Text style={styles.sectionTitle}>Disponibilidad del servicio</Text>
        <Text style={styles.copy}>
          Usa esta verificacion para confirmar si el dispositivo alcanza correctamente el backend protegido.
        </Text>

        <Pressable
          onPress={onCheckBackend}
          disabled={isCheckingBackend}
          style={({ pressed }) => [
            styles.secondaryButton,
            isCheckingBackend && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {isCheckingBackend ? (
            <ActivityIndicator color="#1d4ed8" />
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
    backgroundColor: "#fffdf9",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe5f3",
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: "#2563eb",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#102a43",
    marginBottom: 10,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    color: "#52637a",
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: "#eef4ff",
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d7e3fb",
  },
  clearButton: {
    minWidth: 132,
  },
  secondaryButtonText: {
    color: "#163561",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  successCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 14,
  },
  errorCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 14,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#102a43",
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#36506c",
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
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    marginTop: 12,
  },
  logMeta: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  logCorrelation: {
    fontSize: 12,
    color: "#1d4ed8",
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  logData: {
    fontSize: 12,
    lineHeight: 18,
    color: "#334155",
  },
});
