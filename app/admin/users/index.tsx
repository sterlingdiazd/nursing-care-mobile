// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-USERS-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminUsers,
  type AdminUserListItemDto,
  type AdminUserRoleName,
  type AdminUserProfileType,
  type AdminUserAccountStatus,
} from "@/src/services/adminPortalService";

function translateRole(role: AdminUserRoleName): string {
  switch (role) {
    case "ADMIN": return "Administrador";
    case "CLIENT": return "Cliente";
    case "NURSE": return "Enfermera";
  }
}

function translateProfileType(profileType: AdminUserProfileType | null | undefined): string {
  switch (profileType) {
    case "ADMIN": return "Administrador";
    case "CLIENT": return "Cliente";
    case "NURSE": return "Enfermera";
    default: return "Sin perfil";
  }
}

function translateAccountStatus(status: AdminUserAccountStatus): string {
  switch (status) {
    case "Active": return "Activo";
    case "Inactive": return "Inactivo";
    case "ProfileIncomplete": return "Perfil incompleto";
    case "AdminReview": return "Revisión admin";
    case "ManualIntervention": return "Intervención manual";
  }
}

function statusBadgeStyle(status: AdminUserAccountStatus) {
  switch (status) {
    case "Active": return { bg: "#d1fae5", text: "#065f46" };
    case "Inactive": return { bg: "#fee2e2", text: "#991b1b" };
    default: return { bg: "#fef3c7", text: "#92400e" };
  }
}

export default function AdminUsersScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminUserListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleName | "all">("all");
  const [profileTypeFilter, setProfileTypeFilter] = useState<AdminUserProfileType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AdminUserAccountStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminUsers({
        role: roleFilter !== "all" ? roleFilter : undefined,
        profileType: profileTypeFilter !== "all" ? profileTypeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setItems(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar los usuarios.");
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
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, roleFilter, profileTypeFilter, statusFilter]);

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
      eyebrow="Usuarios"
      title="Gestion de usuarios"
      description="Consulta cuentas, estados y perfiles desde una sola lista."
      actions={(
        <View style={styles.headerActions}>
          <Pressable style={styles.button} onPress={() => setShowFilters(!showFilters)}>
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
        </View>
      )}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      {showFilters && (
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros de búsqueda</Text>

          <Text style={styles.filterLabel}>Rol</Text>
          <View style={styles.filterChips}>
            {(["all", "ADMIN", "CLIENT", "NURSE"] as const).map((role) => (
              <Pressable
                key={role}
                style={[styles.chip, roleFilter === role && styles.chipActive]}
                onPress={() => setRoleFilter(role)}
              >
                <Text style={[styles.chipText, roleFilter === role && styles.chipTextActive]}>
                  {role === "all" ? "Todos" : translateRole(role)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Tipo de perfil</Text>
          <View style={styles.filterChips}>
            {(["all", "ADMIN", "CLIENT", "NURSE"] as const).map((pt) => (
              <Pressable
                key={pt}
                style={[styles.chip, profileTypeFilter === pt && styles.chipActive]}
                onPress={() => setProfileTypeFilter(pt)}
              >
                <Text style={[styles.chipText, profileTypeFilter === pt && styles.chipTextActive]}>
                  {pt === "all" ? "Todos" : translateProfileType(pt)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Estado de cuenta</Text>
          <View style={styles.filterChips}>
            {(["all", "Active", "Inactive", "ProfileIncomplete", "AdminReview", "ManualIntervention"] as const).map((status) => (
              <Pressable
                key={status}
                style={[styles.chip, statusFilter === status && styles.chipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.chipText, statusFilter === status && styles.chipTextActive]}>
                  {status === "all" ? "Todos" : translateAccountStatus(status)}
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
          <Text style={styles.emptyStateText}>No se encontraron usuarios.</Text>
        </View>
      )}

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        {items.map((item) => {
          const badgeColors = statusBadgeStyle(item.accountStatus);
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/admin/users/${item.id}` as never)}
              style={styles.card}
              testID={`admin-user-card-${item.id}`}
              nativeID={`admin-user-card-${item.id}`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.displayName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>
                    {translateAccountStatus(item.accountStatus)}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardMeta}>{item.email}</Text>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Roles:</Text>
                <Text style={styles.cardValue}>
                  {item.roleNames.map(translateRole).join(", ") || "Sin roles"}
                </Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Perfil:</Text>
                <Text style={styles.cardValue}>{translateProfileType(item.profileType)}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Activo:</Text>
                <Text style={styles.cardValue}>{item.isActive ? "Sí" : "No"}</Text>
              </View>

              {item.identificationNumber && (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Cédula:</Text>
                  <Text style={styles.cardValue}>{item.identificationNumber}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 8 },
  button: { backgroundColor: "#ffffff", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#d1d5db" },
  buttonText: { color: "#007aff", fontWeight: "700", fontSize: 14 },
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
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  cardMeta: { color: "#6b7280", fontSize: 14, marginBottom: 8 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: "#6b7280", fontSize: 13, fontWeight: "700", width: 120 },
  cardValue: { color: "#111827", fontSize: 13, flex: 1 },
});
