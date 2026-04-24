// @generated-by: implementation-agent
// @pipeline-run: 2026-04-24-mobile-ux-audit
// @diffs: DIFF-ADMIN-USERS-002
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { adminTestIds } from "@/src/testing/testIds";
import { designTokens } from "@/src/design-system/tokens";
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
    case "Active": return { bg: designTokens.color.surface.success, text: designTokens.color.status.successText };
    case "Inactive": return { bg: designTokens.color.surface.danger, text: designTokens.color.status.dangerText };
    default: return { bg: designTokens.color.surface.warning, text: designTokens.color.status.warningText };
  }
}

function getAttentionCount(items: AdminUserListItemDto[]) {
  return items.filter((item) => item.accountStatus !== "Active").length;
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
      description="Prioriza cuentas con riesgo operativo y deja los filtros como apoyo progresivo."
      testID={adminTestIds.users.listScreen}
      nativeID={adminTestIds.users.listScreen}
      actions={(
        <View style={styles.headerActions}>
          <Pressable
            style={styles.button}
            onPress={() => setShowFilters(!showFilters)}
            testID={adminTestIds.users.primaryAction}
            nativeID={adminTestIds.users.primaryAction}
            accessibilityRole="button"
            accessibilityLabel={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          >
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
        </View>
      )}
    >
      <View style={styles.summaryCard}>
        <Text
          style={styles.summaryChip}
          testID={adminTestIds.users.statusChip}
          nativeID={adminTestIds.users.statusChip}
        >
          {getAttentionCount(items) > 0
            ? `${getAttentionCount(items)} cuentas requieren atención`
            : "Sin alertas operativas"}
        </Text>
        <Text style={styles.summaryText}>
          Usa los filtros solo cuando necesites acotar la revisión; la lista debe dejar visibles primero los estados sensibles.
        </Text>
      </View>

      {!!error && (
        <Text
          style={styles.error}
          testID={adminTestIds.users.errorBanner}
          nativeID={adminTestIds.users.errorBanner}
        >
          {error}
        </Text>
      )}

      {showFilters && (
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros de búsqueda</Text>

          <Text style={styles.filterLabel}>Rol</Text>
          <View style={styles.filterChips}>
            {(["all", "ADMIN", "CLIENT", "NURSE"] as const).map((role) => {
              const isActive = roleFilter === role;
              return (
                <Pressable
                  key={role}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setRoleFilter(role)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por rol: ${role === "all" ? "Todos" : translateRole(role)}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {role === "all" ? "Todos" : translateRole(role)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Tipo de perfil</Text>
          <View style={styles.filterChips}>
            {(["all", "ADMIN", "CLIENT", "NURSE"] as const).map((pt) => {
              const isActive = profileTypeFilter === pt;
              return (
                <Pressable
                  key={pt}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setProfileTypeFilter(pt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por tipo de perfil: ${pt === "all" ? "Todos" : translateProfileType(pt)}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {pt === "all" ? "Todos" : translateProfileType(pt)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Estado de cuenta</Text>
          <View style={styles.filterChips}>
            {(["all", "Active", "Inactive", "ProfileIncomplete", "AdminReview", "ManualIntervention"] as const).map((status) => {
              const isActive = statusFilter === status;
              return (
                <Pressable
                  key={status}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setStatusFilter(status)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar por estado: ${status === "all" ? "Todos" : translateAccountStatus(status)}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {status === "all" ? "Todos" : translateAccountStatus(status)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Buscar</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre, correo o número de identificación"
            placeholderTextColor={designTokens.color.ink.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Buscar usuario por nombre, correo o cédula"
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
              accessibilityRole="button"
              accessibilityLabel={`Ver detalle del usuario ${item.displayName}`}
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
              <Text style={styles.cardHint}>
                {item.accountStatus === "Active"
                  ? "Cuenta lista para gestión normal."
                  : "Revisar estado, roles o activación antes de continuar."}
              </Text>

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
  button: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: designTokens.color.border.strong },
  buttonText: { color: designTokens.color.ink.accent, fontWeight: "700", fontSize: 14 },
  summaryCard: { backgroundColor: designTokens.color.surface.primary, borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 16, marginBottom: 12 },
  summaryChip: { alignSelf: "flex-start", backgroundColor: designTokens.color.ink.primary, color: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  summaryText: { color: designTokens.color.ink.secondary, fontSize: 13, lineHeight: 18 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  filtersCard: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: designTokens.color.ink.muted, marginTop: 8, marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#d1d5db" },
  chipActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  chipText: { color: designTokens.color.ink.primary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: designTokens.color.ink.inverse },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 14, padding: 14, color: designTokens.color.ink.primary },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: designTokens.color.ink.secondary, fontSize: 16, textAlign: "center" },
  list: { gap: 12 },
  card: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: designTokens.color.ink.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 18, flex: 1 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  cardMeta: { color: designTokens.color.ink.muted, fontSize: 14, marginBottom: 8 },
  cardHint: { color: designTokens.color.ink.secondary, fontSize: 13, marginBottom: 10 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: designTokens.color.ink.muted, fontSize: 13, fontWeight: "700", width: 120 },
  cardValue: { color: designTokens.color.ink.primary, fontSize: 13, flex: 1 },
});
