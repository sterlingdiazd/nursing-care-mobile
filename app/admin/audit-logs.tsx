import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
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
  const [items, setItems] = useState<AuditLogListItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [selectedDetail, setSelectedDetail] = useState<AuditLogDetailDto | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const response = await searchAuditLogs({
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        pageNumber,
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
    if (!roles.includes("ADMIN")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, pageNumber]);

  const handleSearch = () => {
    setPageNumber(1);
    void load();
  };

  const handleClearFilters = () => {
    setActionFilter("");
    setEntityTypeFilter("");
    setPageNumber(1);
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await getAuditLogDetail(id);
      setSelectedDetail(detail);
      setDetailModalVisible(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle.");
    }
  };

  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedDetail(null);
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Auditoria"
      title="Registro de acciones administrativas"
      description="Historial completo de eventos sensibles para cumplimiento y seguridad."
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
      {!!error && <Text style={styles.error}>{error}</Text>}

      {showFilters && (
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros de busqueda</Text>
          <TextInput
            style={styles.input}
            placeholder="Accion (ej: AdminAccountCreated)"
            value={actionFilter}
            onChangeText={setActionFilter}
          />
          <TextInput
            style={styles.input}
            placeholder="Tipo de entidad (ej: User)"
            value={entityTypeFilter}
            onChangeText={setEntityTypeFilter}
          />
          <View style={styles.filterActions}>
            <Pressable style={styles.buttonPrimary} onPress={handleSearch}>
              <Text style={styles.buttonPrimaryText}>Buscar</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={handleClearFilters}>
              <Text style={styles.buttonText}>Limpiar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Total: {totalCount} registros</Text>
        <Text style={styles.summaryText}>Pagina: {pageNumber}</Text>
      </View>

      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.timestamp}>{formatTimestamp(item.createdAtUtc)}</Text>
            <Text style={styles.actor}>{item.actorName || "Sistema"} · {roleLabel(item.actorRole)}</Text>
            <Text style={styles.action}>{item.action}</Text>
            <Text style={styles.entity}>{item.entityType} · {item.entityId.substring(0, 20)}...</Text>
            {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            <Pressable style={styles.detailButton} onPress={() => void handleViewDetail(item.id)}>
              <Text style={styles.detailButtonText}>Ver detalle</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {totalCount > 20 && (
        <View style={styles.pagination}>
          <Pressable
            style={[styles.button, pageNumber === 1 && styles.buttonDisabled]}
            onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber === 1}
          >
            <Text style={styles.buttonText}>Anterior</Text>
          </Pressable>
          <Text style={styles.pageInfo}>Pagina {pageNumber}</Text>
          <Pressable
            style={[styles.button, pageNumber * 20 >= totalCount && styles.buttonDisabled]}
            onPress={() => setPageNumber((p) => p + 1)}
            disabled={pageNumber * 20 >= totalCount}
          >
            <Text style={styles.buttonText}>Siguiente</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={handleCloseDetail}>
        <ScrollView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle de auditoria</Text>
            <Pressable style={styles.closeButton} onPress={handleCloseDetail}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </Pressable>
          </View>
          {selectedDetail && (
            <View style={styles.modalContent}>
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
                <Text style={styles.detailLabel}>Accion</Text>
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
        </ScrollView>
      </Modal>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: "#3b82f6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flex: 1 },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  buttonDisabled: { opacity: 0.5 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  filtersCard: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: "#102a43", marginBottom: 12 },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12, marginBottom: 8 },
  filterActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  summary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 },
  summaryText: { color: "#52637a", fontSize: 14, fontWeight: "600" },
  list: { gap: 12 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14 },
  timestamp: { color: "#7c2d12", fontWeight: "800", fontSize: 12, marginBottom: 4 },
  actor: { color: "#52637a", fontSize: 14, marginBottom: 4 },
  action: { color: "#102a43", fontWeight: "800", fontSize: 16, marginBottom: 4 },
  entity: { color: "#52637a", fontSize: 13, fontFamily: "monospace", marginBottom: 4 },
  notes: { color: "#52637a", fontSize: 13, marginBottom: 8 },
  detailButton: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 8, marginTop: 8 },
  detailButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
  pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingHorizontal: 4 },
  pageInfo: { color: "#52637a", fontSize: 14, fontWeight: "600" },
  modal: { flex: 1, backgroundColor: "#ffffff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#102a43" },
  closeButton: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  closeButtonText: { color: "#102a43", fontWeight: "700", fontSize: 14 },
  modalContent: { padding: 16, gap: 16 },
  detailField: { gap: 4 },
  detailLabel: { color: "#7c2d12", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: "#102a43", fontSize: 15 },
  detailValueSecondary: { color: "#52637a", fontSize: 14 },
  detailValueMono: { color: "#102a43", fontSize: 13, fontFamily: "monospace" },
  jsonContainer: { backgroundColor: "#f7fafc", borderRadius: 12, padding: 12, marginTop: 4 },
  jsonText: { color: "#102a43", fontSize: 12, fontFamily: "monospace" },
});
