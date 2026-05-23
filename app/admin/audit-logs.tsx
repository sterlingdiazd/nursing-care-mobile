// @generated-by: implementation-agent
// @pipeline-run: 2026-04-24-mobile-ux-audit
// @diffs: DIFF-ADMIN-AL-002
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import {
  searchAuditLogs,
  getAuditLogDetail,
  type AuditLogListItemDto,
  type AuditLogDetailDto,
} from "@/src/services/adminPortalService";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

function formatTimestamp(value: string) {
  return formatDateTimeES(value);
}

function roleLabel(role: string) {
  if (role === "ADMIN") return "Administrador";
  if (role === "CLIENT") return "Cliente";
  if (role === "NURSE") return "Enfermera";
  return role;
}

// Turn a PascalCase/snake_case backend code into readable words (fallback when not mapped).
function humanize(code: string): string {
  return code.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
}

// Backend action codes → Spanish labels (never show the raw code to the owner).
const ACTION_LABELS: Record<string, string> = {
  ResumeDeduction: "Cuota reanudada",
  PauseDeduction: "Cuota pausada",
  CreateDeduction: "Deducción creada",
  UpdateDeduction: "Deducción editada",
  DeleteDeduction: "Deducción eliminada",
  CreateAdjustment: "Ajuste creado",
  UpdateAdjustment: "Ajuste editado",
  DeleteAdjustment: "Ajuste eliminado",
  CreateScheduledDeduction: "Descuento fijo creado",
  PayoffScheduledDeduction: "Liquidación anticipada",
  CancelScheduledDeduction: "Descuento fijo anulado",
  RescheduleScheduledDeduction: "Descuento fijo reprogramado",
  SkipScheduledInstallment: "Cuota omitida",
  CreatePeriod: "Período creado",
  OpenPeriod: "Período abierto",
  ClosePeriod: "Período cerrado",
  GenerateReceipt: "Recibo generado",
  ReportPayment: "Pago reportado",
  AdminAccountCreated: "Cuenta admin creada",
  CareRequestApproved: "Solicitud aprobada",
  CareRequestRejected: "Solicitud rechazada",
  NurseProfileApproved: "Perfil aprobado",
  NurseProfileRejected: "Perfil rechazado",
};
function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? humanize(action);
}

const ENTITY_LABELS: Record<string, string> = {
  DeductionRecord: "Deducción",
  CompensationAdjustment: "Ajuste",
  ScheduledDeduction: "Descuento fijo",
  PayrollPeriod: "Período de nómina",
  CareRequest: "Solicitud",
  ServiceExecution: "Servicio",
  User: "Usuario",
  NurseProfile: "Perfil de enfermera",
  Client: "Cliente",
};
function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? humanize(entityType);
}

type AuditTone = "success" | "warning" | "danger" | "info";
function actionTone(action: string): AuditTone {
  const a = action.toLowerCase();
  if (/(delete|cancel|reject|payoff|close|anular)/.test(a)) return "danger";
  if (/(pause|skip|omit)/.test(a)) return "warning";
  if (/(create|approve|resume|open|generate|report)/.test(a)) return "success";
  return "info";
}
const TONE_COLOR: Record<AuditTone, string> = {
  success: designTokens.color.status.successText,
  warning: designTokens.color.status.warningText,
  danger: designTokens.color.status.dangerText,
  info: designTokens.color.ink.accent,
};

const PAGE_SIZE = 10;

