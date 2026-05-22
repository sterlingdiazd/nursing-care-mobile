import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { designTokens } from "@/src/design-system/tokens";
import {
  getScheduledDeductions,
  getScheduledDeductionById,
  createScheduledDeduction,
  type ScheduledDeductionListResult,
  type ScheduledDeductionDetail as ScheduledDeductionDetailDto,
  type CreateScheduledDeductionRequest,
} from "@/src/services/payrollService";
import SearchFilterBar from "@/src/components/shared/SearchFilterBar";
import {
  ScheduledDeductionListItem,
  CreateScheduledDeductionModal,
  ScheduledDeductionDetail,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "Active", label: "Activos" },
  { value: "Completed", label: "Completados" },
  { value: "Cancelled", label: "Cancelados" },
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

  // Search + filter state
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchedRef = useRef(false);

  const loadScheduled = useCallback(async (status?: string) => {
    try {
      setScheduledError(null);
      setScheduledLoading(true);
      const data = await getScheduledDeductions({ status: status ?? statusFilter ?? null });
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

  // Status filter changes reload explicitly from the chip press (no mount-firing effect).
  const applyStatusFilter = useCallback((status: string) => {
    setStatusFilter(status);
    setScheduledList(null);
    void loadScheduled(status);
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

  const filteredItems = (scheduledList?.items ?? []).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.nurseDisplayName.toLowerCase().includes(q) || item.label.toLowerCase().includes(q);
  });

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
        <SearchFilterBar
          searchPlaceholder="Buscar por enfermera"
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
                    testID={`scheduled-filter-${f.value || "all"}`}
                    nativeID={`scheduled-filter-${f.value || "all"}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          }
        />

        {scheduledError && !scheduledLoading ? (
          <ErrorView message={scheduledError} onRetry={loadScheduled} />
        ) : scheduledLoading ? (
          <LoadingView message="Cargando descuentos fijos..." />
        ) : filteredItems.length === 0 ? (
          <Text style={styles.emptyHint}>
            {searchQuery || statusFilter
              ? "No hay descuentos que coincidan con los filtros."
              : "Sin descuentos fijos. Toca + Descuento fijo para crear el primero."}
          </Text>
        ) : (
          <View
            style={styles.list}
            testID="admin-payroll-scheduled-list"
            nativeID="admin-payroll-scheduled-list"
          >
            {filteredItems.map((item) => (
              <ScheduledDeductionListItem
                key={item.id}
                item={item}
                onPress={handleScheduledItemPress}
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
