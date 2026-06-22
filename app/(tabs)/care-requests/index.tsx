import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { FilterSelect } from "@/src/components/shared/FilterSelect";
import { logClientEvent } from "@/src/logging/clientLogger";
import { acceptAssignment, getCareRequests, rejectAssignment } from "@/src/services/careRequestService";
import { CareRequestDto } from "@/src/types/careRequest";
import { canAccessCareRequests, canSeeClientPricing } from "@/src/utils/authRedirect";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { formatDOP } from "@/src/utils/currency";
import { usePaginatedList } from "@/src/hooks/usePaginatedList";
import { designTokens } from "@/src/design-system/tokens";
import { navigationTestIds } from "@/src/testing/testIds/navigationTestIds";
import { careRequestTestIds } from "@/src/testing/testIds";
import { hapticFeedback } from "@/src/utils/haptics";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { OfflineSnapshotBanner } from "@/src/components/shared/OfflineSnapshotBanner";
import { SnapshotBuckets } from "@/src/services/apiSnapshotCache";

type StatusFilter = "Active" | "Pending" | "Asignada" | "Approved" | "Completed" | "Rejected" | "Cancelled" | "All";

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

// Nurses only manage the statuses tied to their assigned work — assignments
// awaiting her response (Asignada), the active (assigned/approved) services, and
// the ones she has completed. Rejected / cancelled / pending-triage chips are
// admin/client concerns and would only add noise.
const NURSE_FILTERS: FilterDef[] = [
  { key: "Active", label: "Activas", status: null },
  { key: "Asignada", label: "Por responder", status: "Asignada" },
  { key: "Approved", label: "Aprobadas", status: "Approved" },
  { key: "Completed", label: "Completadas", status: "Completed" },
];