export default function AdminAuditLogsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const isAdmin = roles.includes("ADMIN");
  const [items, setItems] = useState<AuditLogListItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Inline detail panel (replaces Modal)
  const [selectedDetail, setSelectedDetail] = useState<AuditLogDetailDto | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const load = async (
    page = pageNumber,
    nextActionFilter = actionFilter,
    nextEntityTypeFilter = entityTypeFilter,
  ) => {
    try {
      setError(null);
      const response = await searchAuditLogs({
        action: nextActionFilter || undefined,
        entityType: nextEntityTypeFilter || undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      setItems(response.items);
      setTotalCount(response.totalCount);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar registros de auditoria.");
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!isAdmin) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, isAdmin, pageNumber]);

  const handleSearch = () => {
    setPageNumber(1);
    void load(1);
  };

  const handleClearFilters = () => {
    const nextPageNumber = 1;
    setActionFilter("");
    setEntityTypeFilter("");
    setPageNumber(nextPageNumber);
    void load(nextPageNumber, "", "");
  };

  const handleViewDetail = async (id: string) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
      setSelectedDetail(null);
      return;
    }
    try {
      const detail = await getAuditLogDetail(id);
      setSelectedDetail(detail);
      setExpandedLogId(id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle.");
    }
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Auditoría"
      title="Registro de auditoría"
      description="Historial de eventos sensibles para seguimiento y cumplimiento."
      testID="admin-audit-logs-screen"
      nativeID="admin-audit-logs-screen"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      actions={(
        <Pressable
          style={styles.button}
          onPress={() => setShowFilters(!showFilters)}
          testID="admin-audit-logs-filter-toggle"
          nativeID="admin-audit-logs-filter-toggle"
          accessibilityRole="button"
          accessibilityLabel={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
        >
          <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
        </Pressable>
      )}
    >
      {!!error && (
        <Text
          style={styles.error}
          testID="admin-audit-logs-error"
          nativeID="admin-audit-logs-error"
        >
          {error}
        </Text>
      )}

      {showFilters && (
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros de búsqueda</Text>
          <TextInput
            style={styles.input}
            placeholder="Acción (ej: AdminAccountCreated)"
            placeholderTextColor={designTokens.color.ink.muted}
            value={actionFilter}
            onChangeText={setActionFilter}
            testID="admin-audit-logs-action-input"
            nativeID="admin-audit-logs-action-input"
            accessibilityLabel="Filtrar por tipo de acción"
          />
          <TextInput
            style={styles.input}
            placeholder="Tipo de entidad (ej: User)"
            placeholderTextColor={designTokens.color.ink.muted}
            value={entityTypeFilter}
            onChangeText={setEntityTypeFilter}
            testID="admin-audit-logs-entity-type-input"
            nativeID="admin-audit-logs-entity-type-input"
            accessibilityLabel="Filtrar por tipo de entidad"
          />
          <View style={styles.filterActions}>
            <Pressable
              style={styles.buttonPrimary}
              onPress={handleSearch}
              testID="admin-audit-logs-search-btn"
              nativeID="admin-audit-logs-search-btn"
              accessibilityRole="button"
              accessibilityLabel="Buscar registros de auditoría"
            >
              <Text style={styles.buttonPrimaryText}>Buscar</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={handleClearFilters}
              testID="admin-audit-logs-clear-btn"
              nativeID="admin-audit-logs-clear-btn"
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros de búsqueda"
            >
              <Text style={styles.buttonText}>Limpiar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total: {totalCount} registros</Text>
        <Text style={styles.summaryText}>Página: {pageNumber}</Text>
      </View>

      <View
        style={styles.list}
        testID="admin-audit-logs-list"
        nativeID="admin-audit-logs-list"
      >
        {items.map((item) => (
          <View key={item.id}>
            <Pressable
              style={[styles.row, expandedLogId === item.id && styles.rowExpanded]}
              onPress={() => void handleViewDetail(item.id)}
              testID={`admin-audit-log-card-${item.id}`}
              nativeID={`admin-audit-log-card-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${expandedLogId === item.id ? "Ocultar" : "Ver"} detalle de ${actionLabel(item.action)}`}
            >
              <View style={[styles.rail, { backgroundColor: TONE_COLOR[actionTone(item.action)] }]} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.action} numberOfLines={1}>{actionLabel(item.action)}</Text>
                  <Text style={styles.time}>{formatTimestamp(item.createdAtUtc)}</Text>
                </View>
                {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
                <Text style={styles.meta} numberOfLines={1}>
                  {(item.actorName || "Sistema")} · {roleLabel(item.actorRole)} · {entityLabel(item.entityType)}
                </Text>
              </View>
              <Text style={styles.chevron}>{expandedLogId === item.id ? "⌄" : "›"}</Text>
            </Pressable>

            {expandedLogId === item.id && selectedDetail && (
              <View
                style={styles.detailPanel}
                testID="admin-audit-log-detail-panel"
                nativeID="admin-audit-log-detail-panel"
              >
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>ID</Text>
                  <Text style={styles.detailValue}>{selectedDetail.id}</Text>
                </View>
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Fecha y hora</Text>
                  <Text style={styles.detailValue}>{formatTimestamp(selectedDetail.createdAtUtc)}</Text>
                </View>
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Actor</Text>
                  <Text style={styles.detailValue}>{selectedDetail.actorName || "Sistema"}</Text>
                  {selectedDetail.actorEmail && (
                    <Text style={styles.detailValueSecondary}>{selectedDetail.actorEmail}</Text>
                  )}
                </View>
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Rol del actor</Text>
                  <Text style={styles.detailValue}>{roleLabel(selectedDetail.actorRole)}</Text>
                </View>
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Acción</Text>
                  <Text style={styles.detailValue}>{selectedDetail.action}</Text>
                </View>
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Tipo de entidad</Text>
                  <Text style={styles.detailValue}>{selectedDetail.entityType}</Text>
                </View>
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>ID de entidad</Text>
                  <Text style={styles.detailValueMono}>{selectedDetail.entityId}</Text>
                </View>
                {selectedDetail.notes && (
                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Notas</Text>
                    <Text style={styles.detailValue}>{selectedDetail.notes}</Text>
                  </View>
                )}
                {selectedDetail.metadataJson && (
                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Metadata (JSON)</Text>
                    <View style={styles.jsonContainer}>
                      <Text style={styles.jsonText}>
                        {JSON.stringify(JSON.parse(selectedDetail.metadataJson), null, 2)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>

      {totalCount > PAGE_SIZE && (
        <View style={styles.pagination}>
          <Pressable
            style={[styles.button, pageNumber === 1 && styles.buttonDisabled]}
            onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber === 1}
            testID="admin-audit-logs-prev-btn"
            nativeID="admin-audit-logs-prev-btn"
            accessibilityRole="button"
            accessibilityLabel="Página anterior"
          >
            <Text style={styles.buttonText}>Anterior</Text>
          </Pressable>
          <Text style={styles.pageInfo}>Pagina {pageNumber}</Text>
          <Pressable
            style={[styles.button, pageNumber * PAGE_SIZE >= totalCount && styles.buttonDisabled]}
            onPress={() => setPageNumber((p) => p + 1)}
            disabled={pageNumber * PAGE_SIZE >= totalCount}
            testID="admin-audit-logs-next-btn"
            nativeID="admin-audit-logs-next-btn"
            accessibilityRole="button"
            accessibilityLabel="Página siguiente"
          >
            <Text style={styles.buttonText}>Siguiente</Text>
          </Pressable>
        </View>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: designTokens.color.border.strong },
  buttonText: { color: designTokens.color.ink.accent, fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: designTokens.color.ink.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  filtersCard: { ...mobileSurfaceCard, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 14, padding: 14, marginBottom: 8, color: designTokens.color.ink.primary },
  filterActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  summary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 },
  summaryText: { color: designTokens.color.ink.muted, fontSize: 14, fontWeight: "600" },
  list: { gap: 8 },
  row: {
    ...mobileSurfaceCard,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingRight: 12,
    overflow: "hidden",
  },
  rowExpanded: { borderColor: designTokens.color.border.accent },
  rail: { width: 4, alignSelf: "stretch", borderRadius: 2, marginRight: 12 },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  action: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 15, flex: 1 },
  time: { color: designTokens.color.ink.muted, fontSize: 11, fontWeight: "600" },
  notes: { color: designTokens.color.ink.secondary, fontSize: 13 },
  meta: { color: designTokens.color.ink.muted, fontSize: 12 },
  chevron: { color: designTokens.color.ink.muted, fontSize: 18, fontWeight: "700", marginLeft: 8 },
  detailPanel: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.accent, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 8, gap: 12 },
  pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingHorizontal: 4 },
  pageInfo: { color: designTokens.color.ink.muted, fontSize: 14, fontWeight: "600" },
  detailField: { gap: 4 },
  detailLabel: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  detailValueSecondary: { color: designTokens.color.ink.secondary, fontSize: 14 },
  detailValueMono: { color: designTokens.color.ink.primary, fontSize: 13, fontFamily: "monospace" },
  jsonContainer: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  jsonText: { color: designTokens.color.ink.primary, fontSize: 12, fontFamily: "monospace" },
});
