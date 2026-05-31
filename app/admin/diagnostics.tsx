import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { designTokens } from "@/src/design-system/tokens";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { Banner } from "@/src/components/shared/Banner";
import { FormButton } from "@/src/components/form/FormButton";
import { FormInput } from "@/src/components/form/FormInput";
import { FormPanel } from "@/src/components/shared/FormPanel";
import {
  clearClientLogs,
  logClientEvent,
  useClientLogs,
} from "@/src/logging/clientLogger";
import { checkBackendHealth, HealthResponse } from "@/src/services/authService";
import { mobileTheme } from "@/src/design-system/mobileStyles";
import {
  clearManualOverride,
  getDiagnostics,
  probeAndResolve,
  setManualOverride,
  subscribeToApiBaseUrlChange,
  type ApiDiagnostics,
  type DetectionSource,
} from "@/src/services/apiBaseUrl";

function sourceLabel(source: DetectionSource): string {
  switch (source) {
    case "manual-override":
      return "Sobrescritura manual";
    case "env-override":
      return "Variable de entorno";
    case "baked-tunnel":
      return "Túnel de demostración";
    case "debugger-host":
      return "IP del servidor Metro";
    case "linking-url":
      return "URL de Expo Linking";
    case "mdns-hostname":
      return "Hostname .local (mDNS)";
    case "last-known-good":
      return "Última URL en funcionamiento";
    case "localhost-fallback":
      return "Localhost (fallback)";
    default:
      return source;
  }
}

