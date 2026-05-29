// @generated-by: implementation-agent
// @pipeline-run: 2026-04-24-mobile-ux-audit
// @diffs: DIFF-ADMIN-AL-002
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { hapticFeedback } from "@/src/utils/haptics";
import { FilterChips, type FilterChipOption } from "@/src/components/shared/FilterChips";
import { Pagination } from "@/src/components/shared/Pagination";
import { SwipePager } from "@/src/components/shared/SwipePager";
import { FormPanel } from "@/src/components/shared/FormPanel";

function formatTimestamp(value: string) {
  return formatDateTimeES(value);
}

function shortReference(value: string | null | undefined): string {
  if (!value) return "N/A";
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value) ? value.slice(0, 8).toUpperCase() : value;
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

function entityRoute(entityType: string, entityId: string | null | undefined): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "CareRequest":
      return `/(tabs)/care-requests/${entityId}`;
    case "Client":
      return `/admin/clients/${entityId}`;
    case "NurseProfile":
      return `/admin/nurse-profiles/${entityId}`;
    case "User":
      return `/admin/users/${entityId}`;
    case "PayrollPeriod":
      return `/admin/payroll/periods?periodId=${entityId}`;
    default:
      return null;
  }
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

// Chip filter options derived from known backend codes.
// Counts are not fetched (would require separate aggregate endpoints) — omitted intentionally.
const ALL_KEY = "" as const;

type ActionFilterKey = "" | "CreateDeduction" | "UpdateDeduction" | "DeleteDeduction" | "CreateAdjustment" | "DeleteAdjustment" | "CreatePeriod" | "ClosePeriod" | "CareRequestApproved" | "CareRequestRejected" | "NurseProfileApproved";
type EntityFilterKey = "" | "DeductionRecord" | "CompensationAdjustment" | "ScheduledDeduction" | "PayrollPeriod" | "CareRequest" | "NurseProfile" | "User";

const ACTION_FILTER_OPTIONS: ReadonlyArray<FilterChipOption<ActionFilterKey>> = [
  { key: ALL_KEY, label: "Todas" },
  { key: "CreateDeduction", label: "Deducciones" },
  { key: "CreateAdjustment", label: "Ajustes" },
  { key: "CreatePeriod", label: "Nómina" },
  { key: "CareRequestApproved", label: "Solicitudes" },
  { key: "NurseProfileApproved", label: "Perfiles" },
];

const ENTITY_FILTER_OPTIONS: ReadonlyArray<FilterChipOption<EntityFilterKey>> = [
  { key: ALL_KEY, label: "Todas" },
  { key: "DeductionRecord", label: "Deducción" },
  { key: "CompensationAdjustment", label: "Ajuste" },
  { key: "PayrollPeriod", label: "Nómina" },
  { key: "CareRequest", label: "Solicitud" },
  { key: "NurseProfile", label: "Perfil" },
];

