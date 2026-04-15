import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminClients,
  type AdminClientListItemDto,
  type AdminClientListStatus,
} from "@/src/services/adminPortalService";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminClientsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminClientListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<AdminClientListStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminClients({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setItems(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar los clientes.");
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
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        void load();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  return (
    <MobileWorkspaceShell
      eyebrow="Clientes"
      title="Gestion de clientes"
      description="Revisa cartera, estado y actividad de los clientes."
      actions={(
        <View style={styles.headerActions}>
          <Pressable style={styles.button} onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
          <Pressable style={styles.buttonPrimary} onPress={() => router.push("/admin/clients/create" as never)}>
            <Text style={styles.buttonPrimaryText}>Crear</Text>
          </Pressable>
        </View>
      )}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      {showFilters && (
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros de búsqueda</Text>

          <Text style={styles.filterLabel}>Estado</Text>
          <View style={styles.filterChips}>
            {(["all", "active", "inactive"] as const).map((status) => (
              <Pressable
                key={status}
                style={[styles.chip, statusFilter === status && styles.chipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.chipText, statusFilter === status && styles.chipTextActive]}>
                  {status === "all" && "Todos"}
                  {status === "active" && "Activos"}
                  {status === "inactive" && "Inactivos"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Buscar</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre, correo o número de identificación"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {!loading && items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No se encontraron clientes.</Text>
        </View>
      )}

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        {items.map((item) => (
          <Pressable
            key={item.userId}
            onPress={() => router.push(`/admin/clients/${item.userId}` as never)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.displayName}</Text>
              <View style={[styles.statusBadge, item.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <Text style={[styles.statusBadgeText, item.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive]}>
                  {item.isActive ? "Activo" : "Inactivo"}
                </Text>
              </View>
            </View>

            <Text style={styles.cardMeta}>{item.email}</Text>

            {item.identificationNumber && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Cédula:</Text>
                <Text style={styles.cardValue}>{item.identificationNumber}</Text>
              </View>
            )}

            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Solicitudes:</Text>
              <Text style={styles.cardValue}>{item.ownedCareRequestsCount}</Text>
            </View>

            {item.lastCareRequestAtUtc && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Última solicitud:</Text>
                <Text style={styles.cardValue}>{formatTimestamp(item.lastCareRequestAtUtc)}</Text>
              </View>
            )}
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { color: "#111827", fontWeight: "800", fontSize: 18, flex: 1 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusBadgeActive: { backgroundColor: "#d1fae5" },
  statusBadgeInactive: { backgroundColor: "#fee2e2" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextActive: { color: "#065f46" },
  statusBadgeTextInactive: { color: "#991b1b" },
  cardMeta: { color: "#6b7280", fontSize: 14, marginBottom: 8 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: "#6b7280", fontSize: 13, fontWeight: "700", width: 120 },
  cardValue: { color: "#111827", fontSize: 13, flex: 1 },
});
