import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { logClientEvent } from "@/src/logging/clientLogger";
import { getCareRequests } from "@/src/services/careRequestService";
import { CareRequestDto } from "@/src/types/careRequest";
import { canAccessCareRequests } from "@/src/utils/authRedirect";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { usePaginatedList } from "@/src/hooks/usePaginatedList";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";
import { hapticFeedback } from "@/src/utils/haptics";

type StatusFilter = "Active" | "Pending" | "Approved" | "Completed" | "Rejected" | "Cancelled" | "All";

interface FilterDef {
  key: StatusFilter;
  label: string;
  status: CareRequestDto["status"] | null;
}

const FILTERS: FilterDef[] = [
  { key: "Active", label: "Activas", status: null },
  { key: "Pending", label: "Pendientes", status: "Pending" },
  { key: "Approved", label: "Aprobadas", status: "Approved" },
  { key: "Completed", label: "Completadas", status: "Completed" },
  { key: "Rejected", label: "Rechazadas", status: "Rejected" },
  { key: "Cancelled", label: "Canceladas", status: "Cancelled" },
  { key: "All", label: "Todas", status: null },
];

function getStatusColors(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved":
      return { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText };
    case "Rejected":
      return { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText };
    case "Completed":
      return { bg: designTokens.color.status.infoBg, fg: designTokens.color.ink.accentStrong };
    case "Cancelled":
      return { bg: designTokens.color.surface.secondary, fg: designTokens.color.ink.secondary };
    default:
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
  }
}

function getStatusLabel(status: CareRequestDto["status"]) {
  switch (status) {
    case "Approved": return "Aprobada";
    case "Rejected": return "Rechazada";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    default: return "Pendiente";
  }
}

/**
 * Returns a payment status badge label and tone for statuses where the client
 * needs to see billing progress at a glance. Returns null for pre-billing statuses
 * where the payment status adds no information (Pending/Approved/Rejected/Cancelled).
 */
function getPaymentBadgeProps(item: CareRequestDto): { label: string; tone: "neutral" | "warning" | "success" | "danger" } | null {
  const ps = item.paymentStatus;
  if (!ps || ps === "Pendiente de factura") {
    // Only show the payment badge once the service is completed/invoiced/paid/voided.
    if (item.status !== "Completed" && item.status !== "Invoiced" &&
        item.status !== "PaymentReported" && item.status !== "Paid" && item.status !== "Voided") {
      return null;
    }
    return { label: "Pendiente de factura", tone: "neutral" };
  }
  if (ps === "Facturado") return { label: "Facturado", tone: "warning" };
  if (ps === "Pagado") return { label: "Pagado", tone: "success" };
  if (ps === "Anulado") return { label: "Anulado", tone: "danger" };
  return null;
}

