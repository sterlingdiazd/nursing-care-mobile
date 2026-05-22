import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { useToast } from "@/src/components/shared/ToastProvider";
import {
  getAdminReport,
  getAdminReportExportUrl,
  type AdminReportResponseDto,
  type CareRequestPipelineReportDto,
  type AssignmentApprovalBacklogReportDto,
  type NurseOnboardingReportDto,
  type ActiveInactiveUsersReportDto,
  type NurseUtilizationReportDto,
  type CareRequestCompletionReportDto,
  type PriceUsageSummaryReportDto,
  type NotificationVolumeReportDto,
} from "@/src/services/adminPortalService";
import { getCachedAuthSession } from "@/src/services/authSession";
import { MetricCard } from "@/src/components/shared/MetricCard";
import { SelectRow, PickerSheet, PickerOption } from "@/components/payroll/FormModalScaffold";

interface ReportMetadata {
  key: string;
  label: string;
  description: string;
}

// Decision-driving reports surfaced to the owner. Low-value count-only reports (onboarding,
// active/inactive users, notification volume) are intentionally not listed; revenue mix lives in
// the Finanzas dashboard. The backend keys still exist if needed.
const REPORTS: ReportMetadata[] = [
  {
    key: "care-request-pipeline",
    label: "Estado de solicitudes",
    description: "Qué requiere acción ahora: vencidas y sin asignar.",
  },
  {
    key: "assignment-approval-backlog",
    label: "Pendientes",
    description: "Cuánto tardas en asignar y aprobar (espera promedio).",
  },
  {
    key: "nurse-utilization",
    label: "Productividad",
    description: "Utilización por enfermera y capacidad ociosa.",
  },
  {
    key: "care-request-completion",
    label: "Servicios completados",
    description: "Throughput y tiempo de cierre en el tiempo.",
  },
  {
    key: "price-usage-summary",
    label: "Resumen de servicios",
    description: "Distribucion por tipo y complejidad.",
  },
];

