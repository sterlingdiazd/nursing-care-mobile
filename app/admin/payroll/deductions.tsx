import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { FilterChips, type FilterChipOption } from "@/src/components/shared/FilterChips";
import { ListRow } from "@/src/components/shared/ListRow";
import { Pagination } from "@/src/components/shared/Pagination";
import { useClientPaging } from "@/src/hooks/usePagedList";
import { formatDateES } from "@/src/utils/spanishTextValidator";
import { designTokens } from "@/src/design-system/tokens";
import {
  getDeductions,
  createDeduction,
  deleteDeduction,
  updateDeduction,
  type AdminDeductionListResult,
  type AdminDeductionListItem,
  type CreateDeductionRequest,
  type UpdateDeductionRequest,
} from "@/src/services/payrollService";
import {
  CreateDeductionModal,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

type DeductionTypeFilter = "" | "Loan" | "Advance" | "Insurance" | "Other";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
}

function deductionTypeLabel(type: string): string {
  switch (type) {
    case "Loan": return "Préstamo";
    case "Advance": return "Adelanto";
    case "Insurance": return "Seguro";
    case "Other": return "Otro";
    default: return type;
  }
}

export default function DeductionsScreen() {
  const { roles, isReady, isAuthenticated, requiresProfileCompletion } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const [deductions, setDeductions] = useState<AdminDeductionListResult | null>(null);
  const [deductionsLoading, setDeductionsLoading] = useState(true);
  const [deductionsError, setDeductionsError] = useState<string | null>(null);
  const [showCreateDeductionModal, setShowCreateDeductionModal] = useState(false);
  const [deductionsRefreshing, setDeductionsRefreshing] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<AdminDeductionListItem | null>(null);

  const [typeFilter, setTypeFilter] = useState<DeductionTypeFilter>("");

  const fetchedRef = useRef(false);

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

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadDeductions();
  }, [isReady, isAuthenticated, loadDeductions]);

  const handleRefresh = useCallback(async () => {
    setDeductionsRefreshing(true);
    try {
      await loadDeductions();
    } finally {
      setDeductionsRefreshing(false);
    }
  }, [loadDeductions]);

  const handleDeleteDeduction = useCallback(
    (deduction: AdminDeductionListItem) => {
      Alert.alert(
        "Eliminar deducción",
        `¿Eliminar la deducción "${deduction.label}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDeduction(deduction.id);
                showToast({ message: "Deducción eliminada correctamente", variant: "success" });
                void loadDeductions();
              } catch (e) {
                showToast({
                  message: e instanceof Error ? e.message : "Error al eliminar",
                  variant: "error",
                });
              }
            },
          },
        ]
      );
    },
    [loadDeductions, showToast],
  );

  const handleCreateDeduction = useCallback(
    async (data: CreateDeductionRequest) => {
      await createDeduction(data);
      setShowCreateDeductionModal(false);
      showToast({ message: "Deducción creada correctamente", variant: "success" });
      void loadDeductions();
    },
    [loadDeductions, showToast],
  );

  const handleDeductionPress = useCallback((deduction: AdminDeductionListItem) => {
    setSelectedDeduction(deduction);
    setShowCreateDeductionModal(true);
  }, []);

  const handleUpdateDeduction = useCallback(
    async (id: string, data: UpdateDeductionRequest) => {
      await updateDeduction(id, data);
      showToast({ message: "Deducción actualizada correctamente", variant: "success" });
      setShowCreateDeductionModal(false);
      setSelectedDeduction(null);
      void loadDeductions();
    },
    [loadDeductions, showToast],
  );

  const handleModalClose = useCallback(() => {
    setShowCreateDeductionModal(false);
    setSelectedDeduction(null);
  }, []);

  // Client-side type filter applied to the full fetch
  const filteredItems = useMemo(() => {
    if (!deductions) return [];
    return deductions.items.filter((d) => {
      if (typeFilter && d.deductionType !== typeFilter) return false;
      return true;
    });
  }, [deductions, typeFilter]);

  // Count badges per type
  const allItems = deductions?.items ?? [];
  const countByType = useMemo(() => {
    const m: Record<string, number> = {};
    allItems.forEach((d) => {
      m[d.deductionType] = (m[d.deductionType] ?? 0) + 1;
    });
    return m;
  }, [allItems]);

  const TYPE_FILTER_OPTIONS: ReadonlyArray<FilterChipOption<DeductionTypeFilter>> = [
    { key: "", label: "Todas", count: allItems.length },
    { key: "Loan", label: "Préstamo", count: countByType["Loan"] ?? 0 },
    { key: "Advance", label: "Adelanto", count: countByType["Advance"] ?? 0 },
    { key: "Insurance", label: "Seguro", count: countByType["Insurance"] ?? 0 },
    { key: "Other", label: "Otro", count: countByType["Other"] ?? 0 },
  ];

  const handleTypeFilterChange = useCallback((key: DeductionTypeFilter) => {
    setTypeFilter(key);
  }, []);

  const { page, pageCount, pageItems, setPage } = useClientPaging(filteredItems, 10, typeFilter);

  const workflowActions: FooterAction[] = [
    {
      label: "+ Deducción única",
      onPress: () => {
        setSelectedDeduction(null);
        setShowCreateDeductionModal(true);
      },
      variant: "primary",
    },
  ];

  return (
    <MobileWorkspaceShell
      title="Deducciones únicas"
      description="Descuentos de una sola vez aplicados a una enfermera."
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminPayroll)}
      primaryReturnLabel="Volver"
      workflowActions={workflowActions}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollPad}
          refreshControl={<RefreshControl refreshing={deductionsRefreshing} onRefresh={handleRefresh} />}
        >
          <FilterChips
            options={TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={handleTypeFilterChange}
            testIDPrefix="deductions-filter"
          />

          {deductionsError && !deductionsLoading ? (
            <ErrorView message={deductionsError} onRetry={loadDeductions} />
          ) : deductionsLoading ? (
            <LoadingView message="Cargando deducciones..." />
          ) : filteredItems.length === 0 ? (
            <Text style={styles.emptyHint}>
              {typeFilter
                ? "No hay deducciones de este tipo."
                : "Sin deducciones únicas. Toca + Deducción única para añadir."}
            </Text>
          ) : (
            <View
              testID="admin-payroll-deductions-list"
              nativeID="admin-payroll-deductions-list"
              style={styles.list}
            >
              {pageItems.map((deduction) => (
                <ListRow
                  key={deduction.id}
                  title={deduction.label}
                  subtitle={deduction.nurseDisplayName}
                  metaLines={[
                    deductionTypeLabel(deduction.deductionType),
                    deduction.payrollPeriodId ? `Período: ${formatDateES(deduction.payrollPeriodId)}` : null,
                  ]}
                  rightText={formatCurrency(deduction.amount)}
                  onPress={() => handleDeductionPress(deduction)}
                  testID={`deduction-item-${deduction.id}`}
                  accessibilityLabel={`Editar deducción ${deduction.label}`}
                  rightAccessory={
                    <Pressable
                      onPress={() => handleDeleteDeduction(deduction)}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar deducción ${deduction.label}`}
                      testID={`deduction-delete-${deduction.id}`}
                      nativeID={`deduction-delete-${deduction.id}`}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteBtnText}>×</Text>
                    </Pressable>
                  }
                />
              ))}
              <Pagination
                currentPage={page}
                totalPages={pageCount}
                onPageChange={setPage}
                testID="deductions-pagination"
              />
            </View>
          )}
        </ScrollView>
      </View>

      <CreateDeductionModal
        visible={showCreateDeductionModal}
        onClose={handleModalClose}
        onSubmit={handleCreateDeduction}
        editingDeduction={selectedDeduction}
        onUpdate={handleUpdateDeduction}
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
    gap: 8,
  },
  list: {
    paddingTop: 4,
    gap: 8,
  },
  emptyHint: {
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    textAlign: "center",
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: designTokens.color.surface.danger,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  deleteBtnText: {
    fontSize: 20,
    color: designTokens.color.ink.danger,
    fontWeight: "bold",
    marginTop: -2,
  },
});
