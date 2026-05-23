import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { StatStrip } from "@/src/components/shared/MetricCard";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import {
  getAdminMobilePayrollSummary,
  type AdminMobilePayrollSummaryDto,
} from "@/src/services/payrollService";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);
}

type SectionCard = {
  key: string;
  label: string;
  helper: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  path: string;
  testID: string;
};

const SECTION_CARDS: SectionCard[] = [
  {
    key: "periods",
    label: "Períodos",
    helper: "Crear, cerrar y recalcular",
    icon: "calendar",
    path: "/admin/payroll/periods",
    testID: "payroll-hub-card-periods",
  },
  {
    key: "deductions",
    label: "Deducciones únicas",
    helper: "Deducciones puntuales por período",
    icon: "minus-circle",
    path: "/admin/payroll/deductions",
    testID: "payroll-hub-card-deductions",
  },
  {
    key: "scheduled",
    label: "Descuentos fijos",
    helper: "Planes de pago recurrentes",
    icon: "repeat",
    path: "/admin/payroll/scheduled",
    testID: "payroll-hub-card-scheduled",
  },
  {
    key: "adjustments",
    label: "Ajustes",
    helper: "Bonificaciones y ajustes manuales",
    icon: "pencil-square-o",
    path: "/admin/payroll/adjustments",
    testID: "payroll-hub-card-adjustments",
  },
];

export default function PayrollHubScreen() {
  const { roles, isReady, isAuthenticated, requiresProfileCompletion } = useAuth();
  const [summary, setSummary] = useState<AdminMobilePayrollSummaryDto | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || fetchedRef.current) return;
    fetchedRef.current = true;
    setSummaryLoading(true);
    getAdminMobilePayrollSummary()
      .then(setSummary)
      .catch(() => {/* summary is non-critical; fail silently */})
      .finally(() => setSummaryLoading(false));
  }, [isReady, isAuthenticated]);

  return (
    <MobileWorkspaceShell
      title="Gestión de Nómina"
      description="Períodos de pago, deducciones, descuentos y ajustes de las enfermeras."
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
    >
      <View
        testID="payroll-hub-screen"
        nativeID="payroll-hub-screen"
        style={styles.screen}
      >
        {/* Compact summary strip */}
        <StatStrip items={[
          { label: "Períodos abiertos", value: summaryLoading ? "—" : String(summary?.openPeriodsCount ?? "—") },
          { label: "Compensación período", value: summaryLoading ? "—" : summary ? formatCurrency(summary.totalCompensationCurrentPeriod) : "—" },
          { label: "Enfermeras activas", value: summaryLoading ? "—" : String(summary?.activeNursesCount ?? "—") },
        ]} />

        {/* Section cards */}
        <View style={styles.grid}>
          {SECTION_CARDS.map((card) => (
            <Pressable
              key={card.key}
              testID={card.testID}
              nativeID={card.testID}
              accessibilityRole="button"
              accessibilityLabel={card.label}
              onPress={() => router.push(card.path as any)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.iconWrap}>
                <FontAwesome name={card.icon} size={22} color={mobileTheme.colors.ink.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardHelper} numberOfLines={2}>{card.helper}</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color={mobileTheme.colors.ink.muted} />
            </Pressable>
          ))}
        </View>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 16,
  },
  grid: {
    gap: 10,
  },
  card: {
    ...mobileSurfaceCard,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.78,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface.secondary,
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  cardHelper: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 12,
    fontWeight: "500",
  },
});
