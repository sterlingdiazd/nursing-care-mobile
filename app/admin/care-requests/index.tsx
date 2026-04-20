// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-CR-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequests,
  type AdminCareRequestListItemDto,
  type AdminCareRequestView,
} from "@/src/services/adminPortalService";
import { FormInput } from "@/src/components/form";
import { adminTestIds } from "@/src/testing/testIds";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function statusLabel(status: string) {
  if (status === "Pending") return "Pendiente";
  if (status === "Approved") return "Aprobado";
  if (status === "Rejected") return "Rechazado";
  if (status === "Completed") return "Completado";
  return status;
}

export default function AdminCareRequestsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminCareRequestListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [viewFilter, setViewFilter] = useState<AdminCareRequestView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminCareRequests({
        view: viewFilter,
        search: searchQuery || undefined,
      });
      setItems(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar solicitudes de cuidado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, viewFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        void load();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleViewChange = (view: AdminCareRequestView) => {
    setViewFilter(view);
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Solicitudes de Cuidado"
      title="Gestion de solicitudes"
      description="Consulta, filtra y supervisa todas las solicitudes de servicio."
      actions={(
        <View style={styles.headerActions}>
          <Pressable
            testID={adminTestIds.careRequests.filterButton}
            nativeID={adminTestIds.careRequests.filterButton}
            style={styles.button}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
          <Pressable
            testID={adminTestIds.careRequests.createButton}
            nativeID={adminTestIds.careRequests.createButton}
            style={styles.buttonPrimary}
            onPress={() => router.push("/admin/care-requests/create" as any)}
          >
            <Text style={styles.buttonPrimaryText}>Crear</Text>
          </Pressable>
        </View>
      )}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      {showFilters && (
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros de búsqueda</Text>
          
          <Text style={styles.filterLabel}>Vista</Text>
          <View style={styles.filterChips}>
            {(["all", "pending", "approved", "rejected", "completed", "unassigned", "pending-approval", "rejected-today", "approved-incomplete", "overdue"] as AdminCareRequestView[]).map((view) => (
              <Pressable
                key={view}
                style={[styles.chip, viewFilter === view && styles.chipActive]}
                onPress={() => handleViewChange(view)}
              >
                <Text style={[styles.chipText, viewFilter === view && styles.chipTextActive]}>
                  {view === "all" && "Todas"}
                  {view === "pending" && "Pendientes"}
                  {view === "approved" && "Aprobadas"}
                  {view === "rejected" && "Rechazadas"}
                  {view === "completed" && "Completadas"}
                  {view === "unassigned" && "Sin asignar"}
                  {view === "pending-approval" && "Esperando aprobación"}
                  {view === "rejected-today" && "Rechazadas hoy"}
                  {view === "approved-incomplete" && "Aprobadas incompletas"}
                  {view === "overdue" && "Vencidas"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Buscar</Text>
          <FormInput
            testID={adminTestIds.careRequests.searchInput}
            style={styles.input}
            placeholder="Nombre del cliente, correo o descripción"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {!loading && items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No se encontraron solicitudes de cuidado.</Text>
        </View>
      )}

      <ScrollView style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/admin/care-requests/${item.id}` as any)}
            style={[styles.card, item.isOverdueOrStale && styles.cardOverdue]}
          >
            {item.isOverdueOrStale && (
              <View style={styles.overdueIndicator}>
                <Text style={styles.overdueText}>⚠️ Vencida o estancada</Text>
              </View>
            )}
            
            <Text style={styles.cardTitle}>{item.clientDisplayName}</Text>
            <Text style={styles.cardMeta}>{item.clientEmail}</Text>
            
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Estado:</Text>
              <Text style={styles.cardValue}>{statusLabel(item.status)}</Text>
            </View>
            
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Tipo:</Text>
              <Text style={styles.cardValue}>{item.careRequestType}</Text>
            </View>
            
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Total:</Text>
              <Text style={styles.cardValue}>{formatCurrency(item.total)}</Text>
            </View>
            
            {item.careRequestDate && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Fecha programada:</Text>
                <Text style={styles.cardValue}>{formatTimestamp(item.careRequestDate)}</Text>
              </View>
            )}
            
            {item.assignedNurseDisplayName ? (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Enfermera asignada:</Text>
                <Text style={styles.cardValue}>{item.assignedNurseDisplayName}</Text>
              </View>
            ) : (
              <Text style={styles.unassigned}>Sin enfermera asignada</Text>
            )}
            
            <Text style={styles.cardTimestamp}>Creada: {formatTimestamp(item.createdAtUtc)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#d1d5db" },
  buttonText: { color: "#007aff", fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: "#007aff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  filtersCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: "#6b7280", marginTop: 8, marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: "#ffffff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#d1d5db" },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { color: "#111827", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 14, padding: 14, color: "#111827" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: "#52637a", fontSize: 16, textAlign: "center" },
  list: { gap: 12 },
  card: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardOverdue: { borderColor: "#f59e0b", borderWidth: 1.5 },
  overdueIndicator: { backgroundColor: "#fff7ed", borderRadius: 10, padding: 8, marginBottom: 8, alignSelf: "flex-start" },
  overdueText: { color: "#92400e", fontSize: 12, fontWeight: "700" },
  cardTitle: { color: "#111827", fontWeight: "800", fontSize: 18, marginBottom: 4 },
  cardMeta: { color: "#6b7280", fontSize: 14, marginBottom: 8 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: "#6b7280", fontSize: 13, fontWeight: "700", width: 140 },
  cardValue: { color: "#111827", fontSize: 13, flex: 1 },
  unassigned: { color: "#dc2626", fontSize: 13, fontStyle: "italic", marginTop: 4 },
  cardTimestamp: { color: "#6b7280", fontSize: 11, marginTop: 8 },
});