export default function AdminReportsScreen() {
  const { isReady, isAuthenticated, roles } = useAuth();
  const { showToast } = useToast();
  const [selectedReportKey, setSelectedReportKey] = useState<string>(REPORTS[0].key);
  const [data, setData] = useState<AdminReportResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReportPicker, setShowReportPicker] = useState(false);

  // For mobile, default to last 30 days if empty
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const selectedReport = useMemo(
    () => REPORTS.find((r) => r.key === selectedReportKey) || REPORTS[0],
    [selectedReportKey]
  );

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated || !roles.includes("ADMIN")) {
      router.replace("/" as any);
      return;
    }
  }, [isReady, isAuthenticated, roles]);

  const loadReportData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminReport(selectedReportKey, { from, to });
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar el reporte.";
      setError(message);
      showToast({ variant: "error", message });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    void loadReportData();
  }, [isReady, isAuthenticated, selectedReportKey]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const url = getAdminReportExportUrl(selectedReportKey, { from, to });
      const session = getCachedAuthSession();
      const token = session?.token;

      if (!token) throw new Error("No hay sesion activa para exportar.");

      const filename = `reporte-${selectedReportKey}-${Date.now()}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
          showToast({ variant: "success", message: "Archivo exportado correctamente." });
        } else {
          // Sharing unavailable is informational, not a destructive action — use toast
          showToast({ variant: "info", message: "El archivo se descargó pero compartir no está disponible." });
        }
      } else {
        throw new Error("No fue posible descargar el archivo de exportacion.");
      }
    } catch (err) {
      showToast({ variant: "error", message: err instanceof Error ? err.message : "Error desconocido al exportar." });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Reportes"
      title="Inteligencia operativa"
      description="Visualiza indicadores clave con una presentacion mas clara y consistente."
      actions={
        <Pressable
          style={[styles.exportButton, isExporting && styles.disabledButton]}
          onPress={handleExport}
          disabled={isExporting}
          accessibilityRole="button"
          accessibilityLabel="Exportar reporte en formato CSV"
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={designTokens.color.ink.inverse} accessibilityLabel="Cargando..." />
          ) : (
            <Text style={styles.exportButtonText}>Exportar CSV</Text>
          )}
        </Pressable>
      }
    >
      <View style={styles.container}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.selectorContainer}>
          <Text style={styles.sectionTitle}>Tipo de reporte</Text>
          <SelectRow
            value={selectedReport.label}
            placeholder="Selecciona un reporte"
            onPress={() => setShowReportPicker(true)}
            testID="report-type-select"
            accessibilityLabel="Seleccionar tipo de reporte"
          />
        </View>

        <View style={styles.dataContainer}>
          <Text style={styles.reportTitle}>{selectedReport.label}</Text>
          <Text style={styles.reportDescription}>{selectedReport.description}</Text>

          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
              <Text style={styles.loaderText}>Cargando datos...</Text>
            </View>
          ) : data ? (
            <ReportVisualizer reportKey={selectedReportKey} data={data} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay datos para mostrar.</Text>
            </View>
          )}
        </View>
      </View>

      <PickerSheet visible={showReportPicker} title="Tipo de reporte" onClose={() => setShowReportPicker(false)}>
        {REPORTS.map((report) => (
          <PickerOption
            key={report.key}
            title={report.label}
            subtitle={report.description}
            selected={selectedReportKey === report.key}
            onPress={() => { setSelectedReportKey(report.key); setShowReportPicker(false); }}
            testID={`report-option-${report.key}`}
            accessibilityLabel={`Reporte: ${report.label}`}
          />
        ))}
      </PickerSheet>
    </MobileWorkspaceShell>
  );
}

function ReportVisualizer({ reportKey, data }: { reportKey: string; data: AdminReportResponseDto }) {
  switch (reportKey) {
    case "care-request-pipeline":
      return <PipelineVisualizer data={data as CareRequestPipelineReportDto} />;
    case "assignment-approval-backlog":
      return <BacklogVisualizer data={data as AssignmentApprovalBacklogReportDto} />;
    case "nurse-onboarding":
      return <OnboardingVisualizer data={data as NurseOnboardingReportDto} />;
    case "active-inactive-users":
      return <UsersVisualizer data={data as ActiveInactiveUsersReportDto} />;
    case "nurse-utilization":
      return <UtilizationVisualizer data={data as NurseUtilizationReportDto} />;
    case "care-request-completion":
      return <CompletionVisualizer data={data as CareRequestCompletionReportDto} />;
    case "price-usage-summary":
      return <PriceVisualizer data={data as PriceUsageSummaryReportDto} />;
    case "notification-volume":
      return <NotificationsVisualizer data={data as NotificationVolumeReportDto} />;
    default:
      return <Text>Visualizador no implementado</Text>;
  }
}

type InsightTone = "success" | "warning" | "danger" | "info";

function ReportInsight({ tone, text }: { tone: InsightTone; text: string }) {
  const palette = {
    success: { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText },
    warning: { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText },
    danger: { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText },
    info: { bg: designTokens.color.surface.accent, fg: designTokens.color.ink.accentStrong },
  }[tone];
  return (
    <View style={[styles.insight, { backgroundColor: palette.bg, borderLeftColor: palette.fg }]}>
      <Text style={[styles.insightText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

function PipelineVisualizer({ data }: { data: CareRequestPipelineReportDto }) {
  const total = data.pendingCount + data.approvedCount + data.completedCount + data.rejectedCount;
  const completionRate = total > 0 ? Math.round((data.completedCount / total) * 100) : 0;
  const insight = data.overdueCount > 0
    ? { tone: "danger" as const, text: `${data.overdueCount} vencida(s)${data.unassignedCount > 0 ? ` y ${data.unassignedCount} sin asignar` : ""} requieren acción ahora.` }
    : data.unassignedCount > 0
      ? { tone: "warning" as const, text: `${data.unassignedCount} solicitud(es) sin asignar — asígnalas para no acumular retraso.` }
      : { tone: "success" as const, text: `Sin vencidas ni sin asignar. Tasa de completadas: ${completionRate}%.` };
  return (
    <View>
      <ReportInsight tone={insight.tone} text={insight.text} />
      <View style={styles.grid}>
        <MetricCard label="Pendientes" value={data.pendingCount} color={designTokens.color.ink.accentStrong} />
        <MetricCard label="Aprobadas" value={data.approvedCount} color={designTokens.color.ink.accentStrong} />
        <MetricCard label="Completadas" value={data.completedCount} color={designTokens.color.status.successText} />
        <MetricCard label="Rechazadas" value={data.rejectedCount} color={designTokens.color.ink.danger} />
        <MetricCard label="Sin asignar" value={data.unassignedCount} color={designTokens.color.status.warningText} />
        <MetricCard label="Vencidas" value={data.overdueCount} color={designTokens.color.status.dangerText} />
      </View>
    </View>
  );
}

function BacklogVisualizer({ data }: { data: AssignmentApprovalBacklogReportDto }) {
  const days = data.averageDaysPending ?? 0;
  const waiting = data.pendingUnassignedCount + data.pendingAssignedAwaitingApprovalCount;
  const tone: InsightTone = waiting === 0 ? "success" : days >= 4 ? "danger" : days >= 2 ? "warning" : "info";
  const text = waiting === 0
    ? "Sin solicitudes en espera. Gestión al día."
    : `${waiting} en espera · ${days.toFixed(1)} días promedio. ${data.pendingUnassignedCount} por asignar y ${data.pendingAssignedAwaitingApprovalCount} por aprobar.`;
  return (
    <View style={styles.stack}>
      <ReportInsight tone={tone} text={text} />
      <MetricCard label="Sin enfermera" value={data.pendingUnassignedCount} color={designTokens.color.status.warningText} />
      <MetricCard label="Esperando aprobacion" value={data.pendingAssignedAwaitingApprovalCount} color={designTokens.color.ink.accent} />
      <MetricCard label="Dias promedio espera" value={`${days.toFixed(1)}`} color={designTokens.color.ink.accentStrong} />
    </View>
  );
}

function OnboardingVisualizer({ data }: { data: NurseOnboardingReportDto }) {
  return (
    <View style={styles.grid}>
      <MetricCard label="Total registradas" value={data.totalRegisteredCount} color={designTokens.color.ink.accentStrong} />
      <MetricCard label="En revision" value={data.pendingReviewCount} color={designTokens.color.status.warningText} />
      <MetricCard label="Activas" value={data.activeCount} color={designTokens.color.status.successText} />
      <MetricCard label="Inactivas" value={data.inactiveCount} color={designTokens.color.ink.muted} />
      <MetricCard label="Exito periodo" value={data.completedThisPeriodCount} color={designTokens.color.ink.accentStrong} />
    </View>
  );
}

function UsersVisualizer({ data }: { data: ActiveInactiveUsersReportDto }) {
  const rows = [
    { label: "Admin", active: data.adminActiveCount, inactive: data.adminInactiveCount },
    { label: "Cliente", active: data.clientActiveCount, inactive: data.clientInactiveCount },
    { label: "Enfermera", active: data.nurseActiveCount, inactive: data.nurseInactiveCount },
  ];

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Perfil</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Act.</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Inact.</Text>
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2, fontWeight: "600" }]}>{row.label}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "center", color: designTokens.color.status.successText }]}>{row.active}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "center", color: designTokens.color.ink.muted }]}>{row.inactive}</Text>
        </View>
      ))}
    </View>
  );
}

function UtilizationVisualizer({ data }: { data: NurseUtilizationReportDto }) {
  const rows = data.rows ?? [];
  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + (r.completionRate ?? 0), 0) / rows.length) * 100) : 0;
  const idle = rows.filter((r) => (r.completionRate ?? 0) < 0.6).length;
  const tone: InsightTone = rows.length === 0 ? "info" : idle > 0 ? "warning" : "success";
  const text = rows.length === 0
    ? "Sin datos de enfermeras en el período."
    : idle > 0
      ? `Utilización promedio ${avg}%. ${idle} enfermera(s) por debajo de 60% — capacidad ociosa disponible.`
      : `Utilización promedio ${avg}%. Equipo bien aprovechado.`;
  return (
    <View>
      <ReportInsight tone={tone} text={text} />
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Enfermera</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Comp.</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>%</Text>
      </View>
      {(data.rows ?? []).slice(0, 10).map((row) => (
        <View key={row.nurseId} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{row.nurseName}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{row.completed}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>
            {((row.completionRate ?? 0) * 100).toFixed(0)}%
          </Text>
        </View>
      ))}
        {(data.rows?.length ?? 0) > 10 && (
          <Text style={styles.tableNote}>Mostrando top 10 resultados.</Text>
        )}
      </View>
    </View>
  );
}

function CompletionVisualizer({ data }: { data: CareRequestCompletionReportDto }) {
  const days = data.averageDaysToComplete ?? 0;
  const tone: InsightTone = data.totalCompletedCount === 0 ? "info" : days >= 5 ? "warning" : "success";
  const text = data.totalCompletedCount === 0
    ? "Sin servicios completados en el período."
    : `${data.totalCompletedCount} completadas · cierre promedio ${days.toFixed(1)} días.`;
  return (
    <View style={styles.stack}>
      <ReportInsight tone={tone} text={text} />
      <MetricCard label="Total completadas" value={data.totalCompletedCount} color={designTokens.color.status.successText} />
      <MetricCard label="Cierre promedio (dias)" value={days.toFixed(1)} color={designTokens.color.ink.accentStrong} />

      <Text style={styles.subTitle}>Tendencia por periodo</Text>
      <View style={styles.table}>
        {Object.entries(data.completionsByRange ?? {}).map(([range, count]) => (
          <View key={range} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>{range}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PriceVisualizer({ data }: { data: PriceUsageSummaryReportDto }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.subTitle}>Ingresos por tipo de servicio</Text>
      <View style={styles.table}>
        {(data.topRequestTypes ?? []).map((row) => (
          <View key={row.requestType} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{row.requestType}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>
              ${((row.totalRevenue ?? 0) / 1000).toFixed(1)}k
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.subTitle}>Complejidad común</Text>
      <View style={styles.chipCloud}>
        {(data.topComplexityLevels ?? []).map(c => (
          <View key={c} style={styles.chip}><Text style={styles.chipText}>{c}</Text></View>
        ))}
      </View>
    </View>
  );
}

function NotificationsVisualizer({ data }: { data: NotificationVolumeReportDto }) {
  return (
    <View style={styles.stack}>
      <View style={styles.grid}>
        <MetricCard label="Total" value={data.totalNotificationsCount} color={designTokens.color.ink.accentStrong} />
        <MetricCard label="Sin leer" value={data.unreadNotificationsCount} color={designTokens.color.status.warningText} />
        <MetricCard label="Pendientes" value={data.pendingActionItemsCount} color={designTokens.color.ink.danger} />
      </View>

      <Text style={styles.subTitle}>Por categoria</Text>
      <View style={styles.table}>
        {Object.entries(data.notificationsByCategory ?? {}).map(([cat, count]) => (
          <View key={cat} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{cat}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>{count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  selectorContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: designTokens.color.ink.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  dataContainer: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 22, padding: 20, minHeight: 400, boxShadow: "0px 6px 14px rgba(18, 48, 68, 0.06)", elevation: 2, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  reportTitle: { fontSize: 20, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 4 },
  reportDescription: { fontSize: 13, color: designTokens.color.ink.muted, marginBottom: 24, lineHeight: 18 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  loaderText: { marginTop: 12, color: designTokens.color.ink.muted, fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stack: { gap: 12 },
  insight: { borderRadius: 12, padding: 14, borderLeftWidth: 4, marginBottom: 14 },
  insightText: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  table: { borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 12, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: designTokens.color.surface.primary, padding: 12, borderBottomWidth: 1, borderBottomColor: designTokens.color.border.subtle },
  tableHeaderText: { fontSize: 11, fontWeight: "700", color: designTokens.color.ink.muted, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", padding: 12, borderBottomWidth: 1, borderBottomColor: designTokens.color.surface.canvas },
  tableCell: { fontSize: 14, color: designTokens.color.ink.secondary },
  tableNote: { fontSize: 11, color: designTokens.color.ink.muted, textAlign: "center", padding: 10, fontStyle: "italic" },
  subTitle: { fontSize: 15, fontWeight: "700", color: designTokens.color.ink.primary, marginTop: 16, marginBottom: 8 },
  chipCloud: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: designTokens.color.ink.inverse, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: designTokens.color.border.strong },
  chipText: { fontSize: 12, fontWeight: "600", color: designTokens.color.ink.secondary },
  exportButton: { backgroundColor: designTokens.color.ink.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  exportButtonText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 13 },
  disabledButton: { opacity: 0.6 },
  errorText: { color: designTokens.color.ink.danger, marginBottom: 12, textAlign: "center" },
});
