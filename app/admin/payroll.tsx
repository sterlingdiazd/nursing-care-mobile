import { useEffect, useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert, Pressable } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { designTokens } from "@/src/design-system/tokens";
import {
  getPayrollPeriods,
  getPayrollPeriodById,
  createPayrollPeriod,
  closePayrollPeriod,
  getCompensationRules,
  createCompensationRule,
  updateCompensationRule,
  deactivateCompensationRule,
  getDeductions,
  createDeduction,
  deleteDeduction,
  getAdjustments,
  createAdjustment,
  deleteAdjustment,
  recalculatePayroll,
  type AdminPayrollPeriodListResult,
  type AdminPayrollPeriodDetail,
  type AdminCompensationRuleListItem,
  type AdminCompensationRuleListResult,
  type AdminDeductionListResult,
  type AdminCompensationAdjustmentListResult,
  type CreatePayrollPeriodRequest,
  type CreateCompensationRuleRequest,
  type UpdateCompensationRuleRequest,
  type CreateDeductionRequest,
  type CreateCompensationAdjustmentRequest,
  type RecalculatePayrollResult,
} from "@/src/services/payrollService";
import {
  PeriodListItem,
  CreatePeriodModal,
  PeriodDetail,
  PayrollTabs,
  RuleListItem,
  CreateRuleModal,
  DeductionListItem,
  CreateDeductionModal,
  AdjustmentListItem,
  CreateAdjustmentModal,
  ErrorView,
  LoadingView,
  EmptyView,
} from "@/components/payroll";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

function formatTriggeredAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function AdminPayrollScreen() {
  const { roles, isReady, isAuthenticated, requiresProfileCompletion } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("periods");

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const [periodList, setPeriodList] = useState<AdminPayrollPeriodListResult | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<AdminPayrollPeriodDetail | null>(null);
  const [selectedPeriodLoading, setSelectedPeriodLoading] = useState(false);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [periodsError, setPeriodsError] = useState<string | null>(null);
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [periodsRefreshing, setPeriodsRefreshing] = useState(false);

  const [rules, setRules] = useState<AdminCompensationRuleListResult | null>(null);
  const [selectedRule, setSelectedRule] = useState<AdminCompensationRuleListItem | null>(null);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [rulesRefreshing, setRulesRefreshing] = useState(false);

  const [deductions, setDeductions] = useState<AdminDeductionListResult | null>(null);
  const [deductionsLoading, setDeductionsLoading] = useState(true);
  const [deductionsError, setDeductionsError] = useState<string | null>(null);
  const [showCreateDeductionModal, setShowCreateDeductionModal] = useState(false);
  const [deductionsRefreshing, setDeductionsRefreshing] = useState(false);

  const [adjustments, setAdjustments] = useState<AdminCompensationAdjustmentListResult | null>(null);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(true);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [showCreateAdjustmentModal, setShowCreateAdjustmentModal] = useState(false);
  const [adjustmentsRefreshing, setAdjustmentsRefreshing] = useState(false);

  const [showRecalculateReview, setShowRecalculateReview] = useState(false);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [recalculateResult, setRecalculateResult] = useState<RecalculatePayrollResult | null>(null);

  const loadPeriods = useCallback(async () => {
    try {
      setPeriodsError(null);
      setPeriodsLoading(true);
      const data = await getPayrollPeriods({ pageNumber: 1, pageSize: 20 });
      setPeriodList(data);
    } catch (e) {
      setPeriodsError(e instanceof Error ? e.message : "Error al cargar períodos");
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      setRulesError(null);
      setRulesLoading(true);
      const data = await getCompensationRules();
      setRules(data);
    } catch (e) {
      setRulesError(e instanceof Error ? e.message : "Error al cargar reglas");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  const loadDeductions = useCallback(async () => {
    try {
      setDeductionsError(null);
      setDeductionsLoading(true);
      const data = await getDeductions();
      setDeductions(data);
    } catch (e) {
      setDeductionsError(e instanceof Error ? e.message : "Error al cargar deducciones");
    } finally {
      setDeductionsLoading(false);
    }
  }, []);

  const loadAdjustments = useCallback(async () => {
    try {
      setAdjustmentsError(null);
      setAdjustmentsLoading(true);
      const data = await getAdjustments();
      setAdjustments(data);
    } catch (e) {
      setAdjustmentsError(e instanceof Error ? e.message : "Error al cargar ajustes");
    } finally {
      setAdjustmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    switch (activeTab) {
      case "periods":
        if (!periodList) void loadPeriods();
        break;
      case "rules":
        if (!rules) void loadRules();
        break;
      case "deductions":
        if (!deductions) void loadDeductions();
        break;
      case "adjustments":
        if (!adjustments) void loadAdjustments();
        break;
    }
  }, [activeTab, loadPeriods, loadRules, loadDeductions, loadAdjustments]);

  const handleRefresh = useCallback(async () => {
    setPeriodsRefreshing(true);
    setRulesRefreshing(true);
    setDeductionsRefreshing(true);
    setAdjustmentsRefreshing(true);

    try {
      switch (activeTab) {
        case "periods":
          await loadPeriods();
          break;
        case "rules":
          await loadRules();
          break;
        case "deductions":
          await loadDeductions();
          break;
        case "adjustments":
          await loadAdjustments();
          break;
      }
    } finally {
      setPeriodsRefreshing(false);
      setRulesRefreshing(false);
      setDeductionsRefreshing(false);
      setAdjustmentsRefreshing(false);
    }
  }, [activeTab, loadPeriods, loadRules, loadDeductions, loadAdjustments]);

  const handlePeriodPress = useCallback(async (id: string) => {
    try {
      setSelectedPeriodLoading(true);
      const detail = await getPayrollPeriodById(id);
      setSelectedPeriod(detail);
    } catch (e) {
      const message = e instanceof Error ? e.message : "No fue posible abrir el período.";
      showToast({ message, variant: "error" });
    } finally {
      setSelectedPeriodLoading(false);
    }
  }, [showToast]);

  const handleBackToList = useCallback(() => {
    setSelectedPeriod(null);
    setShowRecalculateReview(false);
    void loadPeriods();
  }, [loadPeriods]);

  const handleCreatePeriod = useCallback(async (data: CreatePayrollPeriodRequest) => {
    await createPayrollPeriod(data);
    setShowCreatePeriodModal(false);
    showToast({ message: "Período de nómina creado correctamente", variant: "success" });
    void loadPeriods();
  }, [loadPeriods, showToast]);

  const handleClosePeriod = useCallback(async () => {
    if (!selectedPeriod) return;
    await closePayrollPeriod(selectedPeriod.id);
    const detail = await getPayrollPeriodById(selectedPeriod.id);
    setSelectedPeriod(detail);
    showToast({ message: "Período de nómina cerrado correctamente", variant: "success" });
    void loadPeriods();
  }, [selectedPeriod, loadPeriods, showToast]);

  const handleRulePress = useCallback((rule: AdminCompensationRuleListItem) => {
    setSelectedRule(rule);
    setShowCreateRuleModal(true);
  }, []);

  const handleCreateRule = useCallback(async (data: CreateCompensationRuleRequest | UpdateCompensationRuleRequest) => {
    if ("employmentType" in data) {
      await createCompensationRule(data as CreateCompensationRuleRequest);
      showToast({ message: "Regla de compensación creada correctamente", variant: "success" });
    } else if (selectedRule) {
      await updateCompensationRule(selectedRule.id, data);
      showToast({ message: "Regla de compensación actualizada correctamente", variant: "success" });
    }
    setShowCreateRuleModal(false);
    setSelectedRule(null);
    void loadRules();
  }, [selectedRule, loadRules, showToast]);

  const handleDeactivateRule = useCallback(async () => {
    if (!selectedRule) return;
    await deactivateCompensationRule(selectedRule.id);
    setShowCreateRuleModal(false);
    setSelectedRule(null);
    showToast({ message: "Regla de compensación desactivada correctamente", variant: "success" });
    void loadRules();
  }, [selectedRule, loadRules, showToast]);

  const handleDeleteDeduction = useCallback(async (deduction: { id: string }) => {
    await deleteDeduction(deduction.id);
    showToast({ message: "Deducción eliminada correctamente", variant: "success" });
    void loadDeductions();
  }, [loadDeductions, showToast]);

  const handleCreateDeduction = useCallback(async (data: CreateDeductionRequest) => {
    await createDeduction(data);
    setShowCreateDeductionModal(false);
    showToast({ message: "Deducción creada correctamente", variant: "success" });
    void loadDeductions();
  }, [loadDeductions, showToast]);

  const handleDeleteAdjustment = useCallback(async (adjustment: { id: string }) => {
    await deleteAdjustment(adjustment.id);
    showToast({ message: "Ajuste eliminado correctamente", variant: "success" });
    void loadAdjustments();
  }, [loadAdjustments, showToast]);

  const handleCreateAdjustment = useCallback(async (data: CreateCompensationAdjustmentRequest) => {
    await createAdjustment(data);
    setShowCreateAdjustmentModal(false);
    showToast({ message: "Ajuste de compensación creado correctamente", variant: "success" });
    void loadAdjustments();
  }, [loadAdjustments, showToast]);

  const handleRecalculate = useCallback(async () => {
    setRecalculateLoading(true);
    try {
      const result = await recalculatePayroll({});
      setRecalculateResult(result);
      setShowRecalculateReview(false);
      // Refresh periods so any derived totals stay current.
      void loadPeriods();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No fue posible recalcular la nómina.";
      showToast({ message, variant: "error" });
    } finally {
      setRecalculateLoading(false);
    }
  }, [loadPeriods, showToast]);

  const openRecalculateReview = useCallback(() => {
    setShowRecalculateReview(true);
  }, []);

  const renderPeriodsTab = () => {
    const openPeriodsCount = periodList?.items.filter((period) => period.status === "Open").length ?? 0;
    const selectedPeriodLabel = selectedPeriod
      ? `${selectedPeriod.startDate} - ${selectedPeriod.endDate}`
      : openPeriodsCount > 0
        ? `${openPeriodsCount} período(s) abierto(s)`
        : "No hay períodos abiertos";

    if (selectedPeriodLoading) {
      return <LoadingView message="Preparando revisión del período..." />;
    }

    if (showRecalculateReview) {
      return (
        <ScrollView style={styles.content}>
          <View
            style={styles.reviewCard}
            testID="admin-payroll-recalculate-confirm-dialog"
            nativeID="admin-payroll-recalculate-confirm-dialog"
          >
            <Text style={styles.reviewEyebrow}>Revisión previa</Text>
            <Text style={styles.reviewTitle}>Confirma el recálculo antes de ejecutar</Text>
            <Text style={styles.reviewDescription}>
              Solo se recalculan los períodos abiertos. Las modificaciones manuales aprobadas se mantienen y el resultado se registra con contexto auditable.
            </Text>

            <View style={styles.reviewChecklist}>
              <Text style={styles.reviewChecklistItem}>• Contexto activo: {selectedPeriodLabel}</Text>
              <Text style={styles.reviewChecklistItem}>• El cierre de períodos no cambia durante este paso.</Text>
              <Text style={styles.reviewChecklistItem}>• Revisa el resumen resultante antes de salir del flujo.</Text>
            </View>

            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={[styles.reviewActionButton, styles.reviewActionButtonSecondary]}
                onPress={() => setShowRecalculateReview(false)}
                disabled={recalculateLoading}
                accessibilityRole="button"
                accessibilityLabel="Volver sin recalcular"
              >
                <Text style={[styles.reviewActionText, styles.reviewActionTextSecondary]}>Volver</Text>
              </TouchableOpacity>
              <Pressable
                style={[styles.reviewActionButton, recalculateLoading ? styles.reviewActionButtonDisabled : undefined]}
                onPress={handleRecalculate}
                disabled={recalculateLoading}
                testID="admin-payroll-recalculate-confirm-cta"
                nativeID="admin-payroll-recalculate-confirm-cta"
                accessibilityRole="button"
                accessibilityLabel={recalculateLoading ? "Procesando recálculo" : "Confirmar recálculo de nómina"}
                accessibilityState={{ busy: recalculateLoading }}
              >
                <Text style={styles.reviewActionText}>
                  {recalculateLoading ? "Procesando..." : "Confirmar recálculo"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      );
    }

    if (selectedPeriod) {
      return (
        <PeriodDetail
          period={selectedPeriod}
          onClose={handleClosePeriod}
          onBack={handleBackToList}
          onPrepareRecalculate={openRecalculateReview}
        />
      );
    }

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={periodsRefreshing} onRefresh={handleRefresh} />
        }
      >
        {!periodsLoading && (
          <Text testID="admin-payroll-loaded" nativeID="admin-payroll-loaded" style={styles.readyMarker}>
            {" "}
          </Text>
        )}

        <View style={styles.overviewCard}>
          <Text style={styles.overviewEyebrow}>Ruta operativa</Text>
          <Text style={styles.overviewTitle}>Revisión financiera por período</Text>
          <Text style={styles.overviewDescription}>
            Abre un período para revisar su contexto completo y usa el recálculo desde un paso dedicado, no desde una confirmación fugaz.
          </Text>
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatLabel}>Abiertos</Text>
              <Text style={styles.overviewStatValue}>{openPeriodsCount}</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatLabel}>Totales cargados</Text>
              <Text style={styles.overviewStatValue}>{periodList?.totalCount ?? 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.toolbar}>
          <Pressable
            style={[styles.toolbarButton, recalculateLoading ? styles.toolbarButtonDisabled : undefined]}
            onPress={openRecalculateReview}
            disabled={recalculateLoading}
            testID="admin-payroll-recalculate-button"
            nativeID="admin-payroll-recalculate-button"
            accessibilityRole="button"
            accessibilityLabel={recalculateLoading ? "Recalculando nómina" : "Recalcular nómina"}
            accessibilityState={{ busy: recalculateLoading }}
          >
            <Text style={styles.toolbarButtonText} testID={recalculateLoading ? "admin-payroll-recalculate-loading" : undefined}>
              {recalculateLoading ? "Recalculando..." : "Recalcular nómina"}
            </Text>
          </Pressable>
        </View>

        {recalculateResult && (
          <View
            style={styles.summaryCard}
            testID="admin-payroll-recalculate-summary"
            nativeID="admin-payroll-recalculate-summary"
          >
            <Text style={styles.summaryTitle}>Resultado de recalculo</Text>
            <Text style={styles.summaryRow}>
              Líneas afectadas: <Text style={styles.summaryValue}>{recalculateResult.linesAffected}</Text>
            </Text>
            <Text style={styles.summaryRow}>
              Total anterior (solo afectadas):{" "}
              <Text style={styles.summaryValue}>{formatCurrency(recalculateResult.totalOldNet)}</Text>
            </Text>
            <Text style={styles.summaryRow}>
              Total nuevo (solo afectadas):{" "}
              <Text style={styles.summaryValue}>{formatCurrency(recalculateResult.totalNewNet)}</Text>
            </Text>
            <Text style={styles.summaryRow}>
              Fecha: <Text style={styles.summaryValue}>{formatTriggeredAt(recalculateResult.triggeredAtUtc)}</Text>
            </Text>
          </View>
        )}

        {periodsError && !periodsLoading ? (
          <ErrorView message={periodsError} onRetry={loadPeriods} />
        ) : periodsLoading ? (
          <LoadingView message="Cargando períodos..." />
        ) : periodList?.items.length === 0 ? (
          <EmptyView
            title="No hay períodos de nómina"
            subtitle="Crea un nuevo período para comenzar"
            actionLabel="+ Nuevo Período"
            onAction={() => setShowCreatePeriodModal(true)}
          />
        ) : (
          <View style={styles.list} testID="admin-payroll-periods-list" nativeID="admin-payroll-periods-list">
            {periodList?.items.map((period) => (
              <PeriodListItem
                key={period.id}
                period={period}
                onPress={handlePeriodPress}
              />
            ))}
          </View>
        )}

        {periodList && periodList.items.length > 0 && (
          <View style={styles.createSection}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreatePeriodModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Crear nuevo período de nómina"
            >
              <Text style={styles.createButtonText}>+ Nuevo Período</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderRulesTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={rulesRefreshing} onRefresh={handleRefresh} />
      }
    >
      {rulesError && !rulesLoading ? (
        <ErrorView message={rulesError} onRetry={loadRules} />
      ) : rulesLoading ? (
        <LoadingView message="Cargando reglas..." />
      ) : rules?.items.length === 0 ? (
        <EmptyView
          title="No hay reglas de compensación"
          subtitle="Crea una nueva regla para comenzar"
          actionLabel="+ Nueva Regla"
          onAction={() => {
            setSelectedRule(null);
            setShowCreateRuleModal(true);
          }}
        />
      ) : (
        <View style={styles.list}>
          {rules?.items.map((rule) => (
            <RuleListItem
              key={rule.id}
              rule={rule}
              onPress={handleRulePress}
            />
          ))}
        </View>
      )}

      {rules && rules.items.length > 0 && (
        <View style={styles.createSection}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              setSelectedRule(null);
              setShowCreateRuleModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Crear nueva regla de compensación"
          >
            <Text style={styles.createButtonText}>+ Nueva Regla</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderDeductionsTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={deductionsRefreshing} onRefresh={handleRefresh} />
      }
    >
      {deductionsError && !deductionsLoading ? (
        <ErrorView message={deductionsError} onRetry={loadDeductions} />
      ) : deductionsLoading ? (
        <LoadingView message="Cargando deducciones..." />
      ) : deductions?.items.length === 0 ? (
        <EmptyView
          title="No hay deducciones"
          subtitle="Agrega una deducción para comenzar"
          actionLabel="+ Nueva Deducción"
          onAction={() => setShowCreateDeductionModal(true)}
        />
      ) : (
        <View style={styles.list}>
          {deductions?.items.map((deduction) => (
            <DeductionListItem
              key={deduction.id}
              deduction={deduction}
              onDelete={handleDeleteDeduction}
            />
          ))}
        </View>
      )}

      {deductions && deductions.items.length > 0 && (
        <View style={styles.createSection}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateDeductionModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Crear nueva deducción"
          >
            <Text style={styles.createButtonText}>+ Nueva Deducción</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderAdjustmentsTab = () => (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl refreshing={adjustmentsRefreshing} onRefresh={handleRefresh} />
      }
    >
      {adjustmentsError && !adjustmentsLoading ? (
        <ErrorView message={adjustmentsError} onRetry={loadAdjustments} />
      ) : adjustmentsLoading ? (
        <LoadingView message="Cargando ajustes..." />
      ) : adjustments?.items.length === 0 ? (
        <EmptyView
          title="No hay ajustes"
          subtitle="Agrega un ajuste para comenzar"
          actionLabel="+ Nuevo Ajuste"
          onAction={() => setShowCreateAdjustmentModal(true)}
        />
      ) : (
        <View style={styles.list}>
          {adjustments?.items.map((adjustment) => (
            <AdjustmentListItem
              key={adjustment.id}
              adjustment={adjustment}
              onDelete={handleDeleteAdjustment}
            />
          ))}
        </View>
      )}

      {adjustments && adjustments.items.length > 0 && (
        <View style={styles.createSection}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateAdjustmentModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Crear nuevo ajuste"
          >
            <Text style={styles.createButtonText}>+ Nuevo Ajuste</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "periods":
        return renderPeriodsTab();
      case "rules":
        return renderRulesTab();
      case "deductions":
        return renderDeductionsTab();
      case "adjustments":
        return renderAdjustmentsTab();
      default:
        return renderPeriodsTab();
    }
  };

  const shouldHideTabs = activeTab === "periods" && (selectedPeriodLoading || selectedPeriod !== null || showRecalculateReview);

  return (
    <MobileWorkspaceShell
      eyebrow="Nómina"
      title="Gestión de Nómina"
      description="Administra períodos, reglas y compensaciones"
    >
      <View style={styles.screen} testID="admin-payroll-screen" nativeID="admin-payroll-screen">
        {!shouldHideTabs ? <PayrollTabs activeTab={activeTab} onTabChange={setActiveTab} /> : null}
        {renderContent()}
      </View>

      <CreatePeriodModal
        visible={showCreatePeriodModal}
        onClose={() => setShowCreatePeriodModal(false)}
        onSubmit={handleCreatePeriod}
      />

      <CreateRuleModal
        visible={showCreateRuleModal}
        onClose={() => {
          setShowCreateRuleModal(false);
          setSelectedRule(null);
        }}
        onSubmit={handleCreateRule}
        onDeactivate={selectedRule?.isActive ? handleDeactivateRule : undefined}
        editingRule={selectedRule}
      />

      <CreateDeductionModal
        visible={showCreateDeductionModal}
        onClose={() => setShowCreateDeductionModal(false)}
        onSubmit={handleCreateDeduction}
      />

      <CreateAdjustmentModal
        visible={showCreateAdjustmentModal}
        onClose={() => setShowCreateAdjustmentModal(false)}
        onSubmit={handleCreateAdjustment}
      />
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  hiddenMarker: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  readyMarker: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 1,
    width: 1,
    opacity: 0,
  },
  overviewCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: designTokens.color.surface.accent,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  overviewEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.ink.accentStrong,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  overviewDescription: {
    marginTop: 6,
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  overviewStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  overviewStat: {
    flex: 1,
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 10,
    padding: 12,
  },
  overviewStatLabel: {
    fontSize: 12,
    color: designTokens.color.ink.secondary,
    marginBottom: 4,
  },
  overviewStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  reviewCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  reviewEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: designTokens.color.status.dangerText,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
  },
  reviewDescription: {
    marginTop: 6,
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  reviewChecklist: {
    marginTop: 16,
    gap: 8,
  },
  reviewChecklistItem: {
    fontSize: 14,
    color: designTokens.color.status.dangerText,
    lineHeight: 20,
  },
  reviewActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  reviewActionButton: {
    flex: 1,
    backgroundColor: designTokens.color.ink.danger,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  reviewActionButtonSecondary: {
    backgroundColor: designTokens.color.surface.warning,
    borderWidth: 1,
    borderColor: designTokens.color.border.strong,
  },
  reviewActionButtonDisabled: {
    opacity: 0.7,
  },
  reviewActionText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "800",
    fontSize: 14,
  },
  reviewActionTextSecondary: {
    color: designTokens.color.status.dangerText,
  },
  toolbar: {
    padding: 16,
    paddingBottom: 8,
  },
  toolbarButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  toolbarButtonDisabled: {
    opacity: 0.7,
  },
  toolbarButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 15,
    fontWeight: "700",
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: designTokens.color.surface.success,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: 6,
  },
  summaryRow: {
    color: designTokens.color.ink.primary,
    fontSize: 13,
    marginTop: 4,
  },
  summaryValue: {
    fontWeight: "700",
    color: designTokens.color.ink.primary,
  },
  list: {
    padding: 16,
  },
  createSection: {
    padding: 16,
    paddingTop: 8,
  },
  createButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: designTokens.color.ink.inverse,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: designTokens.color.ink.primary,
    marginBottom: 8,
  },
  modalBody: {
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  modalButton: {
    backgroundColor: designTokens.color.ink.accentStrong,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalButtonSecondary: {
    backgroundColor: designTokens.color.surface.tertiary,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "800",
    fontSize: 14,
  },
  modalButtonTextSecondary: {
    color: designTokens.color.ink.primary,
  },
});
