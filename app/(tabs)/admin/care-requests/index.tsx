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
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequests,
  type AdminCareRequestListItemDto,
  type AdminCareRequestStatus,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

type Filter =
  | "Active"
  | "Pending"
  | "Approved"
  | "Overdue"
  | "Unassigned"
  | "Completed"
  | "Rejected"
  | "All";

interface FilterDef {
  key: Filter;
  label: string;
  pillStatus: AdminCareRequestStatus | "Overdue" | "Unassigned" | null;
}

const FILTERS: FilterDef[] = [
  { key: "Active", label: "Activas", pillStatus: null },
  { key: "Pending", label: "Pendientes", pillStatus: "Pending" },
  { key: "Approved", label: "Aprobadas", pillStatus: "Approved" },
  { key: "Overdue", label: "Vencidas", pillStatus: "Overdue" },
  { key: "Unassigned", label: "Sin asignar", pillStatus: "Unassigned" },
  { key: "Completed", label: "Completadas", pillStatus: "Completed" },
  { key: "Rejected", label: "Rechazadas", pillStatus: "Rejected" },
  { key: "All", label: "Todas", pillStatus: null },
];

const PAGE_SIZE = 10;
const SHELL_HORIZONTAL_PADDING = 18;

/**
 * Map the `?view=` deep-link param (used by the dashboard work cards and
 * action-items deep links) to one of our filter chip keys.
 */
function viewParamToFilter(view: string | string[] | undefined): Filter {
  const v = Array.isArray(view) ? view[0] : view;
  switch (v) {
    case "overdue": return "Overdue";
    case "unassigned": return "Unassigned";
    case "pending":
    case "pending-approval":
    case "approved-incomplete":
      return "Pending";
    case "approved": return "Approved";
    case "rejected":
    case "rejected-today":
      return "Rejected";
    case "completed": return "Completed";
    case "all": return "All";
    default: return "Active";
  }
}

function getStatusColors(status: AdminCareRequestStatus | "Overdue" | "Unassigned") {
  switch (status) {
    case "Approved":
      return { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText };
    case "Rejected":
      return { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText };
    case "Completed":
    case "Invoiced":
    case "Paid":
      return { bg: designTokens.color.status.infoBg, fg: designTokens.color.ink.accentStrong };
    case "Cancelled":
    case "Voided":
      return { bg: designTokens.color.surface.secondary, fg: designTokens.color.ink.secondary };
    case "Overdue":
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
    case "Unassigned":
      return { bg: designTokens.color.status.dangerBg, fg: designTokens.color.status.dangerText };
    case "Pending":
    default:
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
  }
}

