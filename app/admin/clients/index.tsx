// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-CLIENTS-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  getAdminClients,
  type AdminClientListItemDto,
  type AdminClientListStatus,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getInactiveCount(items: AdminClientListItemDto[]) {
  return items.filter((item) => !item.isActive).length;
}

export default function AdminClientsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminClientListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AdminClientListStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const canLoadClients = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");

  const load = async () => {
    if (!canLoadClients) return;

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

  useEffect(() => {
    if (!canLoadClients) return;

    const timer = setTimeout(() => {
      void load();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, canLoadClients]);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  const inactiveCount = getInactiveCount(items);
  const activeCount = items.length - inactiveCount;

  return (
    <MobileWorkspaceShell
      eyebrow="Clientes"
      title="Gestión de clientes"
      description="Prioriza seguimiento operativo y deja los filtros como apoyo progresivo."
      testID={adminTestIds.clients.listScreen}
      nativeID={adminTestIds.clients.listScreen}
      actions={(
        <View style={styles.headerActions}>
          <Pressable style={styles.button} onPress={() => setShowFilters((current) => !current)}>
            <Text style={styles.buttonText}>{showFilters ? "Ocultar filtros" : "Filtros"}</Text>
          </Pressable>
          <Pressable
            style={styles.buttonPrimary}
            onPress={() => router.push("/admin/clients/create" as never)}
            testID={adminTestIds.clients.primaryAction}
            nativeID={adminTestIds.clients.primaryAction}
          >
            <Text style={styles.buttonPrimaryText}>Crear</Text>
          </Pressable>
        </View>
      )}
    >
      <View style={styles.summaryCard}>
        <Text
          style={styles.summaryChip}
          testID={adminTestIds.clients.statusChip}
          nativeID={adminTestIds.clients.statusChip}
        >
          {inactiveCount > 0
            ? `${inactiveCount} clientes inactivos requieren seguimiento`
            : "Cartera estable sin alertas"}
        </Text>
        <Text style={styles.summaryText}>Activos: {activeCount} • Inactivos: {inactiveCount}</Text>
      </View>

      {!!error && (
        <Text
          style={styles.error}
          testID={adminTestIds.clients.errorBanner}
          nativeID={adminTestIds.clients.errorBanner}
        >
          {error}
        </Text>
      )}

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
                  {status === "all" ? "Todos" : status === "active" ? "Activos" : "Inactivos"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Buscar</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre, correo o número de identificación"
            placeholderTextColor={designTokens.color.ink.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {loading && <Text style={styles.loading}>Cargando...</Text>}

      {!loading && items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No se encontraron clientes.</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        {items.map((item) => (
          <Pressable
            key={item.userId}
            onPress={() => router.push(`/admin/clients/${item.userId}` as never)}
            style={styles.card}
            testID={`admin-client-card-${item.userId}`}
            nativeID={`admin-client-card-${item.userId}`}
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
            <Text style={styles.cardHint}>
              {item.isActive
                ? "Cuenta disponible para nuevas gestiones administrativas."
                : "Revisar activación antes de crear nuevas solicitudes."}
            </Text>

            {item.identificationNumber ? (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Cédula:</Text>
                <Text style={styles.cardValue}>{item.identificationNumber}</Text>
              </View>
            ) : null}

            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Solicitudes:</Text>
              <Text style={styles.cardValue}>{item.ownedCareRequestsCount}</Text>
            </View>

            {item.lastCareRequestAtUtc ? (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Última solicitud:</Text>
                <Text style={styles.cardValue}>{formatTimestamp(item.lastCareRequestAtUtc)}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: designTokens.spacing.sm },
  button: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  buttonText: { ...designTokens.typography.label, color: designTokens.color.ink.primary },
  buttonPrimary: {
    backgroundColor: designTokens.color.ink.accentStrong,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  buttonPrimaryText: { ...designTokens.typography.label, color: designTokens.color.surface.primary },
  summaryCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  summaryChip: {
    ...designTokens.typography.label,
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.status.infoBg,
    color: designTokens.color.status.infoText,
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.xs,
  },
  summaryText: { ...designTokens.typography.body, color: designTokens.color.ink.muted },
  error: {
    ...designTokens.typography.body,
    backgroundColor: designTokens.color.surface.danger,
    color: designTokens.color.ink.danger,
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.md,
    marginBottom: designTokens.spacing.md,
  },
  loading: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.muted,
    textAlign: "center",
    padding: designTokens.spacing.lg,
  },
  filtersCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  filtersTitle: { ...designTokens.typography.sectionTitle, fontSize: 16, marginBottom: designTokens.spacing.sm },
  filterLabel: {
    ...designTokens.typography.label,
    marginTop: designTokens.spacing.xs,
    marginBottom: designTokens.spacing.xs,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  },
  chip: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  chipActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  chipText: { ...designTokens.typography.label, fontSize: 12 },
  chipTextActive: { color: designTokens.color.surface.primary },
  input: {
    ...designTokens.typography.body,
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
  },
  emptyState: { padding: designTokens.spacing.xl, alignItems: "center" },
  emptyStateText: { ...designTokens.typography.body, color: designTokens.color.ink.muted, textAlign: "center" },
  list: { gap: designTokens.spacing.sm },
  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    borderRadius: designTokens.radius.lg,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: designTokens.spacing.xs,
  },
  cardTitle: { ...designTokens.typography.sectionTitle, flex: 1 },
  statusBadge: {
    borderRadius: designTokens.radius.pill,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 2,
    marginLeft: designTokens.spacing.sm,
  },
  statusBadgeActive: { backgroundColor: designTokens.color.surface.success },
  statusBadgeInactive: { backgroundColor: designTokens.color.surface.danger },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextActive: { color: designTokens.color.status.successText },
  statusBadgeTextInactive: { color: designTokens.color.ink.danger },
  cardMeta: {
    ...designTokens.typography.body,
    fontSize: 14,
    marginBottom: designTokens.spacing.xs,
    color: designTokens.color.ink.muted,
  },
  cardHint: {
    ...designTokens.typography.body,
    color: designTokens.color.ink.muted,
    marginBottom: designTokens.spacing.sm,
  },
  cardRow: { flexDirection: "row", marginBottom: designTokens.spacing.xs },
  cardLabel: { ...designTokens.typography.label, width: 120, color: designTokens.color.ink.muted },
  cardValue: { ...designTokens.typography.body, flex: 1 },
});
