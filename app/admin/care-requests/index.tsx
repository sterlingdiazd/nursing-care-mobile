import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequests,
  type AdminCareRequestListItemDto,
  type AdminCareRequestView,
} from "@/src/services/adminPortalService";

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
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("Admin")) return void router.replace("/");
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
      title="Gestión de solicitudes"
      description="Monitorear y administrar todas las solicitudes de servicio."
      actions={(
        <View style={styles.headerActions}>
          <Pressable style={styles.button} onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
          <Pressable style={styles.buttonPrimary} onPress={() => router.push("/admin/care-requests/create")}>
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
          <TextInput
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
            onPress={() => router.push(`/admin/care-requests/${item.id}`)}
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
  button: { backgroundColor: "#f0f4f8", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: "#102a43", fontWeight: "700", fontSize: 14 },
  buttonPrimary: { backgroundColor: "#3b82f6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  filtersCard: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: "#102a43", marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: "#52637a", marginTop: 8, marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: "#f0f4f8", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: "#3b82f6" },
  chipText: { color: "#102a43", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#ffffff" },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#cbd5e0", borderRadius: 12, padding: 12 },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: "#52637a", fontSize: 16, textAlign: "center" },
  list: { gap: 12 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardOverdue: { borderColor: "#f59e0b", borderWidth: 2 },
  overdueIndicator: { backgroundColor: "#fef3c7", borderRadius: 8, padding: 8, marginBottom: 8 },
  overdueText: { color: "#92400e", fontSize: 12, fontWeight: "700" },
  cardTitle: { color: "#102a43", fontWeight: "800", fontSize: 18, marginBottom: 4 },
  cardMeta: { color: "#52637a", fontSize: 14, marginBottom: 8 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: "#7c2d12", fontSize: 13, fontWeight: "700", width: 140 },
  cardValue: { color: "#102a43", fontSize: 13, flex: 1 },
  unassigned: { color: "#dc2626", fontSize: 13, fontStyle: "italic", marginTop: 4 },
  cardTimestamp: { color: "#7c2d12", fontSize: 11, marginTop: 8 },
});
