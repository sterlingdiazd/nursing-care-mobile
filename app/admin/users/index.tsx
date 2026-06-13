// @generated-by: implementation-agent
// @pipeline-run: 2026-05-23-pagination-refactor
// @do-not-edit: false

import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FilterSelect } from "@/src/components/shared/FilterSelect";
import { ListRow } from "@/src/components/shared/ListRow";
import { Pagination } from "@/src/components/shared/Pagination";
import { SwipePager } from "@/src/components/shared/SwipePager";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Banner } from "@/src/components/shared/Banner";
import { useAuth } from "@/src/context/AuthContext";
import { usePagedList } from "@/src/hooks/usePagedList";
import { adminTestIds } from "@/src/testing/testIds";
import { designTokens } from "@/src/design-system/tokens";
import {
  getAdminUsers,
  type AdminUserListItemDto,
  type AdminUserRoleName,
  type AdminUserAccountStatus,
} from "@/src/services/adminPortalService";

function translateAccountStatus(status: AdminUserAccountStatus): string {
  switch (status) {
    case "Active": return "Activo";
    case "Inactive": return "Inactivo";
    case "ProfileIncomplete": return "Perfil incompleto";
    case "AdminReview": return "Revisión admin";
    case "ManualIntervention": return "Intervención manual";
  }
}

function statusTone(status: AdminUserAccountStatus): "success" | "danger" | "warning" | "neutral" {
  switch (status) {
    case "Active": return "success";
    case "Inactive": return "danger";
    default: return "warning";
  }
}

/** Soft status tint {bg,fg} for the filter rows (matches the card badge tone). */
function statusTint(key: StatusFilter): { bg: string; fg: string } | null {
  if (key === "all") return null;
  const tone = statusTone(key as AdminUserAccountStatus);
  const p = designTokens.color.palette;
  const hue = tone === "success" ? p.green : tone === "danger" ? p.red : tone === "warning" ? p.amber : p.neutral;
  return { bg: hue.soft, fg: hue.text };
}

type StatusFilter = "all" | "Active" | "Inactive" | "ProfileIncomplete" | "AdminReview" | "ManualIntervention";

const STATUS_OPTIONS: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "Active", label: "Activos" },
  { key: "Inactive", label: "Inactivos" },
  { key: "ProfileIncomplete", label: "Incompleto" },
  { key: "AdminReview", label: "En revisión" },
  { key: "ManualIntervention", label: "Manual" },
];

const PAGE_SIZE = 10;

export default function AdminUsersScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusCounts, setStatusCounts] = useState<Record<string, number> | null>(null);

  const isEnabled = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");
  const resetKey = `${statusFilter}|${searchQuery}`;

  const { items, totalCount, page, pageCount, isLoading, isRefreshing, error, setPage, refresh } =
    usePagedList<AdminUserListItemDto>({
      fetcher: (p, ps) =>
        getAdminUsers({
          status: statusFilter !== "all" ? statusFilter as AdminUserAccountStatus : undefined,
          search: searchQuery || undefined,
          page: p,
          pageSize: ps,
        }),
      pageSize: PAGE_SIZE,
      enabled: isEnabled,
      resetKey,
    });

  const attentionCount = useMemo(() => items.filter((i) => i.accountStatus !== "Active").length, [items]);

  // Auth gating runs in an effect — calling router.replace() during render updates
  // the navigator mid-render ("Cannot update a component while rendering a different component").
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
    else if (requiresProfileCompletion) router.replace("/register");
    else if (!roles.includes("ADMIN")) router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  // Per-status counts via one lightweight (pageSize 1) totalCount probe per status — accurate at
  // any scale (a single fetch-and-group would cap at the page size and stop summing to "all").
  useEffect(() => {
    if (!isEnabled) return;
    let cancelled = false;
    const entries: ReadonlyArray<readonly [StatusFilter, AdminUserAccountStatus | undefined]> = [
      ["all", undefined],
      ["Active", "Active"],
      ["Inactive", "Inactive"],
      ["ProfileIncomplete", "ProfileIncomplete"],
      ["AdminReview", "AdminReview"],
      ["ManualIntervention", "ManualIntervention"],
    ];
    Promise.all(
      entries.map(([k, status]) =>
        getAdminUsers({ status, pageSize: 1 })
          .then((r) => [k, r.totalCount] as const)
          .catch(() => [k, 0] as const),
      ),
    ).then((pairs) => { if (!cancelled) setStatusCounts(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  }, [isEnabled, totalCount]);

  if (!isEnabled) return null;

  const statusOptions = STATUS_OPTIONS.map((opt) => ({
    ...opt,
    count: statusCounts ? (statusCounts[opt.key] ?? 0) : (opt.key === "all" ? totalCount : undefined),
    tint: statusTint(opt.key),
  }));

  return (
    <MobileWorkspaceShell
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      eyebrow="Usuarios"
      title="Gestión de usuarios"
      testID={adminTestIds.users.listScreen}
      nativeID={adminTestIds.users.listScreen}
      disableScroll
    >
      <View style={styles.container}>
        <FilterSelect
          label="Estado"
          options={statusOptions}
          value={statusFilter}
          onChange={(key) => { setStatusFilter(key); }}
          testIDPrefix="admin-users-filter"
        />

        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre, correo o cédula"
          placeholderTextColor={designTokens.color.ink.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Buscar usuario por nombre, correo o cédula"
          testID={adminTestIds.users.primaryAction}
          nativeID={adminTestIds.users.primaryAction}
        />

        <Banner tone="error" message={error} />

        {!isLoading && items.length === 0 && !error && (
          <Text
            style={styles.empty}
            testID={adminTestIds.users.statusChip}
            nativeID={adminTestIds.users.statusChip}
          >
            {attentionCount === 0 ? "No se encontraron usuarios." : `${attentionCount} cuentas requieren atención`}
          </Text>
        )}

        <SwipePager page={page} pageCount={pageCount} onPageChange={setPage} style={styles.list}>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
          >
          {items.map((item) => {
            const meta = [item.email, item.identificationNumber ? `Cédula ${item.identificationNumber}` : null];
            return (
              <ListRow
                key={item.id}
                title={item.displayName}
                badge={
                  <StatusBadge
                    label={translateAccountStatus(item.accountStatus)}
                    tone={statusTone(item.accountStatus)}
                  />
                }
                metaLines={meta}
                onPress={() => router.push(`/admin/users/${item.id}` as never)}
                testID={`admin-user-card-${item.id}`}
                accessibilityLabel={`Ver detalle del usuario ${item.displayName}`}
              />
            );
          })}
          </ScrollView>
        </SwipePager>

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
          testID="admin-users-pagination"
        />
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: designTokens.spacing.sm },
  input: {
    backgroundColor: designTokens.color.surface.primary,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
  },
  list: { flex: 1 },
  empty: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.body.fontSize,
    textAlign: "center",
    padding: designTokens.spacing.lg,
  },
});
