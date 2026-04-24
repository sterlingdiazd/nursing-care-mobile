import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system";
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

interface ReportMetadata {
  key: string;
  label: string;
  description: string;
}

const REPORTS: ReportMetadata[] = [
  {
    key: "care-request-pipeline",
    label: "Estado de solicitudes",
    description: "Distribucion por estado (Pendiente, Aprobada, etc).",
  },
  {
    key: "assignment-approval-backlog",
    label: "Pendientes",
    description: "Mide el retraso en la gestion de solicitudes.",
  },
  {
    key: "nurse-onboarding",
    label: "Registro de enfermeras",
    description: "Seguimiento del embudo de registro personal.",
  },
  {
    key: "active-inactive-users",
    label: "Usuarios activos e inactivos",
    description: "Conteo de usuarios por rol y estado.",
  },
  {
    key: "nurse-utilization",
    label: "Productividad",
    description: "Tasa de cumplimiento por profesional.",
  },
  {
    key: "care-request-completion",
    label: "Servicios completados",
    description: "Analisis de cierre y tiempos de atencion.",
  },
  {
    key: "price-usage-summary",
    label: "Resumen de servicios",
    description: "Distribucion por tipo y complejidad.",
  },
  {
    key: "notification-volume",
    label: "Alertas y notificaciones",
    description: "Estadisticas de comunicacion y alertas.",
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
    void loadReportData();
  }, [selectedReportKey]);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const url = getAdminReportExportUrl(selectedReportKey, { from, to });
      const session = getCachedAuthSession();
      const token = session?.token;

      if (!token) throw new Error("No hay sesion activa para exportar.");

      const filename = `reporte-${selectedReportKey}-${Date.now()}.csv`;
      const fileUri = (FileSystem as any).documentDirectory + filename;

      const downloadRes = await (FileSystem as any).downloadAsync(url, fileUri, {
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reportList}>
            {REPORTS.map((report) => {
              const isActive = selectedReportKey === report.key;
              return (
                <Pressable
                  key={report.key}
                  style={[styles.reportCard, isActive && styles.reportCardActive]}
                  onPress={() => setSelectedReportKey(report.key)}
                  accessibilityRole="tab"
                  accessibilityLabel={`Reporte: ${report.label}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.reportLabel, isActive && styles.reportLabelActive]}>
                    {report.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
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

function MetricCard({ label, value, color = designTokens.color.ink.accentStrong }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function PipelineVisualizer({ data }: { data: CareRequestPipelineReportDto }) {
  return (
    <View style={styles.grid}>
      <MetricCard label="Pendientes" value={data.pendingCount} />
      <MetricCard label="Aprobadas" value={data.approvedCount} />
      <MetricCard label="Completadas" value={data.completedCount} color={designTokens.color.status.successText} />
      <MetricCard label="Rechazadas" value={data.rejectedCount} color={designTokens.color.ink.danger} />
      <MetricCard label="Sin asignar" value={data.unassignedCount} color={designTokens.color.status.warningText} />
      <MetricCard label="Vencidas" value={data.overdueCount} color={designTokens.color.status.dangerText} />
    </View>
  );
}

function BacklogVisualizer({ data }: { data: AssignmentApprovalBacklogReportDto }) {
  return (
    <View style={styles.stack}>
      <MetricCard label="Sin enfermera" value={data.pendingUnassignedCount} color={designTokens.color.status.warningText} />
      <MetricCard label="Esperando aprobacion" value={data.pendingAssignedAwaitingApprovalCount} color={designTokens.color.ink.accent} />
      <MetricCard label="Dias promedio espera" value={`${data.averageDaysPending.toFixed(1)}`} />
    </View>
  );
}

function OnboardingVisualizer({ data }: { data: NurseOnboardingReportDto }) {
  return (
    <View style={styles.grid}>
      <MetricCard label="Total registradas" value={data.totalRegisteredCount} />
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
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Enfermera</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Comp.</Text>
        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>%</Text>
      </View>
      {data.rows.slice(0, 10).map((row) => (
        <View key={row.nurseId} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{row.nurseName}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{row.completed}</Text>
          <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>
            {(row.completionRate * 100).toFixed(0)}%
          </Text>
        </View>
      ))}
      {data.rows.length > 10 && (
        <Text style={styles.tableNote}>Mostrando top 10 resultados.</Text>
      )}
    </View>
  );
}

function CompletionVisualizer({ data }: { data: CareRequestCompletionReportDto }) {
  return (
    <View style={styles.stack}>
      <MetricCard label="Total completadas" value={data.totalCompletedCount} color={designTokens.color.status.successText} />
      <MetricCard label="Cierre promedio (dias)" value={data.averageDaysToComplete.toFixed(1)} />

      <Text style={styles.subTitle}>Tendencia por periodo</Text>
      <View style={styles.table}>
        {Object.entries(data.completionsByRange).map(([range, count]) => (
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
        {data.topRequestTypes.map((row) => (
          <View key={row.requestType} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{row.requestType}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right", fontWeight: "700" }]}>
              ${(row.totalRevenue / 1000).toFixed(1)}k
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.subTitle}>Complejidad común</Text>
      <View style={styles.chipCloud}>
        {data.topComplexityLevels.map(c => (
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
        <MetricCard label="Total" value={data.totalNotificationsCount} />
        <MetricCard label="Sin leer" value={data.unreadNotificationsCount} color={designTokens.color.status.warningText} />
        <MetricCard label="Pendientes" value={data.pendingActionItemsCount} color={designTokens.color.ink.danger} />
      </View>

      <Text style={styles.subTitle}>Por categoria</Text>
      <View style={styles.table}>
        {Object.entries(data.notificationsByCategory).map(([cat, count]) => (
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
  reportList: { flexDirection: "row" },
  reportCard: { backgroundColor: designTokens.color.ink.inverse, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: designTokens.color.border.strong, marginRight: 10, minWidth: 120, alignItems: "center" },
  reportCardActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  reportLabel: { fontSize: 14, fontWeight: "600", color: designTokens.color.ink.primary },
  reportLabelActive: { color: designTokens.color.ink.inverse },
  dataContainer: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 22, padding: 20, minHeight: 400, shadowColor: designTokens.color.ink.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 2, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  reportTitle: { fontSize: 20, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 4 },
  reportDescription: { fontSize: 13, color: designTokens.color.ink.muted, marginBottom: 24, lineHeight: 18 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  loaderText: { marginTop: 12, color: designTokens.color.ink.muted, fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stack: { gap: 12 },
  metricCard: { backgroundColor: designTokens.color.surface.primary, borderRadius: 16, padding: 16, flex: 1, minWidth: "45%", borderWidth: 1, borderColor: designTokens.color.border.subtle },
  metricLabel: { fontSize: 11, fontWeight: "700", color: designTokens.color.ink.muted, textTransform: "uppercase", marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: "800", color: designTokens.color.ink.primary },
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
