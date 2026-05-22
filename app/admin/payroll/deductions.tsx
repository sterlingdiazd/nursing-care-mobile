import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
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
import SearchFilterBar from "@/src/components/shared/SearchFilterBar";
import {
  DeductionListItem,
  CreateDeductionModal,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

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

  // Search state — client-side filter by nurse name
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    async (deduction: { id: string }) => {
      await deleteDeduction(deduction.id);
      showToast({ message: "Deducción eliminada correctamente", variant: "success" });
      void loadDeductions();
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

  const filteredItems = useMemo(() => {
    if (!deductions) return [];
    if (!searchQuery) return deductions.items;
    const q = searchQuery.toLowerCase();
    return deductions.items.filter(
      (d) => d.nurseDisplayName.toLowerCase().includes(q) || d.label.toLowerCase().includes(q),
    );
  }, [deductions, searchQuery]);

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
          <SearchFilterBar
            searchPlaceholder="Buscar por enfermera"
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearch={() => setSearchQuery(searchValue)}
            onClear={() => { setSearchValue(""); setSearchQuery(""); }}
          />

          {deductionsError && !deductionsLoading ? (
            <ErrorView message={deductionsError} onRetry={loadDeductions} />
          ) : deductionsLoading ? (
            <LoadingView message="Cargando deducciones..." />
          ) : filteredItems.length === 0 ? (
            <Text style={styles.emptyHint}>
              {searchQuery
                ? "No hay deducciones que coincidan con la búsqueda."
                : "Sin deducciones únicas. Toca + Deducción única para añadir."}
            </Text>
          ) : (
            <View style={styles.list}>
              {filteredItems.map((deduction) => (
                <DeductionListItem
                  key={deduction.id}
                  deduction={deduction}
                  onDelete={handleDeleteDeduction}
                  onPress={handleDeductionPress}
                />
              ))}
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
  },
  list: {
    paddingTop: 4,
  },
  emptyHint: {
    color: designTokens.color.ink.secondary,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    textAlign: "center",
  },
});
