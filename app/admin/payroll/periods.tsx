import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { designTokens } from "@/src/design-system/tokens";
import { formatDateES, formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { nextQuincenaAfter } from "@/src/utils/payrollPeriods";
import {
  getPayrollPeriods,
  getPayrollPeriodById,
  createPayrollPeriod,
  updatePayrollPeriod,
  deletePayrollPeriod,
  closePayrollPeriod,
  recalculatePayroll,
  type AdminPayrollPeriodListResult,
  type AdminPayrollPeriodDetail,
  type CreatePayrollPeriodRequest,
  type RecalculatePayrollResult,
} from "@/src/services/payrollService";
import SearchFilterBar from "@/src/components/shared/SearchFilterBar";
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

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "Open", label: "Abiertos" },
  { value: "Closed", label: "Cerrados" },
];

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
  const [periodList, setPeriodList] = useState<AdminPayrollPeriodListResult | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<AdminPayrollPeriodDetail | null>(null);
  const [detailActions, setDetailActions] = useState<FooterAction[]>([]);
  const [selectedPeriodLoading, setSelectedPeriodLoading] = useState(false);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState<string | null>(null);
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AdminPayrollPeriodDetail | null>(null);
  const [periodsRefreshing, setPeriodsRefreshing] = useState(false);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [recalculateResult, setRecalculateResult] = useState<RecalculatePayrollResult | null>(null);

  // Search + filter state
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchedRef = useRef(false);

  const loadPeriods = useCallback(async (status?: string) => {
    try {
      setPeriodsError(null);
      setPeriodsLoading(true);
      const data = await getPayrollPeriods({ pageNumber: 1, pageSize: 50, status: status ?? statusFilter ?? null });
      setPeriodList(data);
    } catch (e) {
      setPeriodsError(e instanceof Error ? e.message : "Error al cargar períodos");
    } finally {
      setPeriodsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadPeriods();
  }, [isReady, isAuthenticated, loadPeriods]);

  // Status filter changes reload explicitly from the chip press (see onPress below),
  // so there is no filter effect that would double-fire on mount.
  const applyStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setPeriodList(null);
    void loadPeriods(status);
  }, [loadPeriods]);

  const handleRefresh = useCallback(async () => {
    setPeriodsRefreshing(true);
    try {
      await loadPeriods();
    } finally {
      setPeriodsRefreshing(false);
    }
  }, [loadPeriods]);

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
    void loadPeriods();
  }, [loadPeriods]);

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
    void loadPeriods();
  }, [editingPeriod, loadPeriods, showToast]);

  const handleCreateStandardPeriod = useCallback(() => {
    // Preview the computed quincena dates before creating — the owner confirms what will be made.
    const data = nextQuincenaAfter(periodList?.items ?? []);
    Alert.alert(
      "Crear quincena estándar",
      `Se creará la quincena:\n\nInicio: ${formatDateES(data.startDate)}\nFin: ${formatDateES(data.endDate)}\nCorte: ${formatDateES(data.cutoffDate)}\nPago: ${formatDateES(data.paymentDate)}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Crear",
          onPress: async () => {
            try {
              await createPayrollPeriod(data);
              showToast({ message: "Período estándar creado correctamente", variant: "success" });
              void loadPeriods();
            } catch (e) {
              const message = e instanceof Error ? e.message : "No fue posible crear el período estándar.";
              showToast({ message, variant: "error" });
            }
          },
        },
      ]
    );
  }, [periodList, loadPeriods, showToast]);

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
    await closePayrollPeriod(selectedPeriod.id);
    const detail = await getPayrollPeriodById(selectedPeriod.id);
    setSelectedPeriod(detail);
    showToast({ message: "Período de nómina cerrado correctamente", variant: "success" });
    void loadPeriods();
  }, [selectedPeriod, loadPeriods, showToast]);

  const handleRecalculate = useCallback(async () => {
    setRecalculateLoading(true);
    try {
      const result = await recalculatePayroll({});
      setRecalculateResult(result);
      setMode("list");
      void loadPeriods();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No fue posible recalcular la nómina.";
      showToast({ message, variant: "error" });
    } finally {
      setRecalculateLoading(false);
    }
  }, [loadPeriods, showToast]);

  const filteredItems = periodList?.items.filter((p) => {
    if (!searchQuery) return true;
    // Periods don't have nurse names; filter by date range text for UX consistency
    const text = `${p.startDate} ${p.endDate} ${p.status}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  }) ?? [];

  const openPeriodsCount = periodList?.items.filter((p) => p.status === "Open").length ?? 0;
  const selectedPeriodLabel = selectedPeriod
    ? `${formatDateES(selectedPeriod.startDate)} – ${formatDateES(selectedPeriod.endDate)}`
    : openPeriodsCount > 0
      ? `${openPeriodsCount} período(s) abierto(s)`
      : "No hay períodos abiertos";

  // Shell title is context-sensitive
  const shellTitle =
    mode === "detail" ? "Detalle de nómina" :
    mode === "recalc-review" ? "Recálculo" :
    "Períodos";

  // onPrimaryReturn pops the inner state first, then goes to hub
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

  // Footer actions per mode
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
    // list mode
    const actions: FooterAction[] = [];
    if ((periodList?.totalCount ?? 0) > 0) {
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
      <ScrollView
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

        <SearchFilterBar
          searchPlaceholder="Buscar por fecha o estado"
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearch={() => setSearchQuery(searchValue)}
          onClear={() => { setSearchValue(""); setSearchQuery(""); }}
          filters={
            <View style={styles.chipRow}>
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value;
                return (
                  <Pressable
                    key={f.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => applyStatusFilter(f.value)}
                    accessibilityRole="button"
                    accessibilityLabel={f.label}
                    accessibilityState={{ selected: active }}
                    testID={`periods-filter-${f.value || "all"}`}
                    nativeID={`periods-filter-${f.value || "all"}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          }
        />

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Abiertos</Text>
            <Text style={styles.statValue}>{openPeriodsCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{periodList?.totalCount ?? 0}</Text>
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
          <ErrorView message={periodsError} onRetry={loadPeriods} />
        ) : periodsLoading ? (
          <LoadingView message="Cargando períodos..." />
        ) : filteredItems.length === 0 ? (
          <Text style={styles.emptyHint}>
            {searchQuery || statusFilter
              ? "No hay períodos que coincidan con los filtros."
              : "No hay períodos. Toca + Período para crear el primero."}
          </Text>
        ) : (
          <View style={styles.list} testID="admin-payroll-periods-list" nativeID="admin-payroll-periods-list">
            {filteredItems.map((period) => (
              <PeriodListItem
                key={period.id}
                period={period}
                onPress={handlePeriodPress}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
        existingPeriods={periodList?.items ?? []}
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
    paddingBottom: 16,
  },
  readyMarker: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 1,
    width: 1,
    opacity: 0,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: designTokens.radius.pill,
    backgroundColor: designTokens.color.surface.tertiary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  chipActive: {
    backgroundColor: designTokens.color.ink.accent,
    borderColor: designTokens.color.ink.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
  },
  chipTextActive: {
    color: designTokens.color.ink.inverse,
  },
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: designTokens.radius.xl,
    backgroundColor: designTokens.color.surface.secondary,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  statCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: designTokens.color.border.subtle,
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.ink.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  emptyHint: {
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    textAlign: "center",
  },
  reviewCard: {
    marginTop: 8,
    padding: 14,
    borderRadius: designTokens.radius.xl,
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    gap: 4,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  reviewContext: {
    color: designTokens.color.ink.secondary,
    fontSize: 13,
  },
  summaryCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: designTokens.radius.xl,
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryRow: {
    color: designTokens.color.ink.primary,
    fontSize: 13,
  },
  summaryValue: {
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  summaryFooter: {
    color: designTokens.color.ink.secondary,
    fontSize: 11,
  },
  list: {
    paddingTop: 4,
  },
});
