import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { FilterChips, type FilterChipOption } from "@/src/components/shared/FilterChips";
import { Pagination } from "@/src/components/shared/Pagination";
import { usePagedList } from "@/src/hooks/usePagedList";
import { SwipePager } from "@/src/components/shared/SwipePager";
import { designTokens } from "@/src/design-system/tokens";
import { formatDateES, formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { nextQuincenaAfter, quincenaLabel, type PaymentDatePolicy } from "@/src/utils/payrollPeriods";
import { getPaymentDatePolicy } from "@/src/services/payrollPaymentPolicy";
import {
  getPayrollPeriods,
  getPayrollPeriodById,
  createPayrollPeriod,
  updatePayrollPeriod,
  deletePayrollPeriod,
  closePayrollPeriod,
  recalculatePayroll,
  type AdminPayrollPeriodDetail,
  type CreatePayrollPeriodRequest,
  type RecalculatePayrollResult,
} from "@/src/services/payrollService";
import {
  PeriodListItem,
  CreatePeriodModal,
  PeriodDetail,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function formatTriggeredAt(value: string) {
  return formatDateTimeES(value) || value;
}

type Mode = "list" | "detail" | "recalc-review";
type StatusFilter = "" | "Open" | "Closed";

const STATUS_FILTER_OPTIONS: ReadonlyArray<FilterChipOption<StatusFilter>> = [
  { key: "", label: "Todos" },
  { key: "Open", label: "Abiertos" },
  { key: "Closed", label: "Cerrados" },
];

const PAGE_SIZE = 10;

export default function PeriodsScreen() {
  const { roles, isReady, isAuthenticated, requiresProfileCompletion } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const [mode, setMode] = useState<Mode>("list");
  const [selectedPeriod, setSelectedPeriod] = useState<AdminPayrollPeriodDetail | null>(null);
  const [detailActions, setDetailActions] = useState<FooterAction[]>([]);
  const [selectedPeriodLoading, setSelectedPeriodLoading] = useState(false);
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AdminPayrollPeriodDetail | null>(null);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [recalculateResult, setRecalculateResult] = useState<RecalculatePayrollResult | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  // Admin-configured payment-date policy that drives the standard-period prefill. Defaults
  // (undefined here / DEFAULT_PAYMENT_DATE_POLICY in the util) reproduce the original behavior,
  // so a fetch failure simply leaves the prefill on the default schedule.
  const [paymentPolicy, setPaymentPolicy] = useState<PaymentDatePolicy | undefined>(undefined);
  const paymentPolicyRef = useRef<PaymentDatePolicy | undefined>(undefined);
  paymentPolicyRef.current = paymentPolicy;

  const isReady$ = isReady && isAuthenticated;

  useEffect(() => {
    if (!isReady$) return;
    let cancelled = false;
    void (async () => {
      try {
        const policy = await getPaymentDatePolicy();
        if (!cancelled) setPaymentPolicy(policy);
      } catch {
        // Leave the default behavior in place if the policy cannot be loaded.
      }
    })();
    return () => { cancelled = true; };
  }, [isReady$]);

  const {
    items: periodItems,
    totalCount,
    page,
    pageCount,
    isLoading: periodsLoading,
    isRefreshing: periodsRefreshing,
    error: periodsError,
    setPage,
    refresh: handleRefresh,
    reload: reloadPeriods,
  } = usePagedList({
    fetcher: useCallback(
      (p: number, ps: number) =>
        getPayrollPeriods({ pageNumber: p, pageSize: ps, status: statusFilter || null }),
      [statusFilter],
    ),
    pageSize: PAGE_SIZE,
    enabled: isReady$,
    resetKey: statusFilter,
  });

  // Keep a ref to the current period items for the quincena preview
  const periodItemsRef = useRef(periodItems);
  periodItemsRef.current = periodItems;

  const handlePeriodPress = useCallback(async (id: string) => {
    try {
      setSelectedPeriodLoading(true);
      const detail = await getPayrollPeriodById(id);
      setSelectedPeriod(detail);
      setMode("detail");
    } catch (e) {
      const message = e instanceof Error ? e.message : "No fue posible abrir el período.";
      showToast({ message, variant: "error" });
    } finally {
      setSelectedPeriodLoading(false);
    }
  }, [showToast]);

  const handleBackToList = useCallback(() => {
    setSelectedPeriod(null);
    setMode("list");
    reloadPeriods();
  }, [reloadPeriods]);

  // Deep link: a notification can open a specific period in detail mode via
  // /admin/payroll/periods?periodId=<id>. Consume it once so returning to the list
  // (or re-renders) does not force the detail view open again.
  const deepLinkParams = useLocalSearchParams<{ periodId?: string }>();
  const deepLinkConsumed = useRef(false);
  useEffect(() => {
    if (!isReady$ || deepLinkConsumed.current) return;
    const periodId = Array.isArray(deepLinkParams.periodId)
      ? deepLinkParams.periodId[0]
      : deepLinkParams.periodId;
    if (!periodId) return;
    deepLinkConsumed.current = true;
    void handlePeriodPress(periodId);
  }, [isReady$, deepLinkParams.periodId, handlePeriodPress]);

  const handleSubmitPeriod = useCallback(async (data: CreatePayrollPeriodRequest) => {
    if (editingPeriod) {
      await updatePayrollPeriod(editingPeriod.id, data);
      showToast({ message: "Período actualizado correctamente", variant: "success" });
      const detail = await getPayrollPeriodById(editingPeriod.id);
      setSelectedPeriod(detail);
    } else {
      await createPayrollPeriod(data);
      showToast({ message: "Período de nómina creado correctamente", variant: "success" });
    }
    reloadPeriods();
  }, [editingPeriod, reloadPeriods, showToast]);

  const handleCreateStandardPeriod = useCallback(() => {
    const data = nextQuincenaAfter(periodItemsRef.current, paymentPolicyRef.current);
    Alert.alert(
      "Crear quincena estándar",
      `Se creará "${quincenaLabel(data.startDate, data.endDate)}":\n\nInicio: ${formatDateES(data.startDate)}\nFin: ${formatDateES(data.endDate)}\nCorte: ${formatDateES(data.cutoffDate)}\nPago: ${formatDateES(data.paymentDate)}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Crear",
          onPress: async () => {
            try {
              await createPayrollPeriod(data);
              showToast({ message: "Período estándar creado correctamente", variant: "success" });
              reloadPeriods();
            } catch (e) {
              const message = e instanceof Error ? e.message : "No fue posible crear el período estándar.";
              showToast({ message, variant: "error" });
            }
          },
        },
      ]
    );
  }, [reloadPeriods, showToast]);

  const handleStartEditPeriod = useCallback(() => {
    if (!selectedPeriod) return;
    setEditingPeriod(selectedPeriod);
    setShowCreatePeriodModal(true);
  }, [selectedPeriod]);

  const handleDeletePeriod = useCallback(async () => {
    if (!selectedPeriod) return;
    try {
      await deletePayrollPeriod(selectedPeriod.id);
      showToast({ message: "Período eliminado correctamente", variant: "success" });
      handleBackToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No fue posible eliminar el período.";
      showToast({ message, variant: "error" });
    }
  }, [selectedPeriod, showToast, handleBackToList]);

  const handleClosePeriod = useCallback(async () => {
    if (!selectedPeriod) return;
    // The detail view surfaces the pre-close warnings and confirms before reaching here,
    // so we acknowledge them on the close call (the backend gate still protects API callers).
    await closePayrollPeriod(selectedPeriod.id, { acknowledgeWarnings: true });
    const detail = await getPayrollPeriodById(selectedPeriod.id);
    setSelectedPeriod(detail);
    showToast({ message: "Período de nómina cerrado correctamente", variant: "success" });
    reloadPeriods();
  }, [selectedPeriod, reloadPeriods, showToast]);

  const handleRecalculate = useCallback(async () => {
    setRecalculateLoading(true);
    try {
      const result = await recalculatePayroll({});
      setRecalculateResult(result);
      setMode("list");
      reloadPeriods();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No fue posible recalcular la nómina.";
      showToast({ message, variant: "error" });
    } finally {
      setRecalculateLoading(false);
    }
  }, [reloadPeriods, showToast]);

  const openPeriodsCount = periodItems.filter((p) => p.status === "Open").length;
  // Local YYYY-MM-DD for "current quincena" detection (the open period containing today).
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const selectedPeriodLabel = selectedPeriod
    ? quincenaLabel(selectedPeriod.startDate, selectedPeriod.endDate)
    : openPeriodsCount > 0
      ? `${openPeriodsCount} período(s) abierto(s)`
      : "No hay períodos abiertos";

  const shellTitle =
    mode === "detail" ? "Detalle de nómina" :
    mode === "recalc-review" ? "Recálculo" :
    "Períodos";

  const handlePrimaryReturn = () => {
    if (mode === "recalc-review") {
      setMode("list");
      return;
    }
    if (mode === "detail") {
      handleBackToList();
      return;
    }
    goBackOrReplace(router, mobileNavigationEscapes.adminPayroll);
  };

  const workflowActions: FooterAction[] = (() => {
    if (mode === "recalc-review") {
      return [
        {
          label: "Volver",
          onPress: () => setMode("list"),
          variant: "secondary",
          disabled: recalculateLoading,
        },
        {
          label: recalculateLoading ? "Procesando…" : "Confirmar",
          onPress: handleRecalculate,
          variant: "primary",
          disabled: recalculateLoading,
          testID: "admin-payroll-recalculate-confirm-cta",
        },
      ];
    }
    if (mode === "detail") {
      return detailActions;
    }
    const actions: FooterAction[] = [];
    if (totalCount > 0) {
      actions.push({
        label: recalculateLoading ? "Recalculando…" : "Recalcular",
        onPress: () => setMode("recalc-review"),
        variant: "secondary",
        disabled: recalculateLoading,
        testID: "admin-payroll-recalculate-button",
      });
    }
    actions.push({
      label: "+ Estándar",
      onPress: () => void handleCreateStandardPeriod(),
      variant: "primary",
      testID: "admin-payroll-create-standard-period-button",
    });
    actions.push({
      label: "+ Período",
      onPress: () => setShowCreatePeriodModal(true),
      variant: "secondary",
      testID: "admin-payroll-create-period-button",
    });
    return actions;
  })();

  const renderContent = () => {
    if (selectedPeriodLoading) {
      return <LoadingView message="Preparando revisión del período..." />;
    }

    if (mode === "recalc-review") {
      return (
        <ScrollView contentContainerStyle={styles.scrollPad}>
          <View
            style={styles.reviewCard}
            testID="admin-payroll-recalculate-confirm-dialog"
            nativeID="admin-payroll-recalculate-confirm-dialog"
          >
            <Text style={styles.reviewTitle}>Confirmar recálculo</Text>
            <Text style={styles.reviewContext}>{selectedPeriodLabel}</Text>
          </View>
        </ScrollView>
      );
    }

    if (mode === "detail" && selectedPeriod) {
      return (
        <PeriodDetail
          period={selectedPeriod}
          onClose={handleClosePeriod}
          onBack={handleBackToList}
          onPrepareRecalculate={() => setMode("recalc-review")}
          onSetActions={setDetailActions}
          onEdit={handleStartEditPeriod}
          onDelete={handleDeletePeriod}
        />
      );
    }

    return (
      <SwipePager page={page} pageCount={pageCount} onPageChange={setPage} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollPad}
          refreshControl={
            <RefreshControl refreshing={periodsRefreshing} onRefresh={handleRefresh} />
          }
        >
        {!periodsLoading && (
          <Text testID="admin-payroll-loaded" nativeID="admin-payroll-loaded" style={styles.readyMarker}>
            {" "}
          </Text>
        )}

        <FilterChips
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(key) => setStatusFilter(key)}
          testIDPrefix="periods-filter"
        />

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{totalCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Abiertos</Text>
            <Text style={styles.statValue}>{openPeriodsCount}</Text>
          </View>
        </View>

        {recalculateResult && (
          <View
            style={styles.summaryCard}
            testID="admin-payroll-recalculate-summary"
            nativeID="admin-payroll-recalculate-summary"
          >
            <Text style={styles.summaryTitle}>Recálculo completado</Text>
            <Text style={styles.summaryRow}>
              Líneas: <Text style={styles.summaryValue}>{recalculateResult.linesAffected}</Text>
              {"  ·  "}
              Antes: <Text style={styles.summaryValue}>{formatCurrency(recalculateResult.totalOldNet)}</Text>
              {"  ·  "}
              Ahora: <Text style={styles.summaryValue}>{formatCurrency(recalculateResult.totalNewNet)}</Text>
            </Text>
            <Text style={styles.summaryFooter}>{formatTriggeredAt(recalculateResult.triggeredAtUtc)}</Text>
          </View>
        )}

        {periodsError && !periodsLoading ? (
          <ErrorView message={periodsError} onRetry={reloadPeriods} />
        ) : periodsLoading ? (
          <LoadingView message="Cargando períodos..." />
        ) : periodItems.length === 0 ? (
          <Text style={styles.emptyHint}>
            {statusFilter
              ? "No hay períodos que coincidan con el filtro."
              : "No hay períodos. Toca + Período para crear el primero."}
          </Text>
        ) : (
          <View style={styles.list} testID="admin-payroll-periods-list" nativeID="admin-payroll-periods-list">
            {periodItems.map((period) => (
              <PeriodListItem
                key={period.id}
                period={period}
                onPress={handlePeriodPress}
                isCurrent={
                  period.status === "Open" &&
                  period.startDate.slice(0, 10) <= todayIso &&
                  todayIso <= period.endDate.slice(0, 10)
                }
              />
            ))}
            <Pagination
              currentPage={page}
              totalPages={pageCount}
              onPageChange={setPage}
              testID="periods-pagination"
            />
          </View>
        )}
        </ScrollView>
      </SwipePager>
    );
  };

  return (
    <MobileWorkspaceShell
      title={shellTitle}
      description={mode === "list" ? "Quincenas de pago. Crea, cierra y recalcula cada período." : undefined}
      onPrimaryReturn={handlePrimaryReturn}
      primaryReturnLabel="Volver"
      workflowActions={workflowActions}
    >
      <View style={styles.screen} testID="admin-payroll-screen" nativeID="admin-payroll-screen">
        {renderContent()}
      </View>

      <CreatePeriodModal
        visible={showCreatePeriodModal}
        onClose={() => { setShowCreatePeriodModal(false); setEditingPeriod(null); }}
        onSubmit={handleSubmitPeriod}
        existingPeriods={periodItems}
        paymentPolicy={paymentPolicy}
        period={editingPeriod ? {
          startDate: editingPeriod.startDate,
          endDate: editingPeriod.endDate,
          cutoffDate: editingPeriod.cutoffDate,
          paymentDate: editingPeriod.paymentDate,
        } : null}
      />
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollPad: {
    paddingBottom: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  readyMarker: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 1,
    width: 1,
    opacity: 0,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: designTokens.radius.xl,
    backgroundColor: designTokens.color.surface.secondary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  statCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: designTokens.spacing.sm,
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: designTokens.color.border.subtle,
    marginHorizontal: designTokens.spacing.sm,
  },
  statLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  emptyHint: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.xl,
    textAlign: "center",
  },
  reviewCard: {
    marginTop: designTokens.spacing.sm,
    padding: designTokens.spacing.lg,
    borderRadius: designTokens.radius.xl,
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    gap: designTokens.spacing.xs,
  },
  reviewTitle: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  reviewContext: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.label.fontSize,
  },
  summaryCard: {
    padding: designTokens.spacing.md,
    borderRadius: designTokens.radius.xl,
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    gap: designTokens.spacing.xs,
  },
  summaryTitle: {
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryRow: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.label.fontSize,
  },
  summaryValue: {
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  summaryFooter: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
  },
  list: {
    paddingTop: designTokens.spacing.xs,
    gap: designTokens.spacing.sm,
  },
});
