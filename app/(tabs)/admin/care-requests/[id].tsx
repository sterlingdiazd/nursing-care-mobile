import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { IconBadge } from "@/src/components/shared/IconBadge";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequestDetail,
  adminAssignCareRequestNurse,
  adminApproveCareRequest,
  adminRejectCareRequest,
  adminCompleteCareRequest,
  type AdminCareRequestDetailDto,
  type AdminCareRequestStatus,
} from "@/src/services/adminPortalService";
import { getActiveNurseProfiles, type ActiveNurseProfileSummary } from "@/src/services/careRequestService";
import { designTokens } from "@/src/design-system/tokens";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  formatAdminCareRequestStatusLabel,
  formatUnitType,
  getBillingTaskActions,
  getLifecycleActions,
  getLifecycleGuidance,
} from "@/src/utils/adminCareRequestBilling";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";

function automationProps(testId: string) {
  return {
    testID: testId,
    nativeID: testId,
    ...(Platform.OS === "web"
      ? ({ id: testId, "data-testid": testId } as any)
      : null),
  };
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "N/A";
  return formatDateTimeES(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function formatCurrencyOrNA(value: number | null | undefined) {
  return value == null ? "N/A" : formatCurrency(value);
}

function getStatusColors(status: AdminCareRequestStatus) {
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
    case "Pending":
    default:
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
  }
}

/** Derive an overdue detail hint from the care request. */
function formatOverdueHint(detail: AdminCareRequestDetailDto): string {
  if (!detail.careRequestDate) return "Vencida";
  const scheduled = new Date(detail.careRequestDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);
  if (scheduled < today) {
    return "Vencida · fecha pasada";
  }
  const diffDays = Math.floor((today.getTime() - scheduled.getTime()) / 86_400_000);
  return diffDays > 0 ? `Vencida · +${diffDays} días` : "Vencida";
}

function buildNurseLabel(nurse: ActiveNurseProfileSummary) {
  return [nurse.name, nurse.lastName].filter(Boolean).join(" ") || nurse.email;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

const BILLING_TEST_IDS: Record<string, string> = {
  invoice: adminTestIds.careRequests.detail.invoiceButton,
  pay: adminTestIds.careRequests.detail.payButton,
  void: adminTestIds.careRequests.detail.voidButton,
  receipt: adminTestIds.careRequests.detail.receiptButton,
  "credit-note": "admin-care-request-credit-note-button",
};

const BILLING_LABELS: Record<string, string> = {
  invoice: "Facturar",
  pay: "Registrar pago",
  void: "Anular",
  receipt: "Generar recibo",
  "credit-note": "Nota de crédito",
};

const LIFECYCLE_TEST_IDS: Record<string, string> = {
  assign: adminTestIds.careRequests.detail.assignButton,
  approve: adminTestIds.careRequests.detail.approveButton,
  reject: adminTestIds.careRequests.detail.rejectButton,
  complete: adminTestIds.careRequests.detail.completeButton,
};

export default function AdminCareRequestDetailScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { id, billingAction, billingRefresh } = useLocalSearchParams<{
    id: string;
    billingAction?: string;
    billingRefresh?: string;
  }>();
  const [detail, setDetail] = useState<AdminCareRequestDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [pricingSheetVisible, setPricingSheetVisible] = useState(false);
  const [overflowSheetVisible, setOverflowSheetVisible] = useState(false);
  const [historySheetVisible, setHistorySheetVisible] = useState(false);
  const [assignmentSheetVisible, setAssignmentSheetVisible] = useState(false);
  const [rejectSheetVisible, setRejectSheetVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Nurse picker state (reused for assignment sheet)
  const [nurses, setNurses] = useState<ActiveNurseProfileSummary[]>([]);
  const [nurseSearch, setNurseSearch] = useState("");
  const [selectedNurseId, setSelectedNurseId] = useState("");

  const hasAdminAccess = roles.includes("ADMIN");
  const expectedBillingReturnStatus =
    billingAction === "invoice" ? "Invoiced"
    : billingAction === "pay" ? "Paid"
    : billingAction === "void" ? "Voided"
    : null;

  const load = useCallback(async () => {
    if (!id) return null;
    try {
      setError(null);
      setLoading(true);
      const response = await getAdminCareRequestDetail(id);
      setDetail(response);
      return response;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el detalle de la solicitud.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAfterBillingReturn = useCallback(async () => {
    if (!expectedBillingReturnStatus) {
      void load();
      return;
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await load();
      if (response?.status === expectedBillingReturnStatus) return;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }, [expectedBillingReturnStatus, load]);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!hasAdminAccess) return void router.replace("/" as any);
  }, [hasAdminAccess, isAuthenticated, isReady, requiresProfileCompletion]);

  useFocusEffect(
    useCallback(() => {
      if (!isReady || !isAuthenticated || requiresProfileCompletion || !hasAdminAccess) return;
      void load();
    }, [hasAdminAccess, isAuthenticated, isReady, load, requiresProfileCompletion]),
  );

  useEffect(() => {
    if (!billingRefresh) return;
    if (!isReady || !isAuthenticated || requiresProfileCompletion || !hasAdminAccess) return;
    void loadAfterBillingReturn();
  }, [billingRefresh, hasAdminAccess, isAuthenticated, isReady, loadAfterBillingReturn, requiresProfileCompletion]);

  // Load nurses once for the assignment sheet
  useEffect(() => {
    if (!hasAdminAccess) return;
    void getActiveNurseProfiles()
      .then(setNurses)
      .catch(() => setNurses([]));
  }, [hasAdminAccess]);

  const sortedNurses = useMemo(
    () => [...nurses].sort((a, b) => buildNurseLabel(a).localeCompare(buildNurseLabel(b), "es")),
    [nurses],
  );

  const filteredNurses = useMemo(() => {
    const query = normalizeSearch(nurseSearch);
    if (!query) return sortedNurses;
    return sortedNurses.filter((n) =>
      [buildNurseLabel(n), n.email, n.specialty ?? "", n.category ?? ""].some((v) =>
        normalizeSearch(v).includes(query),
      ),
    );
  }, [nurseSearch, sortedNurses]);

  const billingTaskActions = useMemo(() => {
    if (!detail) return [];
    return getBillingTaskActions(detail.id, detail.status);
  }, [detail]);

  const lifecycleActions = useMemo(() => {
    if (!detail) return [];
    return getLifecycleActions(detail.status, Boolean(detail.assignedNurseUserId));
  }, [detail]);

  const guidanceText = useMemo(() => {
    if (!detail) return "";
    return getLifecycleGuidance(detail.status, Boolean(detail.assignedNurseUserId));
  }, [detail]);

  // ── Lifecycle action handlers ─────────────────────────────────────────────

  const runAssign = useCallback(async () => {
    if (!id || !selectedNurseId) return;
    setActing(true);
    setError(null);
    try {
      await adminAssignCareRequestNurse(id, selectedNurseId);
      await load(); // re-fetch the FULL detail; mutation responses can be partial (missing timeline/pricing → crash)
      setAssignmentSheetVisible(false);
      setSelectedNurseId("");
      setNurseSearch("");
    } catch (nextError) {
      hapticFeedback.error();
      setError(nextError instanceof Error ? nextError.message : "No fue posible asignar la enfermera.");
    } finally {
      setActing(false);
    }
  }, [id, selectedNurseId]);

  const runApprove = useCallback(async () => {
    if (!id) return;
    setActing(true);
    setError(null);
    try {
      await adminApproveCareRequest(id);
      await load();
    } catch (nextError) {
      hapticFeedback.error();
      setError(nextError instanceof Error ? nextError.message : "No fue posible aprobar la solicitud.");
    } finally {
      setActing(false);
    }
  }, [id]);

  const runReject = useCallback(async () => {
    if (!id) return;
    setActing(true);
    setError(null);
    try {
      await adminRejectCareRequest(id, rejectReason.trim() || undefined);
      await load();
      setRejectSheetVisible(false);
      setRejectReason("");
    } catch (nextError) {
      hapticFeedback.error();
      setError(nextError instanceof Error ? nextError.message : "No fue posible rechazar la solicitud.");
    } finally {
      setActing(false);
    }
  }, [id, rejectReason]);

  const runComplete = useCallback(async () => {
    if (!id) return;
    setActing(true);
    setError(null);
    try {
      await adminCompleteCareRequest(id);
      await load();
    } catch (nextError) {
      hapticFeedback.error();
      setError(nextError instanceof Error ? nextError.message : "No fue posible completar la solicitud.");
    } finally {
      setActing(false);
    }
  }, [id]);

  const handleLifecycleAction = useCallback((action: string) => {
    hapticFeedback.light();
    switch (action) {
      case "assign":
        setAssignmentSheetVisible(true);
        break;
      case "approve":
        void runApprove();
        break;
      case "reject":
        setRejectSheetVisible(true);
        break;
      case "complete":
        void runComplete();
        break;
    }
  }, [runApprove, runComplete]);

  if (!isReady || !isAuthenticated || !hasAdminAccess) return null;

  // ── Build footer action set ──────────────────────────────────────────────
  // Priority: lifecycle actions first, then billing actions.
  const MAX_BAR_ACTIONS = 2;
  const allActions: FooterAction[] = [];

  for (const lcAction of lifecycleActions) {
    allActions.push({
      label: lcAction.label,
      onPress: () => handleLifecycleAction(lcAction.action),
      variant: lcAction.variant === "danger" ? "danger" : "secondary",
      testID: LIFECYCLE_TEST_IDS[lcAction.action],
      disabled: acting,
    });
  }

  for (const billingAction of billingTaskActions) {
    allActions.push({
      label: BILLING_LABELS[billingAction.action] ?? billingAction.label,
      onPress: () => router.push(billingAction.route as any),
      variant: "secondary",
      testID: BILLING_TEST_IDS[billingAction.action],
    });
  }

  const systemActions: FooterAction[] = allActions.slice(0, MAX_BAR_ACTIONS).map((a, idx) => ({
    ...a,
    variant: idx === 0 && a.variant !== "danger" ? "primary" : a.variant,
  }));
  const overflowActions: FooterAction[] = allActions.slice(MAX_BAR_ACTIONS);
  const hasOverflow = overflowActions.length > 0;

  const statusPalette = detail ? getStatusColors(detail.status) : null;
  const overdue = detail?.isOverdueOrStale ?? false;
  const unassigned = detail ? !detail.assignedNurseUserId : false;
  const railColor = overdue
    ? designTokens.color.status.warningText
    : unassigned
      ? designTokens.color.status.dangerText
      : null;

  return (
    <>
      <MobileWorkspaceShell
        testID={adminTestIds.careRequests.detail.screen}
        nativeID={adminTestIds.careRequests.detail.screen}
        title="Solicitud"
        primaryReturnPlacement="header"
        onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminCareRequests)}
        systemActions={systemActions.length > 0 ? systemActions : undefined}
        headerAccessory={
          hasOverflow ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Más acciones"
              onPress={() => {
                hapticFeedback.selection();
                setOverflowSheetVisible(true);
              }}
              style={({ pressed }) => [styles.overflowButton, pressed && styles.pressed]}
            >
              <Text style={styles.overflowGlyph}>⋯</Text>
            </Pressable>
          ) : undefined
        }
      >
        {!loading && detail && (!expectedBillingReturnStatus || detail.status === expectedBillingReturnStatus) ? (
          <Text {...automationProps(adminTestIds.careRequests.detail.loadedMarker)} style={styles.hiddenMarker}>{" "}</Text>
        ) : null}

        {error ? (
          <Text {...automationProps(adminTestIds.careRequests.detail.errorBanner)} style={styles.errorBanner}>
            {error}
          </Text>
        ) : null}

        {loading && !detail ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
          </View>
        ) : null}

        {detail ? (
          <View style={styles.body}>
            {/* Estado */}
            <View style={[styles.card, railColor && { borderLeftWidth: 4, borderLeftColor: railColor }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.sectionHeaderRow}>
                  <IconBadge icon="info-circle" hue="blue" size={30} iconSize={15} />
                  <Text style={styles.cardEyebrow}>Estado</Text>
                </View>
                {statusPalette ? (
                  <View style={[styles.statusPill, { backgroundColor: statusPalette.bg }]}>
                    <Text
                      {...automationProps(adminTestIds.careRequests.detail.statusBadge)}
                      style={[styles.statusPillText, { color: statusPalette.fg }]}
                    >
                      {formatAdminCareRequestStatusLabel(detail.status)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{detail.careRequestDescription}</Text>

              {/* Overdue flag — secondary chip with reason hint */}
              {(overdue || unassigned) ? (
                <View style={styles.flagRow}>
                  {overdue ? (
                    <View
                      style={[styles.flag, { backgroundColor: designTokens.color.surface.warning }]}
                      {...automationProps(adminTestIds.careRequests.detail.overdueBadge)}
                    >
                      <Text style={[styles.flagText, { color: designTokens.color.status.warningText }]}>
                        {formatOverdueHint(detail)}
                      </Text>
                    </View>
                  ) : null}
                  {unassigned ? (
                    <View style={[styles.flag, { backgroundColor: designTokens.color.status.dangerBg }]}>
                      <Text style={[styles.flagText, { color: designTokens.color.status.dangerText }]}>Sin asignar</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Próximo paso guidance */}
              {guidanceText ? (
                <Text
                  {...automationProps(adminTestIds.careRequests.detail.guidanceLine)}
                  style={styles.guidanceLine}
                >
                  {guidanceText}
                </Text>
              ) : null}
            </View>

            {/* Personas (cliente + enfermera) */}
            <View
              style={[
                styles.card,
                unassigned && { borderLeftWidth: 4, borderLeftColor: designTokens.color.status.warningText },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <IconBadge icon="users" hue="neutral" size={30} iconSize={15} />
                <Text style={styles.cardEyebrow}>Personas</Text>
              </View>

              <View style={styles.personRow}>
                <View style={styles.personInfo}>
                  <Text style={styles.personRole}>Cliente</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>{detail.clientDisplayName}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{detail.clientEmail}</Text>
                  {detail.clientIdentificationNumber ? (
                    <Text style={styles.cardMeta} numberOfLines={1}>Cédula: {detail.clientIdentificationNumber}</Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Ver perfil de ${detail.clientDisplayName}`}
                  onPress={() => {
                    hapticFeedback.selection();
                    router.push(`/admin/users/${detail.clientUserId}` as any);
                  }}
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <Text style={styles.linkText}>Ver perfil ›</Text>
                </Pressable>
              </View>

              <View style={styles.personDivider} />

              <View style={styles.personRow}>
                <View style={styles.personInfo}>
                  <Text style={styles.personRole}>Enfermera</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {detail.assignedNurseDisplayName ?? "Sin enfermera asignada"}
                  </Text>
                  {detail.assignedNurseEmail ? (
                    <Text style={styles.cardMeta} numberOfLines={1}>{detail.assignedNurseEmail}</Text>
                  ) : null}
                  {detail.suggestedNurse && !detail.assignedNurseUserId ? (
                    <Text style={styles.cardMeta} numberOfLines={1}>Sugerida: {detail.suggestedNurse}</Text>
                  ) : null}
                </View>
                {detail.assignedNurseUserId ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Ver perfil de enfermera ${detail.assignedNurseDisplayName}`}
                    onPress={() => {
                      hapticFeedback.selection();
                      router.push(`/admin/nurse-profiles/${detail.assignedNurseUserId}` as any);
                    }}
                    style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                  >
                    <Text style={styles.linkText}>Ver perfil ›</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Servicio (compact) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.sectionHeaderRow}>
                  <IconBadge icon="briefcase" hue="neutral" size={30} iconSize={15} />
                  <Text style={styles.cardEyebrow}>Servicio</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver desglose de precios"
                  onPress={() => {
                    hapticFeedback.selection();
                    setPricingSheetVisible(true);
                  }}
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <Text style={styles.linkText}>Ver desglose ›</Text>
                </Pressable>
              </View>
              <View style={styles.servicioGrid}>
                <View style={styles.servicioCol}>
                  <Text style={styles.servicioLabel}>Tipo</Text>
                  <Text style={styles.servicioValue} numberOfLines={1}>{detail.careRequestTypeDisplayName || detail.careRequestType}</Text>
                </View>
                <View style={styles.servicioCol}>
                  <Text style={styles.servicioLabel}>Unidades</Text>
                  <Text style={styles.servicioValue} numberOfLines={1}>{detail.unit} · {formatUnitType(detail.unitType)}</Text>
                </View>
              </View>
              {detail.careRequestDate ? (
                <Text style={styles.cardMeta} numberOfLines={1}>Fecha: {formatTimestamp(detail.careRequestDate)}</Text>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(detail.total)}</Text>
              </View>
            </View>

            {/* Facturación (compact, solo si hay datos) */}
            {(detail.invoiceNumber || detail.bankReference || detail.voidReason || detail.receiptNumber) ? (
              <View style={styles.card} testID="billing-info-card" nativeID="billing-info-card">
                <View style={styles.sectionHeaderRow}>
                  <IconBadge icon="file-text-o" hue="neutral" size={30} iconSize={15} />
                  <Text style={styles.cardEyebrow}>Facturación</Text>
                </View>
                {detail.invoiceNumber ? (
                  <Text testID="invoice-details-section" nativeID="invoice-details-section" style={styles.billingValue} numberOfLines={1}>
                    Factura #{detail.invoiceNumber} · {formatTimestamp(detail.invoicedAtUtc)}
                  </Text>
                ) : null}
                {detail.bankReference ? (
                  <Text testID="payment-details-section" nativeID="payment-details-section" style={styles.billingValue} numberOfLines={1}>
                    Pago {detail.bankReference} · {formatTimestamp(detail.paidAtUtc)}
                  </Text>
                ) : null}
                {detail.voidReason ? (
                  <Text testID="void-details-section" nativeID="void-details-section" style={styles.billingValue} numberOfLines={1}>
                    Anulación {detail.voidReason} · {formatTimestamp(detail.voidedAtUtc)}
                  </Text>
                ) : null}
                {detail.receiptNumber ? (
                  <Text testID="receipt-details-section" nativeID="receipt-details-section" style={styles.billingValue} numberOfLines={1}>
                    Recibo <Text testID="receipt-number-display" nativeID="receipt-number-display">#{detail.receiptNumber}</Text> · {formatTimestamp(detail.receiptGeneratedAtUtc)}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* Historial trigger (opens sheet) */}
            {(detail.timeline?.length ?? 0) > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver historial"
                onPress={() => {
                  hapticFeedback.selection();
                  setHistorySheetVisible(true);
                }}
                style={({ pressed }) => [styles.historyTrigger, pressed && styles.pressed]}
              >
                <View style={styles.sectionHeaderRow}>
                  <IconBadge icon="history" hue="neutral" size={30} iconSize={15} />
                  <Text style={styles.historyTriggerText}>
                    Ver historial · {detail.timeline?.length ?? 0} evento{(detail.timeline?.length ?? 0) === 1 ? "" : "s"}
                  </Text>
                </View>
                <Text style={styles.historyTriggerChevron}>›</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </MobileWorkspaceShell>

      {detail ? (
        <PricingSheet
          visible={pricingSheetVisible}
          detail={detail}
          onClose={() => {
            hapticFeedback.selection();
            setPricingSheetVisible(false);
          }}
        />
      ) : null}

      <OverflowActionsSheet
        visible={overflowSheetVisible}
        actions={overflowActions}
        onClose={() => {
          hapticFeedback.selection();
          setOverflowSheetVisible(false);
        }}
      />

      {detail ? (
        <HistorySheet
          visible={historySheetVisible}
          timeline={detail.timeline ?? []}
          onClose={() => {
            hapticFeedback.selection();
            setHistorySheetVisible(false);
          }}
        />
      ) : null}

      {/* Assignment sheet — for assigning / re-assigning a nurse */}
      <AdminAssignmentSheet
        visible={assignmentSheetVisible}
        nurses={filteredNurses}
        selectedNurseId={selectedNurseId}
        searchQuery={nurseSearch}
        isSubmitting={acting}
        onSearchChange={setNurseSearch}
        onSelect={(value) => {
          hapticFeedback.selection();
          setSelectedNurseId(value);
        }}
        onClose={() => {
          hapticFeedback.selection();
          setAssignmentSheetVisible(false);
          setSelectedNurseId("");
          setNurseSearch("");
        }}
        onConfirm={() => void runAssign()}
      />

      {/* Reject sheet — captures optional rejection reason */}
      <RejectSheet
        visible={rejectSheetVisible}
        reason={rejectReason}
        isSubmitting={acting}
        onReasonChange={setRejectReason}
        onClose={() => {
          hapticFeedback.selection();
          setRejectSheetVisible(false);
          setRejectReason("");
        }}
        onConfirm={() => void runReject()}
      />
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HistorySheet({
  visible,
  timeline,
  onClose,
}: {
  visible: boolean;
  timeline: AdminCareRequestDetailDto["timeline"];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Historial</Text>
              <Text style={styles.sheetSubtitle}>{timeline.length} evento{timeline.length === 1 ? "" : "s"}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
            {timeline.map((event) => (
              <View key={event.id} style={styles.timelineRow}>
                <Text style={styles.timelineWhen}>{formatTimestamp(event.occurredAtUtc)}</Text>
                <Text style={styles.timelineTitle}>{event.title}</Text>
                {event.description ? (
                  <Text style={styles.timelineBody}>{event.description}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PricingSheet({
  visible,
  detail,
  onClose,
}: {
  visible: boolean;
  detail: AdminCareRequestDetailDto;
  onClose: () => void;
}) {
  const b = detail.pricingBreakdown;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Desglose de precios</Text>
              <Text style={styles.sheetSubtitle}>{formatCurrency(b.total)}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}>
            <PriceRow label="Total" value={formatCurrency(b.total)} emphasis testID="price-breakdown-total" />
            <PriceRow label="Precio base" value={formatCurrency(b.basePrice)} testID="price-breakdown-base-price" />
            {b.categoryFactor != null && Number(b.categoryFactor) !== 1 ? (
              <PriceRow label="Factor de categoría" value={String(b.categoryFactor)} testID="price-breakdown-category-factor" />
            ) : null}
            {b.distanceFactor && Number(b.distanceFactorValue) !== 1 ? (
              <PriceRow label="Factor de distancia" value={`${b.distanceFactor} (×${b.distanceFactorValue})`} testID="price-breakdown-distance-factor" />
            ) : null}
            {b.complexityLevel && Number(b.complexityFactorValue) !== 1 ? (
              <PriceRow label="Factor de complejidad" value={`${b.complexityLevel} (×${b.complexityFactorValue})`} testID="price-breakdown-complexity-factor" />
            ) : null}
            {b.volumeDiscountPercent > 0 ? (
              <PriceRow label="Descuento por volumen" value={`${b.volumeDiscountPercent}%`} testID="price-breakdown-volume-discount" />
            ) : null}
            {b.medicalSuppliesCost > 0 ? (
              <PriceRow label="Insumos médicos" value={formatCurrency(b.medicalSuppliesCost)} testID="price-breakdown-medical-supplies" />
            ) : null}
            <PriceRow label="Categoría" value={b.category} testID="price-breakdown-category" />
            <PriceRow label="Línea antes de descuento" value={formatCurrencyOrNA(b.lineBeforeVolumeDiscount)} testID="price-breakdown-line-before-discount" />
            <PriceRow label="Precio unitario tras descuento" value={formatCurrencyOrNA(b.unitPriceAfterVolumeDiscount)} testID="price-breakdown-unit-price-after-discount" />
            <PriceRow label="Subtotal antes de insumos" value={formatCurrency(b.subtotalBeforeSupplies)} testID="price-breakdown-subtotal-before-supplies" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PriceRow({ label, value, emphasis = false, testID }: { label: string; value: string; emphasis?: boolean; testID: string }) {
  return (
    <View testID={testID} nativeID={testID} style={[styles.priceRow, emphasis && styles.priceRowEmphasis]}>
      <Text style={[styles.priceLabel, emphasis && styles.priceTextEmphasis]}>{label}</Text>
      <Text style={[styles.priceValue, emphasis && styles.priceTextEmphasis]}>{value}</Text>
    </View>
  );
}

function OverflowActionsSheet({
  visible,
  actions,
  onClose,
}: {
  visible: boolean;
  actions: FooterAction[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { minHeight: undefined, maxHeight: "60%" }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Más acciones</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <View style={styles.overflowList}>
            {actions.map((action, idx) => {
              const isDanger = action.variant === "danger";
              return (
                <Pressable
                  key={action.testID ?? idx}
                  testID={action.testID}
                  nativeID={action.testID}
                  onPress={() => {
                    hapticFeedback.light();
                    action.onPress();
                  }}
                  disabled={action.disabled}
                  style={({ pressed }) => [
                    styles.overflowAction,
                    isDanger && {
                      borderColor: designTokens.color.border.danger,
                      backgroundColor: designTokens.color.surface.danger,
                    },
                    action.disabled && styles.disabled,
                    pressed && !action.disabled && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Text style={[styles.overflowActionText, isDanger && { color: designTokens.color.status.dangerText }]}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AdminAssignmentSheet({
  visible, nurses, selectedNurseId, searchQuery, isSubmitting,
  onSearchChange, onSelect, onClose, onConfirm,
}: {
  visible: boolean;
  nurses: ActiveNurseProfileSummary[];
  selectedNurseId: string;
  searchQuery: string;
  isSubmitting: boolean;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View
          style={styles.sheet}
          testID={adminTestIds.careRequests.detail.assignmentSheet}
          nativeID={adminTestIds.careRequests.detail.assignmentSheet}
        >
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Seleccionar enfermera</Text>
              <Text style={styles.sheetSubtitle}>{nurses.length} resultado{nurses.length === 1 ? "" : "s"}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <TextInput
            testID={adminTestIds.careRequests.detail.assignmentSearchInput}
            nativeID={adminTestIds.careRequests.detail.assignmentSearchInput}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Buscar por nombre, correo o especialidad"
            placeholderTextColor={designTokens.color.ink.muted}
            style={styles.searchInput}
            accessibilityLabel="Buscar enfermera"
            autoCapitalize="none"
          />
          <ScrollView style={styles.nurseList} contentContainerStyle={styles.nurseListContent}>
            {nurses.length === 0 ? <Text style={styles.emptyText}>No se encontraron enfermeras.</Text> : null}
            {nurses.map((item) => {
              const selected = selectedNurseId === item.userId;
              const meta = [item.specialty, item.category, item.email].filter(Boolean).join(" · ");
              return (
                <Pressable
                  key={item.userId}
                  testID={adminTestIds.careRequests.detail.assignmentNurseOption(item.userId)}
                  nativeID={adminTestIds.careRequests.detail.assignmentNurseOption(item.userId)}
                  onPress={() => onSelect(item.userId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar enfermera ${buildNurseLabel(item)}`}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.nurseRow,
                    selected && styles.nurseRowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.nurseRowText}>
                    <Text style={styles.nurseName}>{buildNurseLabel(item)}</Text>
                    <Text style={styles.nurseMeta} numberOfLines={1}>
                      {meta || "Sin datos adicionales"}
                    </Text>
                  </View>
                  <Text style={[styles.nurseCheck, selected && styles.nurseCheckSelected]}>
                    {selected ? "Seleccionada" : "Elegir"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            testID={adminTestIds.careRequests.detail.assignmentConfirmButton}
            nativeID={adminTestIds.careRequests.detail.assignmentConfirmButton}
            onPress={() => {
              hapticFeedback.light();
              onConfirm();
            }}
            disabled={isSubmitting || !selectedNurseId}
            style={({ pressed }) => [
              styles.sheetPrimaryButton,
              (isSubmitting || !selectedNurseId) && styles.disabled,
              pressed && !isSubmitting && selectedNurseId ? styles.pressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Confirmar enfermera asignada"
          >
            <Text style={styles.sheetPrimaryButtonText}>
              {isSubmitting ? "Guardando..." : "Confirmar asignación"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RejectSheet({
  visible, reason, isSubmitting,
  onReasonChange, onClose, onConfirm,
}: {
  visible: boolean;
  reason: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View
          style={[styles.sheet, { minHeight: undefined }]}
          testID={adminTestIds.careRequests.detail.rejectSheet}
          nativeID={adminTestIds.careRequests.detail.rejectSheet}
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Rechazar solicitud</Text>
            <Pressable onPress={onClose} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={styles.sheetCloseText}>Cerrar</Text>
            </Pressable>
          </View>
          <Text style={styles.rejectHint}>
            Puedes indicar el motivo del rechazo (opcional). El cliente podrá verlo.
          </Text>
          <TextInput
            testID={adminTestIds.careRequests.detail.rejectReasonInput}
            nativeID={adminTestIds.careRequests.detail.rejectReasonInput}
            value={reason}
            onChangeText={onReasonChange}
            placeholder="Motivo del rechazo (opcional)"
            placeholderTextColor={designTokens.color.ink.muted}
            style={styles.rejectInput}
            multiline
            accessibilityLabel="Motivo del rechazo"
          />
          <Pressable
            testID={adminTestIds.careRequests.detail.rejectConfirmButton}
            nativeID={adminTestIds.careRequests.detail.rejectConfirmButton}
            onPress={() => {
              hapticFeedback.light();
              onConfirm();
            }}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.rejectConfirmButton,
              isSubmitting && styles.disabled,
              pressed && !isSubmitting ? styles.pressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Confirmar rechazo"
          >
            <Text style={styles.rejectConfirmButtonText}>
              {isSubmitting ? "Rechazando..." : "Confirmar rechazo"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: designTokens.spacing.md },
  hiddenMarker: { height: 0, width: 0, opacity: 0 },
  historyTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: designTokens.spacing.lg, paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radius.lg,
    backgroundColor: designTokens.color.surface.secondary,
    borderWidth: 1, borderColor: designTokens.color.border.subtle,
  },
  historyTriggerText: {
    color: designTokens.color.ink.accent, fontSize: designTokens.typography.label.fontSize, fontWeight: "900",
  },
  historyTriggerChevron: {
    color: designTokens.color.ink.muted, fontSize: designTokens.typography.section.fontSize, fontWeight: "800", lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: designTokens.color.status.dangerBg,
    color: designTokens.color.status.dangerText,
    padding: designTokens.spacing.md, borderRadius: designTokens.radius.md, fontWeight: "700",
    borderWidth: 1, borderColor: designTokens.color.border.danger,
    marginBottom: designTokens.spacing.sm,
  },
  loadingState: { paddingVertical: designTokens.spacing.huge, alignItems: "center" },

  guidanceLine: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize, fontWeight: "700",
    marginTop: designTokens.spacing.sm,
    fontStyle: "italic",
  },

  card: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.xl,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 1,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  cardEyebrow: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.caption.fontSize, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6,
  },
  cardTitle: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.section.fontSize, lineHeight: 22, fontWeight: "900" },
  cardMeta: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize, fontWeight: "600" },

  statusPill: { borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs },
  statusPillText: { fontSize: designTokens.typography.caption.fontSize, fontWeight: "800" },

  flagRow: { flexDirection: "row", gap: designTokens.spacing.sm, marginTop: designTokens.spacing.xs },
  flag: { borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs },
  flagText: { fontSize: designTokens.typography.caption.fontSize, fontWeight: "900" },

  // Subtle inline link (no button chrome) — de-emphasized vs the bottom action bar.
  link: { paddingHorizontal: designTokens.spacing.xs, paddingVertical: designTokens.spacing.xs },
  linkText: { color: designTokens.color.ink.accent, fontSize: designTokens.typography.label.fontSize, fontWeight: "800" },

  personRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm },
  personInfo: { flex: 1, minWidth: 0, gap: 0 },
  personRole: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.caption.fontSize, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6,
  },
  personDivider: { height: 1, backgroundColor: designTokens.color.border.subtle, marginVertical: designTokens.spacing.sm },

  servicioGrid: { flexDirection: "row", gap: designTokens.spacing.lg, marginTop: designTokens.spacing.xs },
  servicioCol: { flex: 1, minWidth: 0 },
  servicioLabel: {
    color: designTokens.color.ink.muted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800", textTransform: "uppercase",
  },
  servicioValue: {
    color: designTokens.color.ink.primary, fontSize: designTokens.typography.body.fontSize, fontWeight: "800", marginTop: designTokens.spacing.xs,
  },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: designTokens.spacing.sm, paddingTop: designTokens.spacing.md,
    borderTopWidth: 1, borderTopColor: designTokens.color.border.subtle,
  },
  totalLabel: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.label.fontSize, fontWeight: "800" },
  totalValue: { color: designTokens.color.ink.accent, fontSize: designTokens.typography.title.fontSize, fontWeight: "900" },

  billingBlock: { gap: designTokens.spacing.xs, paddingVertical: designTokens.spacing.xs },
  billingLabel: {
    color: designTokens.color.ink.muted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "800", textTransform: "uppercase",
  },
  billingValue: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.label.fontSize, fontWeight: "700" },

  timelineRow: {
    paddingVertical: designTokens.spacing.sm, gap: designTokens.spacing.xs,
    borderBottomWidth: 1, borderBottomColor: designTokens.color.border.subtle,
  },
  timelineWhen: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "700" },
  timelineTitle: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.label.fontSize, fontWeight: "800" },
  timelineBody: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize },

  overflowButton: {
    width: 40, height: 40, borderRadius: designTokens.radius.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.surface.secondary,
  },
  overflowGlyph: {
    fontSize: designTokens.typography.title.fontSize, fontWeight: "900", color: designTokens.color.ink.primary, lineHeight: 22,
  },

  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  sheet: {
    maxHeight: "86%", minHeight: "58%",
    backgroundColor: designTokens.color.surface.primary,
    borderTopLeftRadius: designTokens.radius.xxl, borderTopRightRadius: designTokens.radius.xxl,
    paddingHorizontal: designTokens.spacing.xl, paddingTop: designTokens.spacing.lg, paddingBottom: designTokens.spacing.xl, gap: designTokens.spacing.md,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md },
  sheetTitle: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.section.fontSize, fontWeight: "900" },
  sheetSubtitle: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.label.fontSize, fontWeight: "700", marginTop: designTokens.spacing.xs },
  sheetClose: {
    minHeight: 38, borderRadius: designTokens.radius.md, paddingHorizontal: designTokens.spacing.lg,
    alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.surface.secondary,
  },
  sheetCloseText: { color: designTokens.color.ink.primary, fontWeight: "800" },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingBottom: designTokens.spacing.sm },

  priceRow: {
    flexDirection: "row", justifyContent: "space-between", gap: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md, borderBottomWidth: 1, borderBottomColor: designTokens.color.border.subtle,
  },
  priceRowEmphasis: { borderTopWidth: 2, borderTopColor: designTokens.color.ink.accent, marginTop: designTokens.spacing.xs },
  priceLabel: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.body.fontSize, flex: 1 },
  priceValue: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.body.fontSize, fontWeight: "800", textAlign: "right", flex: 1 },
  priceTextEmphasis: { color: designTokens.color.ink.accent, fontSize: designTokens.typography.body.fontSize, fontWeight: "900" },

  overflowList: { gap: designTokens.spacing.md, paddingTop: designTokens.spacing.xs },
  overflowAction: {
    minHeight: 52, borderRadius: designTokens.radius.md, borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center", justifyContent: "center", paddingHorizontal: designTokens.spacing.lg,
  },
  overflowActionText: { fontSize: designTokens.typography.body.fontSize, fontWeight: "900", color: designTokens.color.ink.primary },

  // Assignment sheet
  searchInput: {
    minHeight: 48, borderRadius: designTokens.radius.md, borderWidth: 1,
    borderColor: designTokens.color.border.strong,
    backgroundColor: designTokens.color.surface.primary,
    color: designTokens.color.ink.primary, paddingHorizontal: designTokens.spacing.lg, fontSize: designTokens.typography.body.fontSize,
  },
  nurseList: { flex: 1 },
  nurseListContent: { paddingBottom: designTokens.spacing.sm, gap: designTokens.spacing.sm },
  nurseRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md,
    borderRadius: designTokens.radius.md, borderWidth: 1, borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    paddingHorizontal: designTokens.spacing.lg, paddingVertical: designTokens.spacing.md,
  },
  nurseRowSelected: {
    borderColor: designTokens.color.ink.accent,
    backgroundColor: designTokens.color.surface.accent,
  },
  nurseRowText: { flex: 1, minWidth: 0 },
  nurseName: { color: designTokens.color.ink.primary, fontSize: designTokens.typography.body.fontSize, fontWeight: "900" },
  nurseMeta: { color: designTokens.color.ink.secondary, fontSize: designTokens.typography.caption.fontSize, fontWeight: "600", marginTop: designTokens.spacing.xs },
  nurseCheck: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.caption.fontSize, fontWeight: "900" },
  nurseCheckSelected: { color: designTokens.color.ink.accent },
  emptyText: { color: designTokens.color.ink.muted, fontSize: designTokens.typography.body.fontSize, textAlign: "center", paddingVertical: designTokens.spacing.xxl },
  sheetPrimaryButton: {
    minHeight: 50, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.ink.accent,
  },
  sheetPrimaryButtonText: { color: designTokens.color.ink.inverse, fontSize: designTokens.typography.body.fontSize, fontWeight: "900" },

  // Reject sheet
  rejectHint: {
    color: designTokens.color.ink.secondary, fontSize: designTokens.typography.label.fontSize, lineHeight: 19,
  },
  rejectInput: {
    borderWidth: 1, borderColor: designTokens.color.border.strong,
    borderRadius: designTokens.radius.md, padding: designTokens.spacing.md, minHeight: 80,
    color: designTokens.color.ink.primary, textAlignVertical: "top", fontSize: designTokens.typography.body.fontSize,
  },
  rejectConfirmButton: {
    minHeight: 50, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.status.dangerText,
  },
  rejectConfirmButtonText: { color: designTokens.color.ink.inverse, fontSize: designTokens.typography.body.fontSize, fontWeight: "900" },

  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
});
