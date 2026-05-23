// @generated-by: implementation-agent
// @pipeline-run: 2026-04-24-mobile-ux-audit
// @diffs: DIFF-ADMIN-USERS-002
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { adminTestIds } from "@/src/testing/testIds";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
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

/** Build a compact role/profile descriptor, deduplicating when role and profileType are the same label. */
function buildRoleLabel(item: AdminUserListItemDto): string {
  const roles = item.roleNames.map(translateRole);
  const profile = translateProfileType(item.profileType);
  // If profile matches one of the role labels exactly, omit the redundant profile
  const unique = roles.includes(profile) ? roles : [...roles, profile];
  return unique.join(", ") || "Sin roles";
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
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      eyebrow="Usuarios"
      title="Gestion de usuarios"
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
      {/* Attention count chip — data only, no instructional text */}
      <Text
        style={styles.attentionChip}
        testID={adminTestIds.users.statusChip}
        nativeID={adminTestIds.users.statusChip}
      >
        {items.filter((i) => i.accountStatus !== "Active").length > 0
          ? `${items.filter((i) => i.accountStatus !== "Active").length} cuentas requieren atención`
          : `${items.length} usuarios`}
      </Text>

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
          const roleLabel = buildRoleLabel(item);
          const secondLine = [item.email, item.identificationNumber ? `Cédula ${item.identificationNumber}` : null]
            .filter(Boolean)
            .join(" · ");
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
                <StatusBadge
                  label={translateAccountStatus(item.accountStatus)}
                  colors={{ bg: badgeColors.bg, fg: badgeColors.text }}
                />
              </View>
              <Text style={styles.cardRole}>{roleLabel}</Text>
              {!!secondLine && <Text style={styles.cardMeta}>{secondLine}</Text>}
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
  attentionChip: { alignSelf: "flex-start", backgroundColor: designTokens.color.ink.primary, color: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, fontSize: 12, fontWeight: "700", marginBottom: 12 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: designTokens.color.ink.secondary, fontSize: 14, textAlign: "center", padding: 20 },
  filtersCard: { ...mobileSurfaceCard, padding: 16, marginBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: "800", color: designTokens.color.ink.primary, marginBottom: 12 },
  filterLabel: { fontSize: 14, fontWeight: "700", color: designTokens.color.ink.muted, marginTop: 8, marginBottom: 6 },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: designTokens.color.ink.inverse, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  chipActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  chipText: { color: designTokens.color.ink.primary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: designTokens.color.ink.inverse },
  input: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.strong, borderRadius: 14, padding: 14, color: designTokens.color.ink.primary },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: designTokens.color.ink.secondary, fontSize: 16, textAlign: "center" },
  list: { gap: 12 },
  card: { ...mobileSurfaceCard, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardTitle: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 18, flex: 1 },
  cardRole: { color: designTokens.color.ink.secondary, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  cardMeta: { color: designTokens.color.ink.muted, fontSize: 13 },
});
