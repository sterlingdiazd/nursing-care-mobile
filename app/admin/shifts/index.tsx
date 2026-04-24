// @generated-by: implementation-agent
// @pipeline-run: 2026-04-24-mobile-ux-audit
// @diffs: DIFF-ADMIN-SHF-003
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  listAdminShifts,
  getAdminShiftDetail,
  getAdminShiftChanges,
  type ShiftListItemDto,
  type ShiftDetailDto,
  type ShiftChangeHistoryItemDto,
  type ShiftRecordStatus,
} from "@/src/services/adminShiftsService";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: ShiftRecordStatus): string {
  switch (status) {
    case "Planned": return "Planificado";
    case "Completed": return "Completado";
    case "Changed": return "Cambiado";
    case "Cancelled": return "Cancelado";
  }
}

function statusBadgeColors(status: ShiftRecordStatus): { bg: string; text: string } {
  switch (status) {
    case "Planned": return { bg: designTokens.color.status.infoBg, text: designTokens.color.ink.accentStrong };
    case "Completed": return { bg: designTokens.color.surface.success, text: designTokens.color.status.successText };
    case "Changed": return { bg: designTokens.color.surface.warning, text: designTokens.color.status.warningText };
    case "Cancelled": return { bg: designTokens.color.surface.danger, text: designTokens.color.status.dangerText };
  }
}

type StatusFilter = "all" | ShiftRecordStatus;

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Planificados", value: "Planned" },
  { label: "Completados", value: "Completed" },
  { label: "Cambiados", value: "Changed" },
  { label: "Cancelados", value: "Cancelled" },
];