export default function AdminAuditLogsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const isAdmin = roles.includes("ADMIN");
  const [items, setItems] = useState<AuditLogListItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Chip filters
  const [actionFilter, setActionFilter] = useState<ActionFilterKey>(ALL_KEY);
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityFilterKey>(ALL_KEY);

  // Inline detail panel
  const [selectedDetail, setSelectedDetail] = useState<AuditLogDetailDto | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selectedDetailReference = selectedDetail ? shortReference(selectedDetail.id) : "";
  const selectedEntityReference = selectedDetail ? shortReference(selectedDetail.entityId) : "";
  const selectedEntityRoute = selectedDetail ? entityRoute(selectedDetail.entityType, selectedDetail.entityId) : null;

  const load = async (
    page = pageNumber,
    nextActionFilter: ActionFilterKey = actionFilter,
    nextEntityTypeFilter: EntityFilterKey = entityTypeFilter,
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
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar registros de auditoría.");
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!isAdmin) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, isAdmin, pageNumber]);

  const handleActionFilter = (key: ActionFilterKey) => {
    setActionFilter(key);
    setPageNumber(1);
    void load(1, key, entityTypeFilter);
  };

  const handleEntityFilter = (key: EntityFilterKey) => {
    setEntityTypeFilter(key);
    setPageNumber(1);
    void load(1, actionFilter, key);
  };

  const handlePageChange = (page: number) => {
    setPageNumber(page);
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
      description="Historial de eventos sensibles."
      testID="admin-audit-logs-screen"
      nativeID="admin-audit-logs-screen"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
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

      <Text style={styles.filterLabel}>Acción</Text>
      <FilterChips
        options={ACTION_FILTER_OPTIONS}
        value={actionFilter}
        onChange={handleActionFilter}
        testIDPrefix="admin-audit-logs-action-filter"
      />

      <Text style={[styles.filterLabel, { marginTop: 10 }]}>Entidad</Text>
      <FilterChips
        options={ENTITY_FILTER_OPTIONS}
        value={entityTypeFilter}
        onChange={handleEntityFilter}
        testIDPrefix="admin-audit-logs-entity-filter"
      />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>{totalCount} registros</Text>
      </View>

      <SwipePager page={pageNumber} pageCount={totalPages} onPageChange={handlePageChange}>
      <View
        style={styles.list}
        testID="admin-audit-logs-list"
        nativeID="admin-audit-logs-list"
      >
        {items.length === 0 ? (
          <Text style={styles.emptyText}>Sin registros para los filtros seleccionados.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id}>
              <Pressable
                style={[styles.row, expandedLogId === item.id && styles.rowExpanded]}
                onPress={() => {
                  hapticFeedback.selection();
                  void handleViewDetail(item.id);
                }}
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
                <FormPanel
                  tone="accent"
                  testID="admin-audit-log-detail-panel"
                >
                  <DetailField label="Referencia" value={selectedDetailReference} mono />
                  <DetailField label="Fecha y hora" value={formatTimestamp(selectedDetail.createdAtUtc)} />
                  <DetailField
                    label="Actor"
                    value={selectedDetail.actorName || "Sistema"}
                    secondary={selectedDetail.actorEmail}
                  />
                  <DetailField label="Rol del actor" value={roleLabel(selectedDetail.actorRole)} />
                  <DetailField label="Acción" value={actionLabel(selectedDetail.action)} />
                  <DetailField label="Tipo de entidad" value={entityLabel(selectedDetail.entityType)} />
                  <DetailField label="Referencia de entidad" value={selectedEntityReference} mono />
                  <DetailField
                    label="Fuente"
                    value={selectedEntityRoute ? "Registro relacionado disponible" : "Referencia guardada en auditoría"}
                    secondary={selectedEntityRoute ? "Abre el detalle para revisar el origen." : undefined}
                  />
                  {selectedEntityRoute ? (
                    <Pressable
                      onPress={() => {
                        hapticFeedback.selection();
                        router.push(selectedEntityRoute as never);
                      }}
                      style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Abrir registro relacionado"
                      testID="admin-audit-open-source"
                      nativeID="admin-audit-open-source"
                    >
                      <Text style={styles.sourceButtonText}>Abrir registro relacionado</Text>
                    </Pressable>
                  ) : null}
                  {selectedDetail.notes ? (
                    <DetailField label="Notas" value={selectedDetail.notes} />
                  ) : null}
                  {selectedDetail.metadataJson ? (
                    <View style={styles.detailField}>
                      <Text style={styles.detailLabel}>Metadata (JSON)</Text>
                      <View style={styles.jsonContainer}>
                        <Text style={styles.jsonText}>
                          {JSON.stringify(JSON.parse(selectedDetail.metadataJson), null, 2)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </FormPanel>
              )}
            </View>
          ))
        )}
      </View>

      <Pagination
        currentPage={pageNumber}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        testID="admin-audit-logs-pagination"
      />
      </SwipePager>
    </MobileWorkspaceShell>
  );
}

function DetailField({ label, value, secondary, mono }: { label: string; value: string; secondary?: string | null; mono?: boolean }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={mono ? styles.detailValueMono : styles.detailValue}>{value}</Text>
      {secondary ? <Text style={styles.detailValueSecondary}>{secondary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  filterLabel: { fontSize: 11, fontWeight: "800", color: designTokens.color.ink.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  summary: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, marginBottom: 8, paddingHorizontal: 2 },
  summaryText: { color: designTokens.color.ink.muted, fontSize: 13, fontWeight: "600" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14, textAlign: "center", paddingVertical: 32 },
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
  detailField: { gap: 4 },
  detailLabel: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  detailValueSecondary: { color: designTokens.color.ink.secondary, fontSize: 14 },
  detailValueMono: { color: designTokens.color.ink.primary, fontSize: 13, fontFamily: "monospace" },
  sourceButton: {
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    borderColor: designTokens.color.border.accent,
    backgroundColor: designTokens.color.surface.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  sourceButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontWeight: "800",
  },
  jsonContainer: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  jsonText: { color: designTokens.color.ink.primary, fontSize: 12, fontFamily: "monospace" },
  pressed: { opacity: 0.78 },
});
