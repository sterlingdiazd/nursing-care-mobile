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
  getAdjustments,
  createAdjustment,
  deleteAdjustment,
  type AdminCompensationAdjustmentListResult,
  type CreateCompensationAdjustmentRequest,
} from "@/src/services/payrollService";
import SearchFilterBar from "@/src/components/shared/SearchFilterBar";
import {
  AdjustmentListItem,
  CreateAdjustmentModal,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

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
  const [adjustmentsRefreshing, setAdjustmentsRefreshing] = useState(false);

  // Search state — client-side filter by nurse name
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredItems = useMemo(() => {
    if (!adjustments) return [];
    if (!searchQuery) return adjustments.items;
    const q = searchQuery.toLowerCase();
    return adjustments.items.filter(
      (a) => a.nurseDisplayName.toLowerCase().includes(q) || a.label.toLowerCase().includes(q),
    );
  }, [adjustments, searchQuery]);

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
          <SearchFilterBar
            searchPlaceholder="Buscar por enfermera"
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearch={() => setSearchQuery(searchValue)}
            onClear={() => { setSearchValue(""); setSearchQuery(""); }}
          />

          {adjustmentsError && !adjustmentsLoading ? (
            <ErrorView message={adjustmentsError} onRetry={loadAdjustments} />
          ) : adjustmentsLoading ? (
            <LoadingView message="Cargando ajustes..." />
          ) : filteredItems.length === 0 ? (
            <Text style={styles.emptyHint}>
              {searchQuery
                ? "No hay ajustes que coincidan con la búsqueda."
                : "Sin ajustes. Toca + Ajuste para añadir."}
            </Text>
          ) : (
            <View style={styles.list}>
              {filteredItems.map((adjustment) => (
                <AdjustmentListItem
                  key={adjustment.id}
                  adjustment={adjustment}
                  onDelete={handleDeleteAdjustment}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

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
