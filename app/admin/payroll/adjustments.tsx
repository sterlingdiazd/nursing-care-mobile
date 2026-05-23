import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { designTokens } from "@/src/design-system/tokens";
import {
  getAdjustments,
  createAdjustment,
  updateAdjustment,
  deleteAdjustment,
  type AdminCompensationAdjustmentListResult,
  type AdminCompensationAdjustmentListItem,
  type CreateCompensationAdjustmentRequest,
} from "@/src/services/payrollService";
import {
  CreateAdjustmentModal,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

type AdjustmentTypeFilter = "" | "positive" | "negative";

function formatCurrencyWithSign(amount: number) {
  const prefix = amount >= 0 ? "+" : "";
  return prefix + new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(amount);
}

export default function AdjustmentsScreen() {
  const { roles, isReady, isAuthenticated, requiresProfileCompletion } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const [adjustments, setAdjustments] = useState<AdminCompensationAdjustmentListResult | null>(null);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(true);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [showCreateAdjustmentModal, setShowCreateAdjustmentModal] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<AdminCompensationAdjustmentListItem | null>(null);
  const [adjustmentsRefreshing, setAdjustmentsRefreshing] = useState(false);

  const [typeFilter, setTypeFilter] = useState<AdjustmentTypeFilter>("");

  const fetchedRef = useRef(false);

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
    if (!isReady || !isAuthenticated) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadAdjustments();
  }, [isReady, isAuthenticated, loadAdjustments]);

  const handleRefresh = useCallback(async () => {
    setAdjustmentsRefreshing(true);
    try {
      await loadAdjustments();
    } finally {
      setAdjustmentsRefreshing(false);
    }
  }, [loadAdjustments]);

  const handleDeleteAdjustment = useCallback(
    async (adjustment: { id: string }) => {
      await deleteAdjustment(adjustment.id);
      showToast({ message: "Ajuste eliminado correctamente", variant: "success" });
      void loadAdjustments();
    },
    [loadAdjustments, showToast],
  );

  const handleCreateAdjustment = useCallback(
    async (data: CreateCompensationAdjustmentRequest) => {
      await createAdjustment(data);
      setShowCreateAdjustmentModal(false);
      showToast({ message: "Ajuste de compensación creado correctamente", variant: "success" });
      void loadAdjustments();
    },
    [loadAdjustments, showToast],
  );

  const handleUpdateAdjustment = useCallback(
    async (id: string, data: { label: string; amount: number }) => {
      await updateAdjustment(id, data);
      setEditingAdjustment(null);
      showToast({ message: "Ajuste actualizado correctamente", variant: "success" });
      void loadAdjustments();
    },
    [loadAdjustments, showToast],
  );

  const closeAdjustmentModal = useCallback(() => {
    setShowCreateAdjustmentModal(false);
    setEditingAdjustment(null);
  }, []);

  const allItems = adjustments?.items ?? [];

  const filteredItems = useMemo(() => {
    return allItems.filter((a) => {
      if (typeFilter === "positive") return a.amount >= 0;
      if (typeFilter === "negative") return a.amount < 0;
      return true;
    });
  }, [allItems, typeFilter]);

  const positiveCount = useMemo(() => allItems.filter((a) => a.amount >= 0).length, [allItems]);
  const negativeCount = useMemo(() => allItems.filter((a) => a.amount < 0).length, [allItems]);

  const TYPE_FILTER_OPTIONS: ReadonlyArray<FilterChipOption<AdjustmentTypeFilter>> = [
    { key: "", label: "Todos", count: allItems.length },
    { key: "positive", label: "Bonos (+)", count: positiveCount },
    { key: "negative", label: "Correcciones (−)", count: negativeCount },
  ];

  const { page, pageCount, pageItems, setPage } = useClientPaging(filteredItems, 10, typeFilter);

  const workflowActions: FooterAction[] = [
    {
      label: "+ Ajuste",
      onPress: () => setShowCreateAdjustmentModal(true),
      variant: "primary",
    },
  ];

  return (
    <MobileWorkspaceShell
      title="Ajustes"
      description="Bonos o correcciones aplicados a un servicio específico."
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminPayroll)}
      primaryReturnLabel="Volver"
      workflowActions={workflowActions}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollPad}
          refreshControl={<RefreshControl refreshing={adjustmentsRefreshing} onRefresh={handleRefresh} />}
        >
          <FilterChips
            options={TYPE_FILTER_OPTIONS}
            value={typeFilter}
            onChange={(key) => setTypeFilter(key)}
            testIDPrefix="adjustments-filter"
          />

          {adjustmentsError && !adjustmentsLoading ? (
            <ErrorView message={adjustmentsError} onRetry={loadAdjustments} />
          ) : adjustmentsLoading ? (
            <LoadingView message="Cargando ajustes..." />
          ) : filteredItems.length === 0 ? (
            <Text style={styles.emptyHint}>
              {typeFilter
                ? "No hay ajustes de este tipo."
                : "Sin ajustes. Toca + Ajuste para añadir."}
            </Text>
          ) : (
            <View
              testID="admin-payroll-adjustments-list"
              nativeID="admin-payroll-adjustments-list"
              style={styles.list}
            >
              {pageItems.map((adjustment) => (
                <ListRow
                  key={adjustment.id}
                  title={adjustment.label}
                  subtitle={adjustment.nurseDisplayName}
                  metaLines={[formatDateTimeES(adjustment.createdAtUtc)]}
                  rightText={formatCurrencyWithSign(adjustment.amount)}
                  onPress={() => setEditingAdjustment(adjustment)}
                  testID={`adjustment-item-${adjustment.id}`}
                  accessibilityLabel={`Editar ajuste ${adjustment.label}`}
                />
              ))}
              <Pagination
                currentPage={page}
                totalPages={pageCount}
                onPageChange={setPage}
                testID="adjustments-pagination"
              />
            </View>
          )}
        </ScrollView>
      </View>

      <CreateAdjustmentModal
        visible={showCreateAdjustmentModal || editingAdjustment != null}
        onClose={closeAdjustmentModal}
        onSubmit={handleCreateAdjustment}
        editingAdjustment={editingAdjustment}
        onUpdate={handleUpdateAdjustment}
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
});