function getStatusLabel(status: AdminCareRequestStatus) {
  switch (status) {
    case "Approved": return "Aprobada";
    case "Rejected": return "Rechazada";
    case "Completed": return "Completada";
    case "Cancelled": return "Cancelada";
    case "Invoiced": return "Facturada";
    case "Paid": return "Pagada";
    case "Voided": return "Anulada";
    default: return "Pendiente";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function buildPageDisplay(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | "ellipsis"> = [1];
  if (current > 3) out.push("ellipsis");
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  for (let i = lo; i <= hi; i++) out.push(i);
  if (current < total - 2) out.push("ellipsis");
  out.push(total);
  return out;
}

function CareRequestCard({ item }: { item: AdminCareRequestListItemDto }) {
  const statusPalette = getStatusColors(item.status);
  const statusLabel = getStatusLabel(item.status);
  const overdue = item.isOverdueOrStale;
  const unassigned = !item.assignedNurseUserId;
  const railColor = overdue
    ? designTokens.color.status.warningText
    : unassigned
      ? designTokens.color.status.dangerText
      : null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Abrir solicitud de ${item.clientDisplayName}`}
      onPress={() => router.push(`/admin/care-requests/${item.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        railColor && { borderLeftWidth: 4, borderLeftColor: railColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.clientDisplayName}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: statusPalette.bg }]}>
          <Text style={[styles.statusPillText, { color: statusPalette.fg }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {item.careRequestType} · {formatCurrency(item.total)}
      </Text>
      <Text style={styles.cardSubMeta} numberOfLines={1}>
        {item.assignedNurseDisplayName ?? "Sin enfermera asignada"}
      </Text>
      {(overdue || unassigned) ? (
        <View style={styles.flagRow}>
          {overdue ? (
            <View style={[styles.flag, { backgroundColor: designTokens.color.surface.warning }]}>
              <Text style={[styles.flagText, { color: designTokens.color.status.warningText }]}>Vencida</Text>
            </View>
          ) : null}
          {unassigned ? (
            <View style={[styles.flag, { backgroundColor: designTokens.color.status.dangerBg }]}>
              <Text style={[styles.flagText, { color: designTokens.color.status.dangerText }]}>Sin asignar</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export default function AdminCareRequestsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { width: viewportWidth } = useWindowDimensions();
  const pageWidth = Math.max(0, viewportWidth - SHELL_HORIZONTAL_PADDING * 2);
  const params = useLocalSearchParams<{ view?: string }>();
  const initialFilter = useMemo(() => viewParamToFilter(params.view), [params.view]);

  const [items, setItems] = useState<AdminCareRequestListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const filterScrollRef = useRef<ScrollView | null>(null);
  const filterChipPositions = useRef<Record<Filter, number>>({
    Active: 0, Pending: 0, Approved: 0, Overdue: 0, Unassigned: 0, Completed: 0, Rejected: 0, All: 0,
  });

  // If the deep-link `view` changes (navigating between dashboard cards), update the filter.
  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  // Bring the active chip into view whenever the filter changes (e.g. via deep link).
  useEffect(() => {
    const x = filterChipPositions.current[filter];
    if (x === undefined) return;
    // Subtract a small offset so the chip isn't flush against the left edge.
    filterScrollRef.current?.scrollTo({ x: Math.max(0, x - 8), y: 0, animated: true });
  }, [filter]);
  const [currentPage, setCurrentPage] = useState(1);
  const pagerRef = useRef<FlatList<AdminCareRequestListItemDto[]> | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);

    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setIsLoading(true);
    void getAdminCareRequests({ view: "all" })
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "No fue posible cargar solicitudes."))
      .finally(() => setIsLoading(false));
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  useEffect(() => {
    setCurrentPage(1);
    pagerRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [filter]);

  const filtered = useMemo(() => {
    let list = items;
    switch (filter) {
      case "Active":
        list = list.filter((r) => r.status === "Pending" || r.status === "Approved");
        break;
      case "Pending":
      case "Approved":
      case "Completed":
      case "Rejected":
        list = list.filter((r) => r.status === filter);
        break;
      case "Overdue":
        list = list.filter((r) => r.isOverdueOrStale);
        break;
      case "Unassigned":
        list = list.filter((r) => !r.assignedNurseUserId);
        break;
      case "All":
        break;
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
    );
  }, [items, filter]);

  const pages = useMemo(() => {
    if (filtered.length === 0) return [];
    const out: AdminCareRequestListItemDto[][] = [];
    for (let i = 0; i < filtered.length; i += PAGE_SIZE) {
      out.push(filtered.slice(i, i + PAGE_SIZE));
    }
    return out;
  }, [filtered]);

  const totalPages = pages.length;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
      pagerRef.current?.scrollToIndex({ index: totalPages - 1, animated: false });
    }
  }, [currentPage, totalPages]);

  const goToPage = useCallback(
    (n: number) => {
      const target = Math.min(Math.max(1, n), totalPages);
      setCurrentPage(target);
      pagerRef.current?.scrollToIndex({ index: target - 1, animated: true });
    },
    [totalPages],
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
    const out: Record<Filter, number> = {
      Active: 0, Pending: 0, Approved: 0, Overdue: 0, Unassigned: 0,
      Completed: 0, Rejected: 0, All: items.length,
    };
    for (const r of items) {
      if (r.status === "Pending") out.Pending += 1;
      if (r.status === "Approved") out.Approved += 1;
      if (r.status === "Pending" || r.status === "Approved") out.Active += 1;
      if (r.status === "Completed") out.Completed += 1;
      if (r.status === "Rejected") out.Rejected += 1;
      if (r.isOverdueOrStale) out.Overdue += 1;
      if (!r.assignedNurseUserId) out.Unassigned += 1;
    }
    return out;
  }, [items]);

  const display = buildPageDisplay(currentPage, totalPages);

  return (
    <MobileWorkspaceShell
      title="Solicitudes"
      primaryReturnPlacement="header"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      systemActions={[
        {
          label: "Crear",
          onPress: () => router.push("/admin/care-requests/create" as any),
          variant: "primary",
          testID: adminTestIds.careRequests.createButton,
        },
      ]}
      disableScroll
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.filterStrip}>
        <ScrollView
          ref={filterScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count = counts[f.key];
            const palette = f.pillStatus ? getStatusColors(f.pillStatus) : null;
            const badgeBg = palette ? palette.bg : (active ? "rgba(255,255,255,0.25)" : designTokens.color.surface.secondary);
            const badgeFg = palette ? palette.fg : (active ? designTokens.color.ink.inverse : designTokens.color.ink.primary);
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                onLayout={(e) => {
                  const x = e.nativeEvent.layout.x;
                  filterChipPositions.current[f.key] = x;
                  // If this chip is the active one, bring it into view as soon as
                  // we know its x-position (initial layout + deep-link case).
                  if (f.key === filter) {
                    filterScrollRef.current?.scrollTo({ x: Math.max(0, x - 8), y: 0, animated: true });
                  }
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
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
      ) : filtered.length === 0 ? (
        <View style={styles.loadingState}>
          <Text style={styles.emptyText}>No hay solicitudes en este filtro.</Text>
        </View>
      ) : (
        <View style={styles.pagerWrap}>
          <FlatList
            ref={pagerRef}
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
                pressed && currentPage > 1 && styles.pressed,
              ]}
            >
              <Text style={styles.pageNavGlyph}>‹</Text>
            </Pressable>
            {display.map((entry, idx) => {
              if (entry === "ellipsis") return <Text key={`e-${idx}`} style={styles.pageEllipsis}>…</Text>;
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
                    pressed && !active && styles.pressed,
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
                pressed && currentPage < totalPages && styles.pressed,
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
  filterCount: { minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, alignItems: "center" },
  filterCountText: { fontSize: 11, fontWeight: "900" },

  pagerWrap: { flex: 1, minHeight: 0 },
  page: { flex: 1 },
  listContent: { paddingBottom: 12 },
  separator: { height: 12 },

  card: {
    backgroundColor: mobileTheme.colors.surface.primary,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 1,
    padding: 14,
    gap: 4,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, color: mobileTheme.colors.ink.primary, fontSize: 16, fontWeight: "900" },
  cardMeta: { color: mobileTheme.colors.ink.primary, fontSize: 13, fontWeight: "700" },
  cardSubMeta: { color: mobileTheme.colors.ink.secondary, fontSize: 12, fontWeight: "600" },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: "800" },
  flagRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  flag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  flagText: { fontSize: 11, fontWeight: "900" },

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
  pageNavGlyph: { color: designTokens.color.ink.primary, fontSize: 22, lineHeight: 22, fontWeight: "800" },
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

  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.35 },
  loadingState: { flex: 1, paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14 },
  error: {
    backgroundColor: designTokens.color.status.dangerBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.color.border.danger,
    color: designTokens.color.status.dangerText,
    padding: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
});
