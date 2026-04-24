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
import {
  searchAuditLogs,
  getAuditLogDetail,
  type AuditLogListItemDto,
  type AuditLogDetailDto,
} from "@/src/services/adminPortalService";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function roleLabel(role: string) {
  if (role === "ADMIN") return "Administrador";
  if (role === "CLIENT") return "Cliente";
  if (role === "NURSE") return "Enfermera";
  return role;
}

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
        pageSize: 20,
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
      actions={(
        <View style={styles.headerActions}>
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
          <Pressable
            style={styles.button}
            onPress={() => void load()}
            testID="admin-audit-logs-refresh-btn"
            nativeID="admin-audit-logs-refresh-btn"
            accessibilityRole="button"
            accessibilityLabel="Actualizar registros de auditoría"
          >
            <Text style={styles.buttonText}>Actualizar</Text>
          </Pressable>
        </View>
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
            <View
              style={styles.card}
              testID={`admin-audit-log-card-${item.id}`}
              nativeID={`admin-audit-log-card-${item.id}`}
            >
              <Text style={styles.timestamp}>{formatTimestamp(item.createdAtUtc)}</Text>
              <Text style={styles.actor}>{item.actorName || "Sistema"} · {roleLabel(item.actorRole)}</Text>
              <Text style={styles.action}>{item.action}</Text>
              <Text style={styles.entity}>{item.entityType} · {item.entityId.substring(0, 20)}...</Text>
              {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
              <Pressable
                style={styles.detailButton}
                onPress={() => void handleViewDetail(item.id)}
                testID={`admin-audit-log-detail-btn-${item.id}`}
                nativeID={`admin-audit-log-detail-btn-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={expandedLogId === item.id ? "Ocultar detalle del registro" : "Ver detalle del registro"}
              >
                <Text style={styles.detailButtonText}>
                  {expandedLogId === item.id ? "Ocultar detalle" : "Ver detalle"}
                </Text>
              </Pressable>
            </View>

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

      {totalCount > 20 && (
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
            style={[styles.button, pageNumber * 20 >= totalCount && styles.buttonDisabled]}
            onPress={() => setPageNumber((p) => p + 1)}
            disabled={pageNumber * 20 >= totalCount}
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
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: designTokens.color.border.strong },
  buttonText: { color: designTokens.color.ink.accent, fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: designTokens.color.ink.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  filtersCard: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 14, padding: 14, marginBottom: 8, color: designTokens.color.ink.primary },
  filterActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  summary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 },
  summaryText: { color: designTokens.color.ink.muted, fontSize: 14, fontWeight: "600" },
  list: { gap: 12 },
  card: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, shadowColor: designTokens.color.ink.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  timestamp: { color: designTokens.color.status.warningText, fontWeight: "800", fontSize: 12, marginBottom: 4 },
  actor: { color: designTokens.color.ink.muted, fontSize: 14, marginBottom: 4 },
  action: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 16, marginBottom: 4 },
  entity: { color: designTokens.color.ink.muted, fontSize: 13, fontFamily: "monospace", marginBottom: 4 },
  notes: { color: designTokens.color.ink.secondary, fontSize: 13, marginBottom: 8 },
  detailButton: { backgroundColor: designTokens.color.ink.accent, borderRadius: 12, paddingVertical: 8, marginTop: 8 },
  detailButtonText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
  detailPanel: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 8, gap: 12 },
  pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingHorizontal: 4 },
  pageInfo: { color: designTokens.color.ink.muted, fontSize: 14, fontWeight: "600" },
  detailField: { gap: 4 },
  detailLabel: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  detailValueSecondary: { color: designTokens.color.ink.secondary, fontSize: 14 },
  detailValueMono: { color: designTokens.color.ink.primary, fontSize: 13, fontFamily: "monospace" },
  jsonContainer: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  jsonText: { color: designTokens.color.ink.primary, fontSize: 12, fontFamily: "monospace" },
});
