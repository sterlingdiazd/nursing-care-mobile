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
import { FilterSelect } from "@/src/components/shared/FilterSelect";
import { getStatusPillColors } from "@/src/utils/adminCareRequestBilling";
import { ListRow } from "@/src/components/shared/ListRow";
import { Pagination } from "@/src/components/shared/Pagination";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Banner } from "@/src/components/shared/Banner";
import { designTokens } from "@/src/design-system/tokens";
import { useAuth } from "@/src/context/AuthContext";
import { usePagedList } from "@/src/hooks/usePagedList";
import { SwipePager } from "@/src/components/shared/SwipePager";
import {
  getAdminCareRequests,
  getAdminCareRequestCounts,
  type AdminCareRequestListItemDto,
  type AdminCareRequestStatus,
  type AdminCareRequestView,
  type AdminCareRequestViewCountsDto,
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

// Ordered + grouped by lifecycle phase so the status colors cluster logically in the picker.
const FILTER_OPTIONS: ReadonlyArray<{ key: Filter; label: string; group?: string }> = [
  { key: "All", label: "Todas" },
  { key: "Pending", label: "Pendientes", group: "Por atender" },
  { key: "Unassigned", label: "Sin asignar", group: "Por atender" },
  { key: "Overdue", label: "Vencidas", group: "Por atender" },
  { key: "Approved", label: "Aprobadas", group: "En curso" },
  { key: "Completed", label: "Completadas", group: "En curso" },
  { key: "Invoiced", label: "Facturadas", group: "Cobro" },
  { key: "PaymentReported", label: "Pago reportado", group: "Cobro" },
  { key: "Paid", label: "Pagadas", group: "Cobro" },
  { key: "Rejected", label: "Rechazadas", group: "Cerradas" },
  { key: "Cancelled", label: "Canceladas", group: "Cerradas" },
  { key: "Voided", label: "Anuladas", group: "Cerradas" },
];

/** Soft status tint {bg,fg} per filter — fills the whole option row (canonical status colors). */
function filterTint(key: Filter): { bg: string; fg: string } | null {
  const p = designTokens.color.palette;
  if (key === "All") return null;
  if (key === "Unassigned") return { bg: p.orange.soft, fg: p.orange.text };
  if (key === "Overdue") return { bg: p.red.soft, fg: p.red.text };
  return getStatusPillColors(key);
}

/** Per-view count from the counts endpoint, so every status shows its number (not just the active one). */
function countForFilter(key: Filter, counts: AdminCareRequestViewCountsDto | null): number | undefined {
  if (!counts) return undefined;
  switch (key) {
    case "All": return counts.all;
    case "Pending": return counts.pending;
    case "Unassigned": return counts.unassigned;
    case "Overdue": return counts.overdue;
    case "Approved": return counts.approved;
    case "Completed": return counts.completed;
    case "Invoiced": return counts.invoiced;
    case "PaymentReported": return counts.paymentReported;
    case "Paid": return counts.paid;
    case "Rejected": return counts.rejected;
    case "Cancelled": return counts.cancelled;
    case "Voided": return counts.voided;
    default: return undefined;
  }
}

const PAGE_SIZE = 10;

export default function AdminCareRequestsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const params = useLocalSearchParams<{ view?: string }>();
  const [filter, setFilter] = useState<Filter>(() => viewParamToFilter(params.view));

  const isEnabled = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");
  const [counts, setCounts] = useState<AdminCareRequestViewCountsDto | null>(null);

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

  // Load per-status counts so the filter shows every number at once. Refetched when the filter
  // changes (and totalCount shifts) so counts stay fresh after create/transition actions.
  useEffect(() => {
    if (!isEnabled) return;
    let cancelled = false;
    getAdminCareRequestCounts()
      .then((next) => { if (!cancelled) setCounts(next); })
      .catch(() => { /* counts are non-critical; the list still works */ });
    return () => { cancelled = true; };
  }, [isEnabled, filter, totalCount]);

  if (!isEnabled) return null;

  const filterOptions = FILTER_OPTIONS.map((opt) => ({
    ...opt,
    count: countForFilter(opt.key, counts) ?? (opt.key === filter ? totalCount : undefined),
    tint: filterTint(opt.key),
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
        <FilterSelect
          label="Estado"
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
              // Motivo chips next to the status: WHY this request needs attention (and what to do).
              // The status badge stays the real lifecycle state (e.g. Pendiente); these explain the view.
              const motivo = (overdue || unassigned) ? (
                <View style={styles.motivoRow}>
                  {overdue ? (
                    <View style={[styles.motivoChip, { backgroundColor: designTokens.color.palette.amber.soft }]}>
                      <Text style={[styles.motivoText, { color: designTokens.color.palette.amber.text }]}>Vencida</Text>
                    </View>
                  ) : null}
                  {unassigned ? (
                    <View style={[styles.motivoChip, { backgroundColor: designTokens.color.palette.red.soft }]}>
                      <Text style={[styles.motivoText, { color: designTokens.color.palette.red.text }]}>Sin asignar</Text>
                    </View>
                  ) : null}
                </View>
              ) : null;
              return (
                <ListRow
                  key={item.id}
                  title={item.clientDisplayName}
                  badge={
                    <StatusBadge
                      label={getStatusLabel(item.status)}
                      colors={getStatusPillColors(item.status)}
                    />
                  }
                  subtitle={`${item.careRequestTypeDisplayName || item.careRequestType} · ${formatCurrency(item.total)}`}
                  metaLines={[item.assignedNurseDisplayName ?? "Sin enfermera asignada"]}
                  railColor={railColor}
                  onPress={() => router.push(`/admin/care-requests/${item.id}` as never)}
                  testID={`admin-care-request-card-${item.id}`}
                  accessibilityLabel={`Abrir solicitud de ${item.clientDisplayName}`}
                >
                  {motivo}
                </ListRow>
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
  container: { flex: 1, gap: designTokens.spacing.sm },
  list: { flex: 1 },
  loadingState: { flex: 1, paddingVertical: designTokens.spacing.huge, alignItems: "center", justifyContent: "center" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.body.fontSize },
  motivoRow: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.xs },
  motivoChip: { borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs },
  motivoText: { fontSize: designTokens.typography.caption.fontSize, fontWeight: "800" },
});
