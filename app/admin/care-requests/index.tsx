// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-CR-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";
import { designTokens } from "@/src/design-system/tokens";

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

  const listHeader = (
    <>
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
    </>
  );

  return (
    <MobileWorkspaceShell
      eyebrow="Solicitudes de Cuidado"
      title="Gestión de solicitudes"
      description="Consulta, filtra y supervisa todas las solicitudes de servicio."
      flat
      primaryReturnPath="/(tabs)/admin"
      primaryReturnLabel="Panel administrativo"
      testID={navigationTestIds.adminCareRequests.listRoot}
      nativeID={navigationTestIds.adminCareRequests.listRoot}
      systemActions={[
        {
          label: showFilters ? "Ocultar filtros" : "Filtros",
          onPress: () => setShowFilters(!showFilters),
          variant: "secondary",
          testID: adminTestIds.careRequests.filterButton,
        },
        {
          label: "Crear",
          onPress: () => router.push("/admin/care-requests/create" as any),
          variant: "primary",
          testID: adminTestIds.careRequests.createButton,
        },
      ]}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push(`/admin/care-requests/${item.id}` as any)}
            style={[styles.card, item.isOverdueOrStale && styles.cardOverdue]}
            testID={index === 0 ? navigationTestIds.adminCareRequests.listItemFirst : undefined}
            nativeID={index === 0 ? navigationTestIds.adminCareRequests.listItemFirst : undefined}
          >
            {item.isOverdueOrStale && (
              <View style={styles.overdueIndicator}>
                <Text style={styles.overdueText}>Vencida o estancada</Text>
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
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No se encontraron solicitudes de cuidado.</Text>
            </View>
          ) : null
        }
      />
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 16 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: designTokens.color.ink.muted, fontSize: 14, textAlign: "center", padding: 20 },
  filtersCard: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: designTokens.color.ink.muted, marginTop: 8, marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: designTokens.color.border.strong },
  chipActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  chipText: { color: designTokens.color.ink.primary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: designTokens.color.ink.inverse },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 14, padding: 14, color: designTokens.color.ink.primary },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: designTokens.color.ink.muted, fontSize: 16, textAlign: "center" },
  card: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: designTokens.color.ink.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardOverdue: { borderColor: designTokens.color.status.warningText, borderWidth: 1.5 },
  overdueIndicator: { backgroundColor: designTokens.color.surface.warning, borderRadius: 10, padding: 8, marginBottom: 8, alignSelf: "flex-start" },
  overdueText: { color: designTokens.color.status.warningText, fontSize: 12, fontWeight: "700" },
  cardTitle: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 18, marginBottom: 4 },
  cardMeta: { color: designTokens.color.ink.muted, fontSize: 14, marginBottom: 8 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: designTokens.color.ink.muted, fontSize: 13, fontWeight: "700", width: 140 },
  cardValue: { color: designTokens.color.ink.primary, fontSize: 13, flex: 1 },
  unassigned: { color: designTokens.color.ink.danger, fontSize: 13, fontStyle: "italic", marginTop: 4 },
  cardTimestamp: { color: designTokens.color.ink.muted, fontSize: 11, marginTop: 8 },
});
