import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FilterChips } from "@/src/components/shared/FilterChips";
import { ListRow } from "@/src/components/shared/ListRow";
import { Pagination } from "@/src/components/shared/Pagination";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Banner } from "@/src/components/shared/Banner";
import { mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { useAuth } from "@/src/context/AuthContext";
import { usePagedList } from "@/src/hooks/usePagedList";
import { SwipePager } from "@/src/components/shared/SwipePager";
import {
  getAdminCareRequests,
  type AdminCareRequestListItemDto,
  type AdminCareRequestStatus,
  type AdminCareRequestView,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

type Filter =
  | "Pending" | "Unassigned" | "Overdue" | "Approved" | "Completed"
  | "Invoiced" | "PaymentReported" | "Paid" | "Rejected" | "Cancelled" | "Voided" | "All";

const FILTER_TO_VIEW: Record<Filter, AdminCareRequestView | undefined> = {
  Pending: "pending",
  Unassigned: "unassigned",
  Overdue: "overdue",
  Approved: "approved",
  Completed: "completed",
  Invoiced: "invoiced",
  PaymentReported: "payment-reported",
  Paid: "paid",
  Rejected: "rejected",
  Cancelled: "cancelled",
  Voided: "voided",
  All: undefined,
};

function viewParamToFilter(view: string | string[] | undefined): Filter {
  const v = Array.isArray(view) ? view[0] : view;
  switch (v) {
    case "overdue": return "Overdue";
    case "unassigned": return "Unassigned";
    case "pending":
    case "pending-approval":
      return "Pending";
    case "approved":
    case "approved-incomplete":
      return "Approved";
    case "completed": return "Completed";
    case "invoiced": return "Invoiced";
    case "payment-reported": return "PaymentReported";
    case "paid": return "Paid";
    case "rejected":
    case "rejected-today":
      return "Rejected";
    case "cancelled": return "Cancelled";
    case "voided": return "Voided";
    case "all": return "All";
    default: return "Pending";
  }
}

function getStatusLabel(status: AdminCareRequestStatus): string {
  switch (status) {
    case "Approved": return "Aprobada";
    case "Rejected": return "Rechazada";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    case "Invoiced": return "Facturada";
    case "Paid": return "Pagada";
    case "PaymentReported": return "Pago reportado";
    case "Voided": return "Anulada";
    default: return "Pendiente";
  }
}

function getStatusTone(status: AdminCareRequestStatus): "success" | "danger" | "warning" | "neutral" {
  switch (status) {
    case "Approved": return "success";
    case "Rejected":
    case "Voided":
    case "Cancelled": return "danger";
    case "Completed":
    case "Invoiced":
    case "Paid":
    case "PaymentReported": return "neutral";
    default: return "warning";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

const FILTER_OPTIONS: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: "Pending", label: "Pendientes" },
  { key: "Unassigned", label: "Sin asignar" },
  { key: "Overdue", label: "Vencidas" },
  { key: "Approved", label: "Aprobadas" },
  { key: "Completed", label: "Completadas" },
  { key: "Invoiced", label: "Facturadas" },
  { key: "PaymentReported", label: "Pago reportado" },
  { key: "Paid", label: "Pagadas" },
  { key: "Rejected", label: "Rechazadas" },
  { key: "Cancelled", label: "Canceladas" },
  { key: "Voided", label: "Anuladas" },
  { key: "All", label: "Todas" },
];

const PAGE_SIZE = 10;

export default function AdminCareRequestsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const params = useLocalSearchParams<{ view?: string }>();
  const [filter, setFilter] = useState<Filter>(() => viewParamToFilter(params.view));

  const isEnabled = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");

  const view = FILTER_TO_VIEW[filter];

  const { items, totalCount, page, pageCount, isLoading, isRefreshing, error, setPage, refresh } =
    usePagedList<AdminCareRequestListItemDto>({
      fetcher: (p, ps) =>
        getAdminCareRequests({
          view: view ?? "all",
          page: p,
          pageSize: ps,
        }),
      pageSize: PAGE_SIZE,
      enabled: isEnabled,
      resetKey: filter,
    });

  // Auth gating runs in an effect — calling router.replace() during render updates
  // the navigator mid-render ("Cannot update a component while rendering a different component").
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login" as never);
    else if (requiresProfileCompletion) router.replace("/register" as never);
    else if (!roles.includes("ADMIN")) router.replace("/" as never);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  if (!isEnabled) return null;

  const filterOptions = FILTER_OPTIONS.map((opt) => ({
    ...opt,
    count: opt.key === filter ? totalCount : undefined,
  }));

  return (
    <MobileWorkspaceShell
      title="Solicitudes"
      primaryReturnPlacement="header"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      systemActions={[
        {
          label: "Crear",
          onPress: () => router.push("/admin/care-requests/create" as never),
          variant: "primary",
          testID: adminTestIds.careRequests.createButton,
        },
      ]}
      disableScroll
    >
      <View style={styles.container}>
        <FilterChips
          options={filterOptions}
          value={filter}
          onChange={(key) => setFilter(key)}
          testIDPrefix="admin-care-requests-filter"
        />

        <Banner tone="error" message={error} />

        {isLoading && items.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
          </View>
        ) : !isLoading && items.length === 0 && !error ? (
          <View style={styles.loadingState}>
            <Text style={styles.emptyText}>No hay solicitudes en este filtro.</Text>
          </View>
        ) : (
          <SwipePager page={page} pageCount={pageCount} onPageChange={setPage} style={styles.list}>
            <ScrollView
              style={{ flex: 1 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
            >
              {items.map((item) => {
              const overdue = item.isOverdueOrStale;
              const unassigned = !item.assignedNurseUserId;
              const railColor = overdue
                ? designTokens.color.status.warningText
                : unassigned
                  ? designTokens.color.status.dangerText
                  : undefined;
              const flags = [
                overdue ? "Vencida" : null,
                unassigned ? "Sin asignar" : null,
              ].filter(Boolean) as string[];
              return (
                <ListRow
                  key={item.id}
                  title={item.clientDisplayName}
                  badge={
                    <StatusBadge
                      label={getStatusLabel(item.status)}
                      tone={getStatusTone(item.status)}
                    />
                  }
                  subtitle={`${item.careRequestTypeDisplayName || item.careRequestType} · ${formatCurrency(item.total)}`}
                  metaLines={[
                    item.assignedNurseDisplayName ?? "Sin enfermera asignada",
                    flags.length > 0 ? flags.join(" · ") : null,
                  ]}
                  railColor={railColor}
                  onPress={() => router.push(`/admin/care-requests/${item.id}` as never)}
                  testID={`admin-care-request-card-${item.id}`}
                  accessibilityLabel={`Abrir solicitud de ${item.clientDisplayName}`}
                />
              );
            })}
            </ScrollView>
          </SwipePager>
        )}

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
          testID="admin-care-requests-pagination"
        />
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8 },
  list: { flex: 1 },
  loadingState: { flex: 1, paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14 },
});