export default function AdminShiftsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const isAdmin = roles.includes("ADMIN");

  const [items, setItems] = useState<ShiftListItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Inline detail panel (replaces Modal)
  const [selectedShift, setSelectedShift] = useState<ShiftDetailDto | null>(null);
  const [shiftChanges, setShiftChanges] = useState<ShiftChangeHistoryItemDto[]>([]);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  const load = async (
    page = pageNumber,
    nextStartDateFilter = startDateFilter,
    nextEndDateFilter = endDateFilter,
    nextStatusFilter = statusFilter,
  ) => {
    try {
      setError(null);
      setLoading(true);
      const result = await listAdminShifts({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        startDate: nextStartDateFilter || undefined,
        endDate: nextEndDateFilter || undefined,
        status: nextStatusFilter !== "all" ? nextStatusFilter : undefined,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar los turnos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!isAdmin) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, isAdmin, pageNumber, statusFilter]);

  const handleSearch = () => {
    setPageNumber(1);
    void load(1);
  };

  const handleClearFilters = () => {
    const nextPageNumber = 1;
    const nextStatusFilter: StatusFilter = "all";
    setStartDateFilter("");
    setEndDateFilter("");
    setStatusFilter(nextStatusFilter);
    setPageNumber(nextPageNumber);
    void load(nextPageNumber, "", "", nextStatusFilter);
  };

  const handleViewDetail = async (id: string) => {
    if (expandedShiftId === id) {
      setExpandedShiftId(null);
      setSelectedShift(null);
      setShiftChanges([]);
      return;
    }
    try {
      setDetailLoadingId(id);
      setExpandedShiftId(id);
      const [detail, changes] = await Promise.all([
        getAdminShiftDetail(id),
        getAdminShiftChanges(id),
      ]);
      setSelectedShift(detail);
      setShiftChanges(changes);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle del turno.");
      setExpandedShiftId(null);
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Administración"
      title="Turnos"
      description="Gestiona los turnos de enfermeras asignados."
      testID="admin-shifts-screen"
      nativeID="admin-shifts-screen"
      actions={(
        <View style={styles.headerActions}>
          <Pressable
            style={styles.button}
            onPress={() => setShowFilters(!showFilters)}
            testID="admin-shifts-filter-toggle"
            nativeID="admin-shifts-filter-toggle"
            accessibilityRole="button"
            accessibilityLabel={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          >
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => void load()}
            testID="admin-shifts-refresh-btn"
            nativeID="admin-shifts-refresh-btn"
            accessibilityRole="button"
            accessibilityLabel="Actualizar turnos"
          >
            <Text style={styles.buttonText}>Actualizar</Text>
          </Pressable>
        </View>
      )}
    >
      {!!error && (
        <Text
          style={styles.error}
          testID="admin-shifts-error"
          nativeID="admin-shifts-error"
        >
          {error}
        </Text>
      )}

      {showFilters && (
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros de búsqueda</Text>

          <Text style={styles.filterLabel}>Estado</Text>
          <View style={styles.filterChips}>
            {STATUS_CHIPS.map((chip) => {
              const isActive = statusFilter === chip.value;
              return (
                <Pressable
                  key={chip.value}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setStatusFilter(chip.value)}
                  testID={`admin-shifts-status-chip-${chip.value}`}
                  nativeID={`admin-shifts-status-chip-${chip.value}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por estado: ${chip.label}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Fecha inicio (AAAA-MM-DD)"
            value={startDateFilter}
            onChangeText={setStartDateFilter}
            testID="admin-shifts-start-date-input"
            nativeID="admin-shifts-start-date-input"
            accessibilityLabel="Fecha de inicio del filtro"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Fecha fin (AAAA-MM-DD)"
            value={endDateFilter}
            onChangeText={setEndDateFilter}
            testID="admin-shifts-end-date-input"
            nativeID="admin-shifts-end-date-input"
            accessibilityLabel="Fecha de fin del filtro"
          />

          <View style={styles.filterActions}>
            <Pressable
              style={styles.buttonPrimary}
              onPress={handleSearch}
              testID="admin-shifts-search-btn"
              nativeID="admin-shifts-search-btn"
              accessibilityRole="button"
              accessibilityLabel="Buscar turnos"
            >
              <Text style={styles.buttonPrimaryText}>Buscar</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              onPress={handleClearFilters}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
            >
              <Text style={styles.buttonText}>Limpiar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total: {totalCount} turnos</Text>
        <Text style={styles.summaryText}>Página: {pageNumber}</Text>
      </View>

      {loading && <Text style={styles.loadingText}>Cargando...</Text>}

      {!loading && items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Sin resultados</Text>
        </View>
      )}

      <View style={styles.list} testID="admin-shifts-list" nativeID="admin-shifts-list">
        {items.map((item) => {
          const badgeColors = statusBadgeColors(item.status);
          const isExpanded = expandedShiftId === item.id;
          return (
            <View key={item.id}>
              <View
                style={styles.card}
                testID={`admin-shift-card-${item.id}`}
                nativeID={`admin-shift-card-${item.id}`}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardNurse}>{item.nurseDisplayName ?? "Enfermera sin nombre"}</Text>
                  <View
                    style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}
                    testID={`admin-shifts-status-chip-card-${item.id}`}
                    nativeID={`admin-shifts-status-chip-card-${item.id}`}
                  >
                    <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                {item.careRequestReference && (
                  <Text style={styles.cardRef}>Solicitud: {item.careRequestReference}</Text>
                )}

                <View style={styles.cardDateRow}>
                  <Text style={styles.cardDateLabel}>Inicio:</Text>
                  <Text style={styles.cardDateValue}>{formatDate(item.scheduledStartUtc)}</Text>
                </View>
                <View style={styles.cardDateRow}>
                  <Text style={styles.cardDateLabel}>Fin:</Text>
                  <Text style={styles.cardDateValue}>{formatDate(item.scheduledEndUtc)}</Text>
                </View>

                <Pressable
                  style={styles.detailButton}
                  onPress={() => void handleViewDetail(item.id)}
                  testID={`admin-shift-detail-btn-${item.id}`}
                  nativeID={`admin-shift-detail-btn-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded ? "Ocultar detalle del turno" : "Ver detalle del turno"}
                >
                  <Text style={styles.detailButtonText}>
                    {detailLoadingId === item.id ? "Cargando..." : isExpanded ? "Ocultar detalle" : "Ver detalle"}
                  </Text>
                </Pressable>
              </View>

              {isExpanded && selectedShift && selectedShift.id === item.id && (
                <View
                  style={styles.detailPanel}
                  testID="admin-shift-detail-panel"
                  nativeID="admin-shift-detail-panel"
                >
                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Enfermera</Text>
                    <Text style={styles.detailValue}>{selectedShift.nurseDisplayName ?? "Sin nombre"}</Text>
                    {selectedShift.nurseEmail && (
                      <Text style={styles.detailValueSecondary}>{selectedShift.nurseEmail}</Text>
                    )}
                  </View>

                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Solicitud de cuidado</Text>
                    <Text style={styles.detailValue}>{selectedShift.careRequestReference ?? selectedShift.careRequestId}</Text>
                  </View>

                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Inicio programado</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedShift.scheduledStartUtc)}</Text>
                  </View>

                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Fin programado</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedShift.scheduledEndUtc)}</Text>
                  </View>

                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Estado</Text>
                    <View style={{ flexDirection: "row" }}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBadgeColors(selectedShift.status).bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusBadgeColors(selectedShift.status).text }]}>
                          {statusLabel(selectedShift.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedShift.notes && (
                    <View style={styles.detailField}>
                      <Text style={styles.detailLabel}>Notas</Text>
                      <Text style={styles.detailValue}>{selectedShift.notes}</Text>
                    </View>
                  )}

                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Creado</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedShift.createdAtUtc)}</Text>
                  </View>

                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Última actualización</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedShift.updatedAtUtc)}</Text>
                  </View>

                  {shiftChanges.length > 0 && (
                    <View style={styles.changesSection}>
                      <Text style={styles.changesSectionTitle}>Historial de cambios</Text>
                      {shiftChanges.map((change) => (
                        <View key={change.id} style={styles.changeItem}>
                          <Text style={styles.changeDate}>{formatDate(change.changedAtUtc)}</Text>
                          {change.changedByActorName && (
                            <Text style={styles.changeActor}>{change.changedByActorName}</Text>
                          )}
                          {change.previousStatus && change.newStatus && (
                            <Text style={styles.changeStatus}>
                              {statusLabel(change.previousStatus)} → {statusLabel(change.newStatus)}
                            </Text>
                          )}
                          {change.notes && (
                            <Text style={styles.changeNotes}>{change.notes}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {shiftChanges.length === 0 && (
                    <View style={styles.detailField}>
                      <Text style={styles.detailLabel}>Historial de cambios</Text>
                      <Text style={styles.detailValueSecondary}>Sin cambios registrados.</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {totalCount > PAGE_SIZE && (
        <View style={styles.pagination}>
          <Pressable
            style={[styles.button, pageNumber === 1 && styles.buttonDisabled]}
            onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber === 1}
            testID="admin-shifts-prev-btn"
            nativeID="admin-shifts-prev-btn"
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
            testID="admin-shifts-next-btn"
            nativeID="admin-shifts-next-btn"
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
  button: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  buttonText: { color: designTokens.color.ink.accent, fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: designTokens.color.ink.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  filtersCard: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: designTokens.color.ink.muted, marginTop: 8, marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  chipActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  chipText: { color: designTokens.color.ink.primary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: designTokens.color.ink.inverse },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 14, padding: 14, color: designTokens.color.ink.primary },
  filterActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  summary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 },
  summaryText: { color: designTokens.color.ink.muted, fontSize: 14, fontWeight: "600" },
  loadingText: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: designTokens.color.ink.secondary, fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 16, shadowColor: designTokens.color.ink.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardNurse: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 16, flex: 1 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  cardRef: { color: designTokens.color.ink.muted, fontSize: 13, marginBottom: 6 },
  cardDateRow: { flexDirection: "row", marginBottom: 4 },
  cardDateLabel: { color: designTokens.color.ink.muted, fontSize: 13, fontWeight: "700", width: 50 },
  cardDateValue: { color: designTokens.color.ink.primary, fontSize: 13, flex: 1 },
  detailButton: { backgroundColor: designTokens.color.ink.accent, borderRadius: 12, paddingVertical: 8, marginTop: 10 },
  detailButtonText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
  detailPanel: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 8, gap: 12 },
  pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingHorizontal: 4 },
  pageInfo: { color: designTokens.color.ink.muted, fontSize: 14, fontWeight: "600" },
  detailField: { gap: 4 },
  detailLabel: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: designTokens.color.ink.primary, fontSize: 15 },
  detailValueSecondary: { color: designTokens.color.ink.secondary, fontSize: 14 },
  changesSection: { gap: 8 },
  changesSectionTitle: { fontSize: 14, fontWeight: "800", color: designTokens.color.ink.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  changeItem: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: designTokens.color.border.subtle, gap: 2 },
  changeDate: { color: designTokens.color.status.warningText, fontWeight: "700", fontSize: 12 },
  changeActor: { color: designTokens.color.ink.muted, fontSize: 13 },
  changeStatus: { color: designTokens.color.ink.primary, fontWeight: "700", fontSize: 14 },
  changeNotes: { color: designTokens.color.ink.secondary, fontSize: 13, marginTop: 2 },
});
