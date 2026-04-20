import { useEffect, useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl, Alert, Modal, Pressable } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
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
  const [activeTab, setActiveTab] = useState("periods");

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);
  
  const [periodList, setPeriodList] = useState<AdminPayrollPeriodListResult | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<AdminPayrollPeriodDetail | null>(null);
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

  const [showRecalculateConfirmModal, setShowRecalculateConfirmModal] = useState(false);
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
        if (!periodList && !periodsLoading) void loadPeriods();
        break;
      case "rules":
        if (!rules && !rulesLoading) void loadRules();
        break;
      case "deductions":
        if (!deductions && !deductionsLoading) void loadDeductions();
        break;
      case "adjustments":
        if (!adjustments && !adjustmentsLoading) void loadAdjustments();
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

  const handlePeriodPress = useCallback((period: { id: string }) => {
    getPayrollPeriodById(period.id).then(setSelectedPeriod);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedPeriod(null);
    void loadPeriods();
  }, [loadPeriods]);

  const handleCreatePeriod = useCallback(async (data: CreatePayrollPeriodRequest) => {
    await createPayrollPeriod(data);
    setShowCreatePeriodModal(false);
    Alert.alert("Éxito", "Período de nómina creado correctamente");
    void loadPeriods();
  }, [loadPeriods]);

  const handleClosePeriod = useCallback(async () => {
    if (!selectedPeriod) return;
    await closePayrollPeriod(selectedPeriod.id);
    const detail = await getPayrollPeriodById(selectedPeriod.id);
    setSelectedPeriod(detail);
    Alert.alert("Éxito", "Período de nómina cerrado correctamente");
    void loadPeriods();
  }, [selectedPeriod, loadPeriods]);

  const handleRulePress = useCallback((rule: AdminCompensationRuleListItem) => {
    setSelectedRule(rule);
    setShowCreateRuleModal(true);
  }, []);

  const handleCreateRule = useCallback(async (data: CreateCompensationRuleRequest | UpdateCompensationRuleRequest) => {
    if ("employmentType" in data) {
      await createCompensationRule(data as CreateCompensationRuleRequest);
      Alert.alert("Éxito", "Regla de compensación creada correctamente");
    } else if (selectedRule) {
      await updateCompensationRule(selectedRule.id, data);
      Alert.alert("Éxito", "Regla de compensación actualizada correctamente");
    }
    setShowCreateRuleModal(false);
    setSelectedRule(null);
    void loadRules();
  }, [selectedRule, loadRules]);

  const handleDeactivateRule = useCallback(async () => {
    if (!selectedRule) return;
    await deactivateCompensationRule(selectedRule.id);
    setShowCreateRuleModal(false);
    setSelectedRule(null);
    Alert.alert("Éxito", "Regla de compensación desactivada correctamente");
    void loadRules();
  }, [selectedRule, loadRules]);

  const handleDeleteDeduction = useCallback(async (deduction: { id: string }) => {
    await deleteDeduction(deduction.id);
    Alert.alert("Éxito", "Deducción eliminada correctamente");
    void loadDeductions();
  }, [loadDeductions]);

  const handleCreateDeduction = useCallback(async (data: CreateDeductionRequest) => {
    await createDeduction(data);
    setShowCreateDeductionModal(false);
    Alert.alert("Éxito", "Deducción creada correctamente");
    void loadDeductions();
  }, [loadDeductions]);

  const handleDeleteAdjustment = useCallback(async (adjustment: { id: string }) => {
    await deleteAdjustment(adjustment.id);
    Alert.alert("Éxito", "Ajuste eliminado correctamente");
    void loadAdjustments();
  }, [loadAdjustments]);

  const handleCreateAdjustment = useCallback(async (data: CreateCompensationAdjustmentRequest) => {
    await createAdjustment(data);
    setShowCreateAdjustmentModal(false);
    Alert.alert("Éxito", "Ajuste de compensación creado correctamente");
    void loadAdjustments();
  }, [loadAdjustments]);

  const handleRecalculate = useCallback(async () => {
    setRecalculateLoading(true);
    try {
      const result = await recalculatePayroll({});
      setRecalculateResult(result);
      setShowRecalculateConfirmModal(false);
      // Refresh periods so any derived totals stay current.
      void loadPeriods();
    } catch (e) {
      const message = e instanceof Error ? e.message : "No fue posible recalcular la nómina.";
      Alert.alert("Error", message);
    } finally {
      setRecalculateLoading(false);
    }
  }, [loadPeriods]);

  const renderPeriodsTab = () => {
    if (selectedPeriod) {
      return (
        <PeriodDetail
          period={selectedPeriod}
          onClose={handleClosePeriod}
          onBack={handleBackToList}
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
          <Text testID="admin-payroll-loaded" nativeID="admin-payroll-loaded" style={styles.hiddenMarker}>
            {" "}
          </Text>
        )}

        <View style={styles.toolbar}>
          <Pressable
            style={[styles.toolbarButton, recalculateLoading ? styles.toolbarButtonDisabled : undefined]}
            onPress={() => setShowRecalculateConfirmModal(true)}
            disabled={recalculateLoading}
            testID="admin-payroll-recalculate-button"
            nativeID="admin-payroll-recalculate-button"
          >
            <Text style={styles.toolbarButtonText}>
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

  return (
    <MobileWorkspaceShell
      eyebrow="Nómina"
      title="Gestión de Nómina"
      description="Administra períodos, reglas y compensaciones"
    >
      <View style={styles.screen} testID="admin-payroll-screen" nativeID="admin-payroll-screen">
        <PayrollTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {renderContent()}
      </View>

      <Modal
        transparent
        visible={showRecalculateConfirmModal}
        animationType="fade"
        onRequestClose={() => setShowRecalculateConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={styles.modalCard}
            testID="admin-payroll-recalculate-confirm-dialog"
            nativeID="admin-payroll-recalculate-confirm-dialog"
          >
            <Text style={styles.modalTitle}>Confirmar recalculo</Text>
            <Text style={styles.modalBody}>
              Solo se recalculan los períodos abiertos. Las modificaciones manuales aprobadas se mantienen y no se recalculan.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowRecalculateConfirmModal(false)}
                disabled={recalculateLoading}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Cancelar</Text>
              </TouchableOpacity>
              <Pressable
                style={[styles.modalButton, recalculateLoading ? styles.modalButtonDisabled : undefined]}
                onPress={handleRecalculate}
                disabled={recalculateLoading}
                testID="admin-payroll-recalculate-confirm-cta"
                nativeID="admin-payroll-recalculate-confirm-cta"
              >
                <Text style={styles.modalButtonText}>
                  {recalculateLoading ? "Procesando..." : "Confirmar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  toolbar: {
    padding: 16,
    paddingBottom: 8,
  },
  toolbarButton: {
    backgroundColor: "#0f766e",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  toolbarButtonDisabled: {
    opacity: 0.7,
  },
  toolbarButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  summaryRow: {
    color: "#0f172a",
    fontSize: 13,
    marginTop: 4,
  },
  summaryValue: {
    fontWeight: "700",
    color: "#0f172a",
  },
  list: {
    padding: 16,
  },
  createSection: {
    padding: 16,
    paddingTop: 8,
  },
  createButton: {
    backgroundColor: "#1976d2",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
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
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  modalBody: {
    color: "#334155",
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
    backgroundColor: "#0f766e",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalButtonSecondary: {
    backgroundColor: "#e2e8f0",
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  modalButtonTextSecondary: {
    color: "#0f172a",
  },
});
