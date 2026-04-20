// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-shifts-settings
// @diffs: DIFF-ADMIN-SHF-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
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
    case "Planned": return { bg: "#dbeafe", text: "#1e40af" };
    case "Completed": return { bg: "#d1fae5", text: "#065f46" };
    case "Changed": return { bg: "#fef3c7", text: "#92400e" };
    case "Cancelled": return { bg: "#fee2e2", text: "#991b1b" };
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

  // Detail modal
  const [selectedShift, setSelectedShift] = useState<ShiftDetailDto | null>(null);
  const [shiftChanges, setShiftChanges] = useState<ShiftChangeHistoryItemDto[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async (page = pageNumber) => {
    try {
      setError(null);
      setLoading(true);
      const result = await listAdminShifts({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
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
    if (!roles.includes("ADMIN")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, pageNumber, statusFilter]);

  const handleSearch = () => {
    setPageNumber(1);
    void load(1);
  };

  const handleClearFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
    setStatusFilter("all");
    setPageNumber(1);
  };

  const handleViewDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailModalVisible(true);
      const [detail, changes] = await Promise.all([
        getAdminShiftDetail(id),
        getAdminShiftChanges(id),
      ]);
      setSelectedShift(detail);
      setShiftChanges(changes);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle del turno.");
      setDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedShift(null);
    setShiftChanges([]);
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Administracion"
      title="Turnos"
      description="Gestiona los turnos de enfermeras asignados."
      actions={(
        <View style={styles.headerActions}>
          <Pressable style={styles.button} onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => void load()}>
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
          <Text style={styles.filtersTitle}>Filtros de busqueda</Text>

          <Text style={styles.filterLabel}>Estado</Text>
          <View style={styles.filterChips}>
            {STATUS_CHIPS.map((chip) => (
              <Pressable
                key={chip.value}
                style={[styles.chip, statusFilter === chip.value && styles.chipActive]}
                onPress={() => setStatusFilter(chip.value)}
                testID={`admin-shifts-status-chip-${chip.value}`}
                nativeID={`admin-shifts-status-chip-${chip.value}`}
              >
                <Text style={[styles.chipText, statusFilter === chip.value && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Fecha inicio (AAAA-MM-DD)"
            value={startDateFilter}
            onChangeText={setStartDateFilter}
            testID="admin-shifts-start-date-input"
            nativeID="admin-shifts-start-date-input"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Fecha fin (AAAA-MM-DD)"
            value={endDateFilter}
            onChangeText={setEndDateFilter}
            testID="admin-shifts-end-date-input"
            nativeID="admin-shifts-end-date-input"
          />

          <View style={styles.filterActions}>
            <Pressable
              style={styles.buttonPrimary}
              onPress={handleSearch}
              testID="admin-shifts-search-btn"
              nativeID="admin-shifts-search-btn"
            >
              <Text style={styles.buttonPrimaryText}>Buscar</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={handleClearFilters}>
              <Text style={styles.buttonText}>Limpiar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total: {totalCount} turnos</Text>
        <Text style={styles.summaryText}>Pagina: {pageNumber}</Text>
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
          return (
            <View
              key={item.id}
              style={styles.card}
              testID={`admin-shift-card-${item.id}`}
              nativeID={`admin-shift-card-${item.id}`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardNurse}>{item.nurseDisplayName ?? "Enfermera sin nombre"}</Text>
                <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
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
              >
                <Text style={styles.detailButtonText}>Ver detalle</Text>
              </Pressable>
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
          >
            <Text style={styles.buttonText}>Siguiente</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={handleCloseDetail}
      >
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle del turno</Text>
            <Pressable
              style={styles.closeButton}
              onPress={handleCloseDetail}
              testID="admin-shift-detail-close-btn"
              nativeID="admin-shift-detail-close-btn"
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </Pressable>
          </View>

          {detailLoading && (
            <Text style={[styles.loadingText, { margin: 24 }]}>Cargando...</Text>
          )}

          {!detailLoading && selectedShift && (
            <View style={styles.modalContent}>
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
                <Text style={styles.detailLabel}>Ultima actualizacion</Text>
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

              {shiftChanges.length === 0 && !detailLoading && (
                <View style={styles.detailField}>
                  <Text style={styles.detailLabel}>Historial de cambios</Text>
                  <Text style={styles.detailValueSecondary}>Sin cambios registrados.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Modal>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#d1d5db" },
  buttonText: { color: "#007aff", fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: "#007aff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  filtersCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: "#6b7280", marginTop: 8, marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: "#ffffff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#d1d5db" },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#111827", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 14, padding: 14, color: "#111827" },
  filterActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  summary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 },
  summaryText: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  loadingText: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: "#52637a", fontSize: 16 },
  list: { gap: 12 },
  card: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardNurse: { color: "#111827", fontWeight: "800", fontSize: 16, flex: 1 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  cardRef: { color: "#6b7280", fontSize: 13, marginBottom: 6 },
  cardDateRow: { flexDirection: "row", marginBottom: 4 },
  cardDateLabel: { color: "#6b7280", fontSize: 13, fontWeight: "700", width: 50 },
  cardDateValue: { color: "#111827", fontSize: 13, flex: 1 },
  detailButton: { backgroundColor: "#007aff", borderRadius: 12, paddingVertical: 8, marginTop: 10 },
  detailButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingHorizontal: 4 },
  pageInfo: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: "#f2f2f7" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", backgroundColor: "#ffffff" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  closeButton: { backgroundColor: "#ffffff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: "#d1d5db" },
  closeButtonText: { color: "#007aff", fontWeight: "700", fontSize: 14 },
  modalContent: { padding: 16, gap: 16 },
  detailField: { gap: 4 },
  detailLabel: { color: "#6b7280", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: "#111827", fontSize: 15 },
  detailValueSecondary: { color: "#4b5563", fontSize: 14 },
  changesSection: { gap: 8 },
  changesSectionTitle: { fontSize: 14, fontWeight: "800", color: "#111827", textTransform: "uppercase", letterSpacing: 0.5 },
  changeItem: { backgroundColor: "#ffffff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", gap: 2 },
  changeDate: { color: "#92400e", fontWeight: "700", fontSize: 12 },
  changeActor: { color: "#6b7280", fontSize: 13 },
  changeStatus: { color: "#111827", fontWeight: "700", fontSize: 14 },
  changeNotes: { color: "#4b5563", fontSize: 13, marginTop: 2 },
});
