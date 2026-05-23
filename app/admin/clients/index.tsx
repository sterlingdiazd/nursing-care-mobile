// @generated-by: implementation-agent
// @pipeline-run: 2026-05-23-pagination-refactor
// @do-not-edit: false

import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FilterChips } from "@/src/components/shared/FilterChips";
import { ListRow } from "@/src/components/shared/ListRow";
import { Pagination } from "@/src/components/shared/Pagination";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Banner } from "@/src/components/shared/Banner";
import { useAuth } from "@/src/context/AuthContext";
import { usePagedList } from "@/src/hooks/usePagedList";
import { adminTestIds } from "@/src/testing/testIds";
import { designTokens } from "@/src/design-system/tokens";
import {
  getAdminClients,
  type AdminClientListItemDto,
  type AdminClientListStatus,
} from "@/src/services/adminPortalService";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";

type StatusFilter = AdminClientListStatus | "all";

const STATUS_OPTIONS: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activos" },
  { key: "inactive", label: "Inactivos" },
];

const PAGE_SIZE = 10;

export default function AdminClientsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isEnabled = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");
  const resetKey = `${statusFilter}|${searchQuery}`;

  const { items, totalCount, page, pageCount, isLoading, isRefreshing, error, setPage, refresh } =
    usePagedList<AdminClientListItemDto>({
      fetcher: (p, ps) =>
        getAdminClients({
          status: statusFilter !== "all" ? statusFilter as AdminClientListStatus : undefined,
          search: searchQuery || undefined,
          page: p,
          pageSize: ps,
        }),
      pageSize: PAGE_SIZE,
      enabled: isEnabled,
      resetKey,
    });

  // Auth gating runs in an effect — calling router.replace() during render updates
  // the navigator mid-render ("Cannot update a component while rendering a different component").
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
    else if (requiresProfileCompletion) router.replace("/register");
    else if (!roles.includes("ADMIN")) router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  if (!isEnabled) return null;

  const statusOptions = STATUS_OPTIONS.map((opt) => ({
    ...opt,
    count: opt.key === "all" ? totalCount : undefined,
  }));

  return (
    <MobileWorkspaceShell
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      eyebrow="Clientes"
      title="Gestión de clientes"
      testID={adminTestIds.clients.listScreen}
      nativeID={adminTestIds.clients.listScreen}
      actions={(
        <Pressable
          style={styles.buttonPrimary}
          onPress={() => router.push("/admin/clients/create" as never)}
          testID={adminTestIds.clients.primaryAction}
          nativeID={adminTestIds.clients.primaryAction}
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo cliente"
        >
          <Text style={styles.buttonPrimaryText}>Crear</Text>
        </Pressable>
      )}
      disableScroll
    >
      <View style={styles.container}>
        <FilterChips
          options={statusOptions}
          value={statusFilter}
          onChange={(key) => { setStatusFilter(key); }}
          testIDPrefix="admin-clients-filter"
        />

        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre, correo o cédula"
          placeholderTextColor={designTokens.color.ink.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Buscar cliente por nombre, correo o cédula"
          testID={adminTestIds.clients.statusChip}
          nativeID={adminTestIds.clients.statusChip}
        />

        <Banner tone="error" message={error} />

        {!isLoading && items.length === 0 && !error && (
          <Text style={styles.empty}>No se encontraron clientes.</Text>
        )}

        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        >
          {items.map((item) => {
            const meta = [
              item.email,
              item.identificationNumber ? `Cédula ${item.identificationNumber}` : null,
              `${item.ownedCareRequestsCount} ${item.ownedCareRequestsCount === 1 ? "solicitud" : "solicitudes"}`,
              item.lastCareRequestAtUtc ? formatDateTimeES(item.lastCareRequestAtUtc) : null,
            ];
            return (
              <ListRow
                key={item.userId}
                title={item.displayName}
                badge={
                  <StatusBadge
                    label={item.isActive ? "Activo" : "Inactivo"}
                    tone={item.isActive ? "success" : "danger"}
                  />
                }
                metaLines={meta}
                onPress={() => router.push(`/admin/clients/${item.userId}` as never)}
                testID={`admin-client-card-${item.userId}`}
                accessibilityLabel={`Ver detalle del cliente ${item.displayName}`}
              />
            );
          })}
        </ScrollView>

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
          testID="admin-clients-pagination"
        />
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  buttonPrimary: {
    backgroundColor: designTokens.color.ink.accentStrong,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  buttonPrimaryText: { ...designTokens.typography.label, color: designTokens.color.surface.primary },
  input: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    color: designTokens.color.ink.primary,
    fontSize: 14,
  },
  list: { flex: 1 },
  empty: {
    color: designTokens.color.ink.muted,
    fontSize: 14,
    textAlign: "center",
    padding: designTokens.spacing.lg,
  },
});