function getStatusColors(status: CareRequestDto["status"]) {
  switch (status) {
    case "Asignada":
      // Awaiting the nurse's accept/reject response — distinct purple "action needed" tone.
      return { bg: designTokens.color.palette.purple.soft, fg: designTokens.color.palette.purple.text };
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
    case "Asignada": return "Asignada";
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

function CareRequestCard({
  item,
  showClientBilling,
  assignmentActions,
}: {
  item: CareRequestDto;
  // ADMIN/CLIENT see the client billing badge (Facturado/Pagado…). Nurses do
  // not — they see their own pay instead.
  showClientBilling: boolean;
  // Present only for a nurse viewing one of HER `Asignada` requests: a quick
  // accept/reject pair so she can respond without opening the detail screen.
  assignmentActions?: {
    onAccept: () => void;
    onReject: () => void;
    busy: boolean;
  } | null;
}) {
  const colors = getStatusColors(item.status);
  const statusLabel = getStatusLabel(item.status);
  const paymentBadge = showClientBilling ? getPaymentBadgeProps(item) : null;
  const showNursePay = !showClientBilling && item.nurseExpectedPay != null;
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
        <Text style={styles.cardMeta}>
          {item.careRequestDate ? `Servicio ${item.careRequestDate}` : `Creada ${formatDateTimeES(item.createdAtUtc)}`}
        </Text>
        {paymentBadge ? (
          <StatusBadge
            label={paymentBadge.label}
            tone={paymentBadge.tone}
            testID={`care-request-payment-badge-${item.id}`}
          />
        ) : showNursePay ? (
          <Text
            style={styles.nursePay}
            testID={`care-request-nurse-pay-${item.id}`}
            nativeID={`care-request-nurse-pay-${item.id}`}
          >
            Pago: {formatDOP(item.nurseExpectedPay)}
          </Text>
        ) : null}
      </View>
      {assignmentActions ? (
        <View style={styles.assignmentActionsRow}>
          <Pressable
            testID={careRequestTestIds.list.rejectAssignment(item.id)}
            nativeID={careRequestTestIds.list.rejectAssignment(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Rechazar asignación"
            disabled={assignmentActions.busy}
            onPress={assignmentActions.onReject}
            style={({ pressed }) => [
              styles.assignmentBtn,
              styles.assignmentBtnReject,
              assignmentActions.busy && styles.disabled,
              pressed && !assignmentActions.busy && styles.buttonPressed,
            ]}
          >
            <Text style={styles.assignmentBtnRejectText}>Rechazar</Text>
          </Pressable>
          <Pressable
            testID={careRequestTestIds.list.acceptAssignment(item.id)}
            nativeID={careRequestTestIds.list.acceptAssignment(item.id)}
            accessibilityRole="button"
            accessibilityLabel="Aceptar asignación"
            disabled={assignmentActions.busy}
            onPress={assignmentActions.onAccept}
            style={({ pressed }) => [
              styles.assignmentBtn,
              styles.assignmentBtnAccept,
              assignmentActions.busy && styles.disabled,
              pressed && !assignmentActions.busy && styles.buttonPressed,
            ]}
          >
            <Text style={styles.assignmentBtnAcceptText}>Aceptar</Text>
          </Pressable>
        </View>
      ) : null}
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
  const { isAuthenticated, isReady, roles, userId, requiresProfileCompletion, requiresAdminReview } = useAuth();
  const canOpenCareRequests = canAccessCareRequests({ roles, requiresProfileCompletion, requiresAdminReview });
  const { width: viewportWidth } = useWindowDimensions();
  const pageWidth = Math.max(0, viewportWidth - SHELL_HORIZONTAL_PADDING * 2);

  const [filter, setFilter] = useState<StatusFilter>("Active");
  const [currentPage, setCurrentPage] = useState(1);
  const pagerRef = useRef<FlatList<CareRequestDto[]> | null>(null);

  // Quick accept/reject of an assignment from the list (nurse, status `Asignada`).
  const [assignmentBusyId, setAssignmentBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CareRequestDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

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

  // Cache bucket includes the user's primary role so each role keeps its own
  // snapshot of the care-requests list — an admin's queue is not interchangeable
  // with a nurse's assigned requests or a client's own requests.
  const primaryRole = roles.includes("ADMIN") ? "admin" : roles.includes("NURSE") ? "nurse" : "client";
  const { data, isLoading, isRefreshing, refresh, error, isStale, staleCapturedAtUtc } = usePaginatedList(fetchFn, {
    cacheBucket: SnapshotBuckets.careRequestsList(primaryRole),
  });

  const handleAcceptAssignment = useCallback(
    async (item: CareRequestDto) => {
      hapticFeedback.selection();
      setAssignmentBusyId(item.id);
      setAssignmentError(null);
      try {
        await acceptAssignment(item.id);
        hapticFeedback.success();
        await refresh();
      } catch (e: any) {
        hapticFeedback.error();
        setAssignmentError(e?.message ?? "No fue posible aceptar la asignación.");
      } finally {
        setAssignmentBusyId(null);
      }
    },
    [refresh],
  );

  const submitRejectAssignment = useCallback(async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setAssignmentError("Debes indicar el motivo del rechazo.");
      return;
    }
    hapticFeedback.selection();
    setAssignmentBusyId(rejectTarget.id);
    setAssignmentError(null);
    try {
      await rejectAssignment(rejectTarget.id, reason);
      hapticFeedback.success();
      setRejectTarget(null);
      setRejectReason("");
      await refresh();
    } catch (e: any) {
      hapticFeedback.error();
      setAssignmentError(e?.message ?? "No fue posible rechazar la asignación.");
    } finally {
      setAssignmentBusyId(null);
    }
  }, [refresh, rejectReason, rejectTarget]);

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
    else if (filter === "Active")
      items = data.filter((r) => r.status === "Pending" || r.status === "Asignada" || r.status === "Approved");
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
      Active: 0, Pending: 0, Asignada: 0, Approved: 0, Completed: 0, Rejected: 0, Cancelled: 0, All: data.length,
    };
    for (const r of data) {
      if (r.status === "Pending" || r.status === "Asignada" || r.status === "Approved") out.Active += 1;
      if (r.status in out) {
        out[r.status as StatusFilter] = (out[r.status as StatusFilter] ?? 0) + 1;
      }
    }
    return out;
  }, [data]);

  const display = buildPageDisplay(currentPage, totalPages);

  // Nurses (non-admin) get a role-trimmed status filter set and never see the
  // client billing badge (they see their own pay instead).
  const isNurseViewer = roles.includes("NURSE") && !roles.includes("ADMIN");
  const availableFilters = isNurseViewer ? NURSE_FILTERS : FILTERS;
  const showClientBilling = canSeeClientPricing(roles);

  const filterOptions = availableFilters.map((f) => ({
    key: f.key,
    label: f.label,
    count: counts[f.key],
    tint: f.status ? getStatusColors(f.status) : null,
  }));

  return (
    <MobileWorkspaceShell
      title="Solicitudes"
      primaryReturnPlacement="header"
      primaryReturnLabel="Volver al inicio"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.clientHome)}
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
      {isStale ? (
        <View style={styles.staleBannerWrap}>
          <OfflineSnapshotBanner
            capturedAtUtc={staleCapturedAtUtc ?? undefined}
            onRetry={refresh}
            retrying={isRefreshing}
            testID="care-requests-offline-banner"
          />
        </View>
      ) : null}

      {assignmentError && !rejectTarget ? (
        <Text style={styles.assignmentErrorBanner} testID={careRequestTestIds.list.assignmentError}>
          {assignmentError}
        </Text>
      ) : null}

      <View style={styles.filterStrip}>
        <FilterSelect<StatusFilter>
          label="Estado"
          options={filterOptions}
          value={filter}
          onChange={setFilter}
          testIDPrefix="care-requests-filter"
        />
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
                  renderItem={({ item }) => {
                    const canRespond =
                      isNurseViewer && item.status === "Asignada" && Boolean(userId) && item.assignedNurse === userId;
                    return (
                      <CareRequestCard
                        item={item}
                        showClientBilling={showClientBilling}
                        assignmentActions={
                          canRespond
                            ? {
                                onAccept: () => void handleAcceptAssignment(item),
                                onReject: () => {
                                  hapticFeedback.selection();
                                  setAssignmentError(null);
                                  setRejectReason("");
                                  setRejectTarget(item);
                                },
                                busy: assignmentBusyId === item.id,
                              }
                            : null
                        }
                      />
                    );
                  }}
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

      <Modal
        visible={rejectTarget != null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (assignmentBusyId) return;
          setRejectTarget(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID={careRequestTestIds.list.rejectSheet}>
            <Text style={styles.modalTitle}>Rechazar asignación</Text>
            <Text style={styles.modalBody}>
              Indica el motivo del rechazo. La administración lo usará para reasignar la solicitud.
            </Text>
            <TextInput
              testID={careRequestTestIds.list.rejectReasonInput}
              nativeID={careRequestTestIds.list.rejectReasonInput}
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Motivo del rechazo"
              placeholderTextColor={designTokens.color.ink.muted}
              multiline
              editable={!assignmentBusyId}
              accessibilityLabel="Motivo del rechazo"
            />
            {assignmentError ? (
              <Text style={styles.modalError} testID={careRequestTestIds.list.rejectError}>
                {assignmentError}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                disabled={Boolean(assignmentBusyId)}
                onPress={() => {
                  hapticFeedback.selection();
                  setRejectTarget(null);
                  setRejectReason("");
                  setAssignmentError(null);
                }}
                style={({ pressed }) => [
                  styles.assignmentBtn,
                  styles.modalCancelBtn,
                  assignmentBusyId && styles.disabled,
                  pressed && !assignmentBusyId && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                testID={careRequestTestIds.list.rejectConfirmButton}
                nativeID={careRequestTestIds.list.rejectConfirmButton}
                accessibilityRole="button"
                accessibilityLabel="Confirmar rechazo"
                disabled={Boolean(assignmentBusyId)}
                onPress={() => void submitRejectAssignment()}
                style={({ pressed }) => [
                  styles.assignmentBtn,
                  styles.modalConfirmBtn,
                  assignmentBusyId && styles.disabled,
                  pressed && !assignmentBusyId && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {assignmentBusyId ? "Enviando..." : "Rechazar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  filterStrip: { paddingBottom: designTokens.spacing.md },
  staleBannerWrap: { paddingBottom: designTokens.spacing.sm },
  // Wrap onto as many rows as needed so every status filter is visible at once (no horizontal scroll).
  filterContent: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm,
    borderRadius: designTokens.radius.pill, borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm,
  },
  filterChipActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  filterChipText: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.label.fontSize, fontWeight: "800" },
  filterChipTextActive: { color: designTokens.color.ink.inverse },
  filterCount: {
    minWidth: 22, paddingHorizontal: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs,
    borderRadius: designTokens.radius.pill, alignItems: "center",
  },
  filterCountText: { fontSize: designTokens.typography.caption.fontSize, fontWeight: "900" },

  pagerWrap: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 0 },
  listContent: { paddingBottom: designTokens.spacing.md },
  separator: { height: 14 },

  paginationBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.md, paddingBottom: designTokens.spacing.sm,
  },
  pageNav: {
    width: 36, height: 36, borderRadius: designTokens.radius.pill,
    borderWidth: 1, borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center", justifyContent: "center",
  },
  pageNavGlyph: {
    color: designTokens.color.ink.primary, fontSize: designTokens.typography.title.fontSize, lineHeight: 22, fontWeight: "800",
  },
  pageChip: {
    minWidth: 36, height: 36, paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.pill, borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center", justifyContent: "center",
  },
  pageChipActive: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.ink.accent,
  },
  pageChipText: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.label.fontSize, fontWeight: "800" },
  pageChipTextActive: { color: designTokens.color.ink.inverse },
  pageEllipsis: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.body.fontSize, fontWeight: "900", paddingHorizontal: designTokens.spacing.xs },

  buttonPressed: { opacity: 0.78 },
  disabled: { opacity: 0.35 },
  errorCard: {
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: designTokens.radius.xl, padding: designTokens.spacing.lg, marginBottom: designTokens.spacing.xl,
  },
  errorTitle: { color: designTokens.color.ink.danger, fontWeight: "800", fontSize: designTokens.typography.body.fontSize, marginBottom: designTokens.spacing.sm },
  errorBody: { color: designTokens.color.status.dangerText, lineHeight: 20 },
  loadingState: { flex: 1, paddingVertical: designTokens.spacing.huge, alignItems: "center", justifyContent: "center" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.body.fontSize },
  card: {
    backgroundColor: designTokens.color.ink.inverse,
    borderRadius: designTokens.radius.xl, padding: designTokens.spacing.xl,
    borderWidth: 1, borderColor: designTokens.color.border.subtle,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: designTokens.spacing.md, marginBottom: designTokens.spacing.md },
  cardTitle: { flex: 1, color: designTokens.color.ink.primary, fontSize: designTokens.typography.section.fontSize, lineHeight: 24, fontWeight: "800" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.xs },
  cardMeta: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.label.fontSize, lineHeight: 19, flex: 1 },
  nursePay: { color: designTokens.color.status.successText, fontSize: designTokens.typography.label.fontSize, fontWeight: "800" },

  assignmentActionsRow: {
    flexDirection: "row", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.md,
  },
  assignmentBtn: {
    flex: 1, minHeight: 44, borderRadius: designTokens.radius.pill,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm, borderWidth: 1,
  },
  assignmentBtnAccept: {
    backgroundColor: designTokens.color.status.successText, borderColor: designTokens.color.status.successText,
  },
  assignmentBtnAcceptText: {
    color: designTokens.color.ink.inverse, fontWeight: "800", fontSize: designTokens.typography.label.fontSize,
  },
  assignmentBtnReject: {
    backgroundColor: designTokens.color.surface.primary, borderColor: designTokens.color.status.dangerText,
  },
  assignmentBtnRejectText: {
    color: designTokens.color.status.dangerText, fontWeight: "800", fontSize: designTokens.typography.label.fontSize,
  },
  modalCancelBtn: {
    backgroundColor: designTokens.color.surface.primary, borderColor: designTokens.color.border.strong,
  },
  modalCancelBtnText: {
    color: designTokens.color.ink.primary, fontWeight: "800", fontSize: designTokens.typography.label.fontSize,
  },
  assignmentErrorBanner: {
    color: designTokens.color.status.dangerText, backgroundColor: designTokens.color.surface.danger,
    borderRadius: designTokens.radius.lg, padding: designTokens.spacing.md, marginBottom: designTokens.spacing.sm,
    fontSize: designTokens.typography.label.fontSize, fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center", justifyContent: "center", padding: designTokens.spacing.xl,
  },
  modalCard: {
    width: "100%", backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.xl, padding: designTokens.spacing.xl, gap: designTokens.spacing.md,
  },
  modalTitle: {
    color: designTokens.color.ink.primary, fontSize: designTokens.typography.section.fontSize, fontWeight: "800",
  },
  modalBody: {
    color: designTokens.color.ink.muted, fontSize: designTokens.typography.label.fontSize, lineHeight: 19,
  },
  modalInput: {
    minHeight: 80, borderWidth: 1, borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.lg, padding: designTokens.spacing.md,
    color: designTokens.color.ink.primary, fontSize: designTokens.typography.body.fontSize,
    textAlignVertical: "top",
  },
  modalError: { color: designTokens.color.status.dangerText, fontSize: designTokens.typography.label.fontSize, fontWeight: "700" },
  modalActions: { flexDirection: "row", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.xs },
  modalConfirmBtn: {
    backgroundColor: designTokens.color.status.dangerText, borderColor: designTokens.color.status.dangerText,
  },
  modalConfirmBtnText: {
    color: designTokens.color.ink.inverse, fontWeight: "800", fontSize: designTokens.typography.label.fontSize,
  },
});
