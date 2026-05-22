import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { type FooterAction } from "@/src/components/navigation/AppFooter";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/components/shared/ToastProvider";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { designTokens } from "@/src/design-system/tokens";
import {
  getCompensationRules,
  createCompensationRule,
  updateCompensationRule,
  deactivateCompensationRule,
  reactivateCompensationRule,
  type AdminCompensationRuleListItem,
  type AdminCompensationRuleListResult,
  type CreateCompensationRuleRequest,
  type UpdateCompensationRuleRequest,
} from "@/src/services/payrollService";
import {
  RuleListItem,
  CreateRuleModal,
  ErrorView,
  LoadingView,
} from "@/components/payroll";

export default function RulesScreen() {
  const { roles, isReady, isAuthenticated, requiresProfileCompletion } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const [rules, setRules] = useState<AdminCompensationRuleListResult | null>(null);
  const [selectedRule, setSelectedRule] = useState<AdminCompensationRuleListItem | null>(null);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [rulesRefreshing, setRulesRefreshing] = useState(false);

  const fetchedRef = useRef(false);

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

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadRules();
  }, [isReady, isAuthenticated, loadRules]);

  const handleRefresh = useCallback(async () => {
    setRulesRefreshing(true);
    try {
      await loadRules();
    } finally {
      setRulesRefreshing(false);
    }
  }, [loadRules]);

  const handleRulePress = useCallback((rule: AdminCompensationRuleListItem) => {
    setSelectedRule(rule);
    setShowCreateRuleModal(true);
  }, []);

  const handleCreateRule = useCallback(
    async (data: CreateCompensationRuleRequest | UpdateCompensationRuleRequest) => {
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
    },
    [selectedRule, loadRules, showToast],
  );

  const handleDeactivateRule = useCallback(async () => {
    if (!selectedRule) return;
    await deactivateCompensationRule(selectedRule.id);
    setShowCreateRuleModal(false);
    setSelectedRule(null);
    showToast({ message: "Regla de compensación desactivada correctamente", variant: "success" });
    void loadRules();
  }, [selectedRule, loadRules, showToast]);

  const handleReactivateRule = useCallback(async () => {
    if (!selectedRule) return;
    await reactivateCompensationRule(selectedRule.id);
    showToast({ message: "Regla reactivada correctamente", variant: "success" });
    setShowCreateRuleModal(false);
    setSelectedRule(null);
    void loadRules();
  }, [selectedRule, loadRules, showToast]);

  const workflowActions: FooterAction[] = [
    {
      label: "+ Regla",
      onPress: () => {
        setSelectedRule(null);
        setShowCreateRuleModal(true);
      },
      variant: "primary",
    },
  ];

  return (
    <MobileWorkspaceShell
      title="Reglas"
      description="Porcentajes de compensación que se aplican según el tipo de servicio."
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminPayroll)}
      primaryReturnLabel="Volver"
      workflowActions={workflowActions}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollPad}
          refreshControl={<RefreshControl refreshing={rulesRefreshing} onRefresh={handleRefresh} />}
        >
          {rulesError && !rulesLoading ? (
            <ErrorView message={rulesError} onRetry={loadRules} />
          ) : rulesLoading ? (
            <LoadingView message="Cargando reglas..." />
          ) : rules?.items.length === 0 ? (
            <Text style={styles.emptyHint}>Sin reglas. Toca + Regla para crear la primera.</Text>
          ) : (
            <View style={styles.list}>
              {rules?.items.map((rule) => (
                <RuleListItem key={rule.id} rule={rule} onPress={handleRulePress} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <CreateRuleModal
        visible={showCreateRuleModal}
        onClose={() => {
          setShowCreateRuleModal(false);
          setSelectedRule(null);
        }}
        onSubmit={handleCreateRule}
        onDeactivate={selectedRule?.isActive ? handleDeactivateRule : undefined}
        onReactivate={selectedRule && !selectedRule.isActive ? handleReactivateRule : undefined}
        editingRule={selectedRule}
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