export default function DiagnosticsScreen() {
  const logs = useClientLogs();
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  // ----- API base URL diagnostics -----
  const [diagnostics, setDiagnostics] = useState<ApiDiagnostics>(getDiagnostics());
  const [overrideInput, setOverrideInput] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideNotice, setOverrideNotice] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [isClearingOverride, setIsClearingOverride] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToApiBaseUrlChange(() => {
      setDiagnostics(getDiagnostics());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (diagnostics.hasManualOverride && !overrideInput) {
      setOverrideInput(diagnostics.current.url);
    }
  }, [diagnostics.hasManualOverride, diagnostics.current.url, overrideInput]);

  const onProbe = useCallback(async () => {
    setIsProbing(true);
    setOverrideError(null);
    setOverrideNotice(null);
    try {
      const next = await probeAndResolve();
      setDiagnostics(getDiagnostics());
      setOverrideNotice(`URL activa: ${next.url} (${sourceLabel(next.source)})`);
      logClientEvent("mobile.api", "Manual probe", next);
    } catch (error: any) {
      setOverrideError(error?.message || "No fue posible probar los candidatos.");
    } finally {
      setIsProbing(false);
    }
  }, []);

  const onSaveOverride = useCallback(async () => {
    const value = overrideInput.trim();
    setOverrideError(null);
    setOverrideNotice(null);
    if (!value) {
      setOverrideError("Ingresa una URL.");
      return;
    }
    setIsSavingOverride(true);
    try {
      const next = await setManualOverride(value);
      setDiagnostics(getDiagnostics());
      setOverrideInput(next.url);
      setOverrideNotice(`Sobrescritura guardada. URL activa: ${next.url}`);
      logClientEvent("mobile.api", "Manual override saved", next);
    } catch (error: any) {
      setOverrideError(error?.message || "No fue posible guardar la sobrescritura.");
    } finally {
      setIsSavingOverride(false);
    }
  }, [overrideInput]);

  const onClearOverride = useCallback(async () => {
    setOverrideError(null);
    setOverrideNotice(null);
    setIsClearingOverride(true);
    try {
      const next = await clearManualOverride();
      setDiagnostics(getDiagnostics());
      setOverrideInput("");
      setOverrideNotice(`Sobrescritura eliminada. URL activa: ${next.url} (${sourceLabel(next.source)})`);
      logClientEvent("mobile.api", "Manual override cleared", next);
    } catch (error: any) {
      setOverrideError(error?.message || "No fue posible eliminar la sobrescritura.");
    } finally {
      setIsClearingOverride(false);
    }
  }, []);

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
      description="Verifica el backend, ajusta la URL del API y revisa los eventos recientes del cliente."
    >
      <FormPanel
        eyebrow="API"
        title="URL del API en uso"
        testID="diagnostics-api-panel"
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>URL activa: </Text>
            <Text style={styles.summaryMono}>{diagnostics.current.url}</Text>
          </Text>
          <Text style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fuente: </Text>
            <Text style={styles.summaryValue}>{sourceLabel(diagnostics.current.source)}</Text>
          </Text>
          {diagnostics.lastProbedAt ? (
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Última prueba: </Text>
              <Text style={styles.summaryValue}>{new Date(diagnostics.lastProbedAt).toLocaleString("es-DO")}</Text>
            </Text>
          ) : null}
          {diagnostics.lastKnownGood ? (
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Última URL OK guardada: </Text>
              <Text style={styles.summaryMono}>{diagnostics.lastKnownGood}</Text>
            </Text>
          ) : null}
        </View>

        <FormInput
          testID="diagnostics-api-override-input"
          label="Sobrescribir URL del API (uso en demo)"
          placeholder="http://192.168.0.10:5050 ó https://demo.tunnel.dev"
          value={overrideInput}
          onChangeText={setOverrideInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="URL manual del API"
        />

        <Banner tone="error" message={overrideError} testID="diagnostics-api-error" />
        <Banner tone="success" message={overrideNotice} testID="diagnostics-api-notice" />

        <View style={styles.actionsRow}>
          <FormButton
            variant="primary"
            onPress={onSaveOverride}
            isLoading={isSavingOverride}
            disabled={isSavingOverride}
            testID="diagnostics-api-save-override"
            accessibilityLabel="Guardar URL del API manual"
          >
            Guardar sobrescritura
          </FormButton>
          <FormButton
            variant="secondary"
            onPress={onProbe}
            isLoading={isProbing}
            disabled={isProbing}
            testID="diagnostics-api-probe"
            accessibilityLabel="Probar candidatos del API"
          >
            Probar candidatos
          </FormButton>
          {diagnostics.hasManualOverride ? (
            <FormButton
              variant="secondary"
              onPress={onClearOverride}
              isLoading={isClearingOverride}
              disabled={isClearingOverride}
              testID="diagnostics-api-clear-override"
              accessibilityLabel="Eliminar sobrescritura manual"
            >
              Eliminar
            </FormButton>
          ) : null}
        </View>

        {diagnostics.candidates.length > 0 ? (
          <View style={styles.candidatesBox}>
            <Text style={styles.candidatesHeader}>Resultados de la prueba</Text>
            {diagnostics.candidates.map((candidate) => (
              <View
                key={`${candidate.source}-${candidate.url}`}
                style={[styles.candidateRow, candidate.ok ? styles.candidateOk : styles.candidateFail]}
                testID={`diagnostics-candidate-${candidate.source}`}
                nativeID={`diagnostics-candidate-${candidate.source}`}
              >
                <Text style={styles.candidateSource}>{sourceLabel(candidate.source)}</Text>
                <Text style={styles.candidateUrl}>{candidate.url}</Text>
                <Text style={styles.candidateMeta}>
                  {candidate.ok
                    ? `OK · ${candidate.status ?? 200} · ${candidate.latencyMs} ms`
                    : `Falló · ${candidate.error ?? "sin detalle"} · ${candidate.latencyMs} ms`}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </FormPanel>

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
  summaryCard: {
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.xs,
  },
  summaryRow: {
    fontSize: designTokens.typography.label.fontSize,
    lineHeight: 20,
  },
  summaryLabel: {
    color: designTokens.color.ink.secondary,
    fontWeight: "700",
  },
  summaryValue: {
    color: designTokens.color.ink.primary,
    fontWeight: "700",
  },
  summaryMono: {
    color: designTokens.color.ink.accentStrong,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
  },
  candidatesBox: {
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
  },
  candidatesHeader: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
  },
  candidateRow: {
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.xs,
  },
  candidateOk: {
    backgroundColor: designTokens.color.surface.success,
    borderColor: designTokens.color.border.success,
  },
  candidateFail: {
    backgroundColor: designTokens.color.surface.danger,
    borderColor: designTokens.color.border.danger,
  },
  candidateSource: {
    fontWeight: "800",
    fontSize: designTokens.typography.label.fontSize,
    color: designTokens.color.ink.primary,
  },
  candidateUrl: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.accentStrong,
    fontFamily: "monospace",
  },
  candidateMeta: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.secondary,
  },
  healthCard: {
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.success,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    gap: designTokens.spacing.xs,
  },
  healthTitle: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.status.successText,
    marginBottom: designTokens.spacing.sm,
  },
  healthRow: {
    fontSize: designTokens.typography.label.fontSize,
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
    paddingTop: designTokens.spacing.md,
    marginTop: designTokens.spacing.md,
  },
  logMeta: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.xs,
  },
  logCorrelation: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.color.ink.accent,
    marginBottom: designTokens.spacing.xs,
  },
  logMessage: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "600",
    color: designTokens.color.ink.primary,
    marginBottom: designTokens.spacing.xs,
  },
  logData: {
    fontSize: designTokens.typography.caption.fontSize,
    lineHeight: 18,
    color: designTokens.color.ink.secondary,
  },
});