function CareRequestCard({ item }: { item: CareRequestDto }) {
  const colors = getStatusColors(item.status);
  const statusLabel = getStatusLabel(item.status);
  const paymentBadge = getPaymentBadgeProps(item);
  return (
    <Pressable
      testID={`care-request-card-${item.id}`}
      nativeID={`care-request-card-${item.id}`}
      accessibilityRole="link"
      accessibilityLabel={`Ver detalle de solicitud: ${item.careRequestDescription}`}
      onPress={() => {
        hapticFeedback.selection();
        router.push({
          pathname: "/(tabs)/care-requests/[id]",
          params: { id: item.id },
        } as never);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.careRequestDescription}
        </Text>
        <StatusBadge label={statusLabel} colors={{ bg: colors.bg, fg: colors.fg }} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>Creada {formatDateTimeES(item.createdAtUtc)}</Text>
        {paymentBadge ? (
          <StatusBadge
            label={paymentBadge.label}
            tone={paymentBadge.tone}
            testID={`care-request-payment-badge-${item.id}`}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const PAGE_SIZE = 10;
const SHELL_HORIZONTAL_PADDING = 18;

/**
 * Render the visible window of page numbers around the current page.
 * Always shows first and last; uses ellipsis for gaps.
 */
function buildPageDisplay(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: Array<number | "ellipsis"> = [1];
  if (current > 3) out.push("ellipsis");
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  for (let i = lo; i <= hi; i++) out.push(i);
  if (current < total - 2) out.push("ellipsis");
  out.push(total);
  return out;
}

export default function CareRequestsScreen() {
  const { isAuthenticated, isReady, roles, requiresProfileCompletion, requiresAdminReview } = useAuth();
  const canOpenCareRequests = canAccessCareRequests({ roles, requiresProfileCompletion, requiresAdminReview });
  const { width: viewportWidth } = useWindowDimensions();
  const pageWidth = Math.max(0, viewportWidth - SHELL_HORIZONTAL_PADDING * 2);

  const [filter, setFilter] = useState<StatusFilter>("Active");
  const [currentPage, setCurrentPage] = useState(1);
  const pagerRef = useRef<FlatList<CareRequestDto[]> | null>(null);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
    pagerRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [filter]);

  const fetchFn = useCallback(
    async (_page: number, _pageSize: number) => {
      if (!isAuthenticated || !canOpenCareRequests) {
        return { items: [], totalCount: 0, hasMore: false };
      }
      const response = await getCareRequests();
      logClientEvent("mobile.ui", "Care requests loaded", { count: response.length });
      return { items: response, totalCount: response.length, hasMore: false };
    },
    [isAuthenticated, canOpenCareRequests],
  );

  const { data, isLoading, isRefreshing, refresh, error } = usePaginatedList(fetchFn);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!canOpenCareRequests) {
      router.replace("/(tabs)");
      return;
    }
  }, [canOpenCareRequests, isAuthenticated, isReady]);

  const filtered = useMemo(() => {
    let items: CareRequestDto[];
    if (filter === "All") items = data;
    else if (filter === "Active") items = data.filter((r) => r.status === "Pending" || r.status === "Approved");
    else items = data.filter((r) => r.status === filter);
    return [...items].sort(
      (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
    );
  }, [data, filter]);

  // Slice the filtered list into pages of PAGE_SIZE.
  const pages = useMemo(() => {
    if (filtered.length === 0) return [];
    const out: CareRequestDto[][] = [];
    for (let i = 0; i < filtered.length; i += PAGE_SIZE) {
      out.push(filtered.slice(i, i + PAGE_SIZE));
    }
    return out;
  }, [filtered]);

  const totalPages = pages.length;

  // Clamp current page if filter shrinks the dataset
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
      pagerRef.current?.scrollToIndex({ index: totalPages - 1, animated: false });
    }
  }, [currentPage, totalPages]);

  const goToPage = useCallback(
    (n: number) => {
      const target = Math.min(Math.max(1, n), totalPages);
      if (target !== currentPage) hapticFeedback.selection();
      setCurrentPage(target);
      pagerRef.current?.scrollToIndex({ index: target - 1, animated: true });
    },
    [currentPage, totalPages],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth === 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      const next = Math.min(Math.max(0, idx), Math.max(0, totalPages - 1));
      setCurrentPage(next + 1);
    },
    [pageWidth, totalPages],
  );

  const counts = useMemo(() => {
    const out: Record<StatusFilter, number> = {
      Active: 0, Pending: 0, Approved: 0, Completed: 0, Rejected: 0, Cancelled: 0, All: data.length,
    };
    for (const r of data) {
      if (r.status === "Pending" || r.status === "Approved") out.Active += 1;
      if (r.status in out) {
        out[r.status as StatusFilter] = (out[r.status as StatusFilter] ?? 0) + 1;
      }
    }
    return out;
  }, [data]);

  const display = buildPageDisplay(currentPage, totalPages);

  return (
    <MobileWorkspaceShell
      title="Solicitudes"
      systemActions={
        roles.includes("CLIENT") || roles.includes("ADMIN")
          ? [
              {
                label: "Crear",
                onPress: () => router.push("/create-care-request" as never),
                variant: "primary",
              },
            ]
          : undefined
      }
      disableScroll
    >
      <View style={styles.filterStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = counts[f.key];
            const statusColors = f.status ? getStatusColors(f.status) : null;
            const badgeBg = statusColors ? statusColors.bg : (active ? "rgba(255,255,255,0.25)" : designTokens.color.surface.secondary);
            const badgeFg = statusColors ? statusColors.fg : (active ? designTokens.color.ink.inverse : designTokens.color.ink.primary);
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  hapticFeedback.selection();
                  setFilter(f.key);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
                <View style={[styles.filterCount, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.filterCountText, { color: badgeFg }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && filtered.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No fue posible cargar las solicitudes</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.loadingState}>
          <Text style={styles.emptyText}>No hay solicitudes en este filtro.</Text>
        </View>
      ) : (
        <View style={styles.pagerWrap}>
          <FlatList
            ref={pagerRef}
            testID={navigationTestIds.screens.careRequestsListRoot}
            nativeID={navigationTestIds.screens.careRequestsListRoot}
            data={pages}
            keyExtractor={(_, idx) => `page-${idx}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
            renderItem={({ item: pageItems }) => (
              <View style={[styles.page, { width: pageWidth }]}>
                <FlatList
                  data={pageItems}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <CareRequestCard item={item} />}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  refreshing={isRefreshing}
                  onRefresh={refresh}
                  contentContainerStyle={styles.listContent}
                />
              </View>
            )}
          />

          <View style={styles.paginationBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Página anterior"
              onPress={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              style={({ pressed }) => [
                styles.pageNav,
                currentPage <= 1 && styles.disabled,
                pressed && currentPage > 1 && styles.buttonPressed,
              ]}
            >
              <Text style={styles.pageNavGlyph}>‹</Text>
            </Pressable>

            {display.map((entry, idx) => {
              if (entry === "ellipsis") {
                return (
                  <Text key={`e-${idx}`} style={styles.pageEllipsis}>…</Text>
                );
              }
              const active = entry === currentPage;
              return (
                <Pressable
                  key={entry}
                  accessibilityRole="button"
                  accessibilityLabel={`Página ${entry}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => goToPage(entry)}
                  style={({ pressed }) => [
                    styles.pageChip,
                    active && styles.pageChipActive,
                    pressed && !active && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.pageChipText, active && styles.pageChipTextActive]}>{entry}</Text>
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Página siguiente"
              onPress={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={({ pressed }) => [
                styles.pageNav,
                currentPage >= totalPages && styles.disabled,
                pressed && currentPage < totalPages && styles.buttonPressed,
              ]}
            >
              <Text style={styles.pageNavGlyph}>›</Text>
            </Pressable>
          </View>
        </View>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  filterStrip: { paddingBottom: 12 },
  filterContent: { flexDirection: "row", gap: 8, paddingRight: 8 },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 999, borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  filterChipText: { color: designTokens.color.ink.primary, fontSize: 13, fontWeight: "800" },
  filterChipTextActive: { color: designTokens.color.ink.inverse },
  filterCount: {
    minWidth: 22, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 999, alignItems: "center",
  },
  filterCountText: { fontSize: 11, fontWeight: "900" },

  pagerWrap: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 0 },
  listContent: { paddingBottom: 12 },
  separator: { height: 14 },

  paginationBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingTop: 12, paddingBottom: 8,
  },
  pageNav: {
    width: 36, height: 36, borderRadius: 999,
    borderWidth: 1, borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center", justifyContent: "center",
  },
  pageNavGlyph: {
    color: designTokens.color.ink.primary, fontSize: 22, lineHeight: 22, fontWeight: "800",
  },
  pageChip: {
    minWidth: 36, height: 36, paddingHorizontal: 10,
    borderRadius: 999, borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center", justifyContent: "center",
  },
  pageChipActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  pageChipText: { color: designTokens.color.ink.primary, fontSize: 13, fontWeight: "800" },
  pageChipTextActive: { color: designTokens.color.ink.inverse },
  pageEllipsis: { color: designTokens.color.ink.muted, fontSize: 16, fontWeight: "900", paddingHorizontal: 4 },

  buttonPressed: { opacity: 0.78 },
  disabled: { opacity: 0.35 },
  errorCard: {
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: 20, padding: 16, marginBottom: 18,
  },
  errorTitle: { color: designTokens.color.ink.danger, fontWeight: "800", fontSize: 15, marginBottom: 6 },
  errorBody: { color: designTokens.color.status.dangerText, lineHeight: 20 },
  loadingState: { flex: 1, paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14 },
  card: {
    backgroundColor: designTokens.color.ink.inverse,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: designTokens.color.border.subtle,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  cardTitle: { flex: 1, color: designTokens.color.ink.primary, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 },
  cardMeta: { color: designTokens.color.ink.muted, fontSize: 13, lineHeight: 19, flex: 1 },
});
