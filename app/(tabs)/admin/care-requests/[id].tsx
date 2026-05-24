import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import {
  getAdminCareRequestDetail,
  type AdminCareRequestDetailDto,
  type AdminCareRequestStatus,
} from "@/src/services/adminPortalService";
import { mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import {
  formatAdminCareRequestStatusLabel,
  getBillingTaskActions,
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

const BILLING_TEST_IDS: Record<string, string> = {
  invoice: adminTestIds.careRequests.detail.invoiceButton,
  pay: adminTestIds.careRequests.detail.payButton,
  void: adminTestIds.careRequests.detail.voidButton,
  receipt: adminTestIds.careRequests.detail.receiptButton,
};

const BILLING_LABELS: Record<string, string> = {
  invoice: "Facturar",
  pay: "Registrar pago",
  void: "Anular",
  receipt: "Generar recibo",
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
  const [pricingSheetVisible, setPricingSheetVisible] = useState(false);
  const [overflowSheetVisible, setOverflowSheetVisible] = useState(false);
  const [historySheetVisible, setHistorySheetVisible] = useState(false);
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

  const billingTaskActions = useMemo(() => {
    if (!detail) return [];
    return getBillingTaskActions(detail.id, detail.status);
  }, [detail]);

  if (!isReady || !isAuthenticated || !hasAdminAccess) return null;

  // Build the full priority-ordered action set. The bar shows up to MAX_BAR_ACTIONS;
  // anything left over flows into the `⋯` overflow sheet. If everything fits, no overflow.
  const MAX_BAR_ACTIONS = 2;
  const allActions: FooterAction[] = [];
  for (let i = 0; i < billingTaskActions.length; i += 1) {
    const action = billingTaskActions[i];
    allActions.push({
      label: BILLING_LABELS[action.action] ?? action.label,
      onPress: () => router.push(action.route as any),
      variant: "secondary", // promoted to primary below if first
      testID: BILLING_TEST_IDS[action.action],
    });
  }

  const systemActions: FooterAction[] = allActions.slice(0, MAX_BAR_ACTIONS).map((a, idx) => ({
    ...a,
    // First slot in the bar gets the primary blue treatment.
    variant: idx === 0 ? "primary" : "secondary",
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
            <ActivityIndicator color={mobileTheme.colors.ink.accentStrong} accessibilityLabel="Cargando..." />
          </View>
        ) : null}

        {detail ? (
          <View style={styles.body}>
            {/* Estado */}
            <View style={[styles.card, railColor && { borderLeftWidth: 4, borderLeftColor: railColor }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEyebrow}>Estado</Text>
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
            </View>

            {/* Cliente */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEyebrow}>Cliente</Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Ver perfil de ${detail.clientDisplayName}`}
                  onPress={() => {
                    hapticFeedback.selection();
                    router.push(`/admin/users/${detail.clientUserId}` as any);
                  }}
                  style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                >
                  <Text style={styles.linkButtonText}>Ver perfil</Text>
                </Pressable>
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>{detail.clientDisplayName}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>{detail.clientEmail}</Text>
              {detail.clientIdentificationNumber ? (
                <Text style={styles.cardMeta} numberOfLines={1}>Cédula: {detail.clientIdentificationNumber}</Text>
              ) : null}
            </View>

            {/* Asignación */}
            <View
              style={[
                styles.card,
                unassigned && { borderLeftWidth: 4, borderLeftColor: designTokens.color.status.warningText },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEyebrow}>Asignación</Text>
                {detail.assignedNurseUserId ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Ver perfil de enfermera ${detail.assignedNurseDisplayName}`}
                    onPress={() => {
                      hapticFeedback.selection();
                      router.push(`/admin/nurse-profiles/${detail.assignedNurseUserId}` as any);
                    }}
                    style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.linkButtonText}>Ver perfil</Text>
                  </Pressable>
                ) : null}
              </View>
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

            {/* Servicio (compact) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardEyebrow}>Servicio</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver desglose de precios"
                  onPress={() => {
                    hapticFeedback.selection();
                    setPricingSheetVisible(true);
                  }}
                  style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
                >
                  <Text style={styles.linkButtonText}>Ver desglose</Text>
                </Pressable>
              </View>
              <View style={styles.servicioGrid}>
                <View style={styles.servicioCol}>
                  <Text style={styles.servicioLabel}>Tipo</Text>
                  <Text style={styles.servicioValue} numberOfLines={1}>{detail.careRequestType}</Text>
                </View>
                <View style={styles.servicioCol}>
                  <Text style={styles.servicioLabel}>Unidades</Text>
                  <Text style={styles.servicioValue} numberOfLines={1}>{detail.unit} {detail.unitType}</Text>
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
                <Text style={styles.cardEyebrow}>Facturación</Text>
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
            {detail.timeline.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver historial"
                onPress={() => {
                  hapticFeedback.selection();
                  setHistorySheetVisible(true);
                }}
                style={({ pressed }) => [styles.historyTrigger, pressed && styles.pressed]}
              >
                <Text style={styles.historyTriggerText}>
                  Ver historial · {detail.timeline.length} evento{detail.timeline.length === 1 ? "" : "s"}
                </Text>
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
          timeline={detail.timeline}
          onClose={() => {
            hapticFeedback.selection();
            setHistorySheetVisible(false);
          }}
        />
      ) : null}
    </>
  );
}

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

const styles = StyleSheet.create({
  body: { flex: 1, gap: 10 },
  hiddenMarker: { height: 0, width: 0, opacity: 0 },
  historyTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.surface.secondary,
    borderWidth: 1, borderColor: mobileTheme.colors.border.subtle,
  },
  historyTriggerText: {
    color: mobileTheme.colors.ink.accent, fontSize: 13, fontWeight: "900",
  },
  historyTriggerChevron: {
    color: mobileTheme.colors.ink.muted, fontSize: 20, fontWeight: "800", lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: designTokens.color.status.dangerBg,
    color: designTokens.color.status.dangerText,
    padding: 12, borderRadius: 12, fontWeight: "700",
    borderWidth: 1, borderColor: designTokens.color.border.danger,
    marginBottom: 8,
  },
  loadingState: { paddingVertical: 48, alignItems: "center" },

  card: {
    backgroundColor: mobileTheme.colors.surface.primary,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 1,
    padding: 14,
    gap: 6,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardEyebrow: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6,
  },
  cardTitle: { color: mobileTheme.colors.ink.primary, fontSize: 17, lineHeight: 22, fontWeight: "900" },
  cardMeta: { color: mobileTheme.colors.ink.secondary, fontSize: 12, fontWeight: "600" },

  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: "800" },

  flagRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  flag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  flagText: { fontSize: 11, fontWeight: "900" },

  linkButton: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  linkButtonText: { color: mobileTheme.colors.ink.accent, fontSize: 13, fontWeight: "900" },

  servicioGrid: { flexDirection: "row", gap: 14, marginTop: 4 },
  servicioCol: { flex: 1, minWidth: 0 },
  servicioLabel: {
    color: mobileTheme.colors.ink.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase",
  },
  servicioValue: {
    color: mobileTheme.colors.ink.primary, fontSize: 14, fontWeight: "800", marginTop: 2,
  },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 8, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: mobileTheme.colors.border.subtle,
  },
  totalLabel: { color: mobileTheme.colors.ink.secondary, fontSize: 13, fontWeight: "800" },
  totalValue: { color: mobileTheme.colors.ink.accent, fontSize: 22, fontWeight: "900" },

  billingBlock: { gap: 2, paddingVertical: 4 },
  billingLabel: {
    color: mobileTheme.colors.ink.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase",
  },
  billingValue: { color: mobileTheme.colors.ink.primary, fontSize: 13, fontWeight: "700" },

  timelineRow: {
    paddingVertical: 8, gap: 2,
    borderBottomWidth: 1, borderBottomColor: mobileTheme.colors.border.subtle,
  },
  timelineWhen: { color: mobileTheme.colors.ink.muted, fontSize: 11, fontWeight: "700" },
  timelineTitle: { color: mobileTheme.colors.ink.primary, fontSize: 13, fontWeight: "800" },
  timelineBody: { color: mobileTheme.colors.ink.secondary, fontSize: 12 },

  overflowButton: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  overflowGlyph: {
    fontSize: 22, fontWeight: "900", color: mobileTheme.colors.ink.primary, lineHeight: 22,
  },

  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  sheet: {
    maxHeight: "86%", minHeight: "58%",
    backgroundColor: designTokens.color.surface.primary,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 12,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetTitle: { color: designTokens.color.ink.primary, fontSize: 20, fontWeight: "900" },
  sheetSubtitle: { color: designTokens.color.ink.secondary, fontSize: 13, fontWeight: "700", marginTop: 2 },
  sheetClose: {
    minHeight: 38, borderRadius: 12, paddingHorizontal: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: designTokens.color.surface.secondary,
  },
  sheetCloseText: { color: designTokens.color.ink.primary, fontWeight: "800" },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingBottom: 8 },

  priceRow: {
    flexDirection: "row", justifyContent: "space-between", gap: 16,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: designTokens.color.border.subtle,
  },
  priceRowEmphasis: { borderTopWidth: 2, borderTopColor: designTokens.color.ink.accent, marginTop: 2 },
  priceLabel: { color: designTokens.color.ink.secondary, fontSize: 14, flex: 1 },
  priceValue: { color: designTokens.color.ink.primary, fontSize: 14, fontWeight: "800", textAlign: "right", flex: 1 },
  priceTextEmphasis: { color: designTokens.color.ink.accent, fontSize: 16, fontWeight: "900" },

  overflowList: { gap: 10, paddingTop: 4 },
  overflowAction: {
    minHeight: 52, borderRadius: 14, borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 16,
  },
  overflowActionText: { fontSize: 15, fontWeight: "900", color: designTokens.color.ink.primary },

  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
});
