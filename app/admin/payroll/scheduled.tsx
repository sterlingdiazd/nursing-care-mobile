import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { FilterChips, type FilterChipOption } from "@/src/components/shared/FilterChips";
import { Pagination } from "@/src/components/shared/Pagination";
import { useClientPaging } from "@/src/hooks/usePagedList";
import { designTokens } from "@/src/design-system/tokens";
import {
  getScheduledDeductions,
  getScheduledDeductionById,
  createScheduledDeduction,
  type ScheduledDeductionListResult,
  type ScheduledDeductionDetail as ScheduledDeductionDetailDto,
  type CreateScheduledDeductionRequest,
} from "@/src/services/payrollService";
import {
  ScheduledDeductionListItem,
  CreateScheduledDeductionModal,
  ScheduledDeductionDetail,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

type StatusFilter = "" | "Active" | "Completed" | "Cancelled";

const STATUS_FILTER_OPTIONS_BASE: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: "", label: "Todos" },
  { key: "Active", label: "Activos" },
  { key: "Completed", label: "Completados" },
  { key: "Cancelled", label: "Cancelados" },
];

type Mode = "list" | "detail";

export default function ScheduledScreen() {
  const { roles, isReady, isAuthenticated, requiresProfileCompletion } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const [mode, setMode] = useState<Mode>("list");
  const [scheduledList, setScheduledList] = useState<ScheduledDeductionListResult | null>(null);
  const [scheduledLoading, setScheduledLoading] = useState(true);
  const [scheduledError, setScheduledError] = useState<string | null>(null);
  const [scheduledRefreshing, setScheduledRefreshing] = useState(false);
  const [showCreateScheduledModal, setShowCreateScheduledModal] = useState(false);
  const [selectedScheduledId, setSelectedScheduledId] = useState<string | null>(null);
  const [selectedScheduledDetail, setSelectedScheduledDetail] = useState<ScheduledDeductionDetailDto | null>(null);
  const [scheduledDetailLoading, setScheduledDetailLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const fetchedRef = useRef(false);

  const loadScheduled = useCallback(async (status?: StatusFilter) => {
    try {
      setScheduledError(null);
      setScheduledLoading(true);
      const data = await getScheduledDeductions({ status: (status ?? statusFilter) || null });
      setScheduledList(data);
    } catch (e) {
      setScheduledError(e instanceof Error ? e.message : "Error al cargar descuentos fijos");
    } finally {
      setScheduledLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadScheduled();
  }, [isReady, isAuthenticated, loadScheduled]);

  const handleStatusFilterChange = useCallback((key: StatusFilter) => {
    setStatusFilter(key);
    setScheduledList(null);
    void loadScheduled(key);
  }, [loadScheduled]);

  const handleRefresh = useCallback(async () => {
    setScheduledRefreshing(true);
    try {
      await loadScheduled();
    } finally {
      setScheduledRefreshing(false);
    }
  }, [loadScheduled]);

  const handleScheduledItemPress = useCallback(
    async (id: string) => {
      try {
        setScheduledDetailLoading(true);
        setSelectedScheduledId(id);
        const detail = await getScheduledDeductionById(id);
        setSelectedScheduledDetail(detail);
        setMode("detail");
      } catch (e) {
        const message = e instanceof Error ? e.message : "No fue posible abrir el descuento fijo.";
        showToast({ message, variant: "error" });
        setSelectedScheduledId(null);
      } finally {
        setScheduledDetailLoading(false);
      }
    },
    [showToast],
  );

  const handleScheduledDetailRefresh = useCallback(async () => {
    if (!selectedScheduledId) return;
    const detail = await getScheduledDeductionById(selectedScheduledId);
    setSelectedScheduledDetail(detail);
    void loadScheduled();
  }, [selectedScheduledId, loadScheduled]);

  const handleBackToScheduledList = useCallback(() => {
    setSelectedScheduledDetail(null);
    setSelectedScheduledId(null);
    setMode("list");
    void loadScheduled();
  }, [loadScheduled]);

  const handleCreateScheduled = useCallback(
    async (data: CreateScheduledDeductionRequest) => {
      await createScheduledDeduction(data);
      setShowCreateScheduledModal(false);
      showToast({ message: "Descuento fijo creado correctamente", variant: "success" });
      void loadScheduled();
    },
    [loadScheduled, showToast],
  );

  // Build count badges from the loaded list (all statuses shown in chips regardless of active filter)
  const allItems = scheduledList?.items ?? [];
  const countByStatus = useMemo(() => {
    const m: Record<string, number> = {};
    allItems.forEach((i) => {
      m[i.status] = (m[i.status] ?? 0) + 1;
    });
    return m;
  }, [allItems]);

  const STATUS_FILTER_OPTIONS: ReadonlyArray<FilterChipOption<StatusFilter>> = STATUS_FILTER_OPTIONS_BASE.map((o) =>
    o.key === ""
      ? { ...o, count: allItems.length }
      : { ...o, count: countByStatus[o.key] ?? 0 }
  );

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => !statusFilter || item.status === statusFilter);
  }, [allItems, statusFilter]);

  const { page, pageCount, pageItems, setPage } = useClientPaging(filteredItems, 10, statusFilter);

  const shellTitle = mode === "detail" ? "Descuento fijo" : "Descuentos fijos";

  const handlePrimaryReturn = () => {
    if (mode === "detail") {
      handleBackToScheduledList();
      return;
    }
    goBackOrReplace(router, mobileNavigationEscapes.adminPayroll);
  };

  const workflowActions: FooterAction[] =
    mode === "list"
      ? [
          {
            label: "+ Descuento fijo",
            onPress: () => setShowCreateScheduledModal(true),
            variant: "primary",
            testID: "admin-payroll-scheduled-create-button",
          },
        ]
      : [];

  const renderContent = () => {
    if (scheduledDetailLoading) {
      return <LoadingView message="Cargando descuento fijo..." />;
    }

    if (mode === "detail" && selectedScheduledDetail) {
      return (
        <ScheduledDeductionDetail
          detail={selectedScheduledDetail}
          onBack={handleBackToScheduledList}
          onRefresh={handleScheduledDetailRefresh}
        />
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollPad}
        refreshControl={<RefreshControl refreshing={scheduledRefreshing} onRefresh={handleRefresh} />}
      >
        <FilterChips
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={handleStatusFilterChange}
          testIDPrefix="scheduled-filter"
        />

        {scheduledError && !scheduledLoading ? (
          <ErrorView message={scheduledError} onRetry={loadScheduled} />
        ) : scheduledLoading ? (
          <LoadingView message="Cargando descuentos fijos..." />
        ) : filteredItems.length === 0 ? (
          <Text style={styles.emptyHint}>
            {statusFilter
              ? "No hay descuentos que coincidan con el filtro."
              : "Sin descuentos fijos. Toca + Descuento fijo para crear el primero."}
          </Text>
        ) : (
          <View
            style={styles.list}
            testID="admin-payroll-scheduled-list"
            nativeID="admin-payroll-scheduled-list"
          >
            {pageItems.map((item) => (
              <ScheduledDeductionListItem
                key={item.id}
                item={item}
                onPress={handleScheduledItemPress}
              />
            ))}
            <Pagination
              currentPage={page}
              totalPages={pageCount}
              onPageChange={setPage}
              testID="scheduled-pagination"
            />
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <MobileWorkspaceShell
      title={shellTitle}
      description={mode === "detail" ? undefined : "Préstamos, adelantos y seguros descontados por cuotas."}
      onPrimaryReturn={handlePrimaryReturn}
      primaryReturnLabel="Volver"
      workflowActions={workflowActions}
    >
      <View style={styles.screen}>{renderContent()}</View>

      <CreateScheduledDeductionModal
        visible={showCreateScheduledModal}
        onClose={() => setShowCreateScheduledModal(false)}
        onSubmit={handleCreateScheduled}
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
