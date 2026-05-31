import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import { designTokens, type PaletteHue } from "@/src/design-system/tokens";
import { IconBadge } from "@/src/components/shared/IconBadge";
import { MetricCard } from "@/src/components/shared/MetricCard";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";
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
  hue: PaletteHue;
  path: string;
  testID: string;
};

const SECTION_CARDS: SectionCard[] = [
  {
    key: "periods",
    label: "Períodos",
    helper: "Crear, cerrar y recalcular",
    icon: "calendar",
    hue: "blue",
    path: "/admin/payroll/periods",
    testID: "payroll-hub-card-periods",
  },
  {
    key: "deductions",
    label: "Deducciones únicas",
    helper: "Una vez en un período (ej. multa, anticipo)",
    icon: "minus-circle",
    hue: "red",
    path: "/admin/payroll/deductions",
    testID: "payroll-hub-card-deductions",
  },
  {
    key: "scheduled",
    label: "Descuentos fijos",
    helper: "Préstamo recurrente en cuotas",
    icon: "repeat",
    hue: "purple",
    path: "/admin/payroll/scheduled",
    testID: "payroll-hub-card-scheduled",
  },
  {
    key: "adjustments",
    label: "Ajustes",
    helper: "Por servicio: bono (+) o corrección (−)",
    icon: "pencil-square-o",
    hue: "amber",
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

  const dash = summaryLoading ? "—" : null;

  return (
    <MobileWorkspaceShell
      title="Gestión de Nómina"
      eyebrow="Nómina"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      disableScroll
    >
      <View
        testID="payroll-hub-screen"
        nativeID="payroll-hub-screen"
        style={styles.screen}
      >
        {/* KPI metrics row — viewport-fit, metrics-forward */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Nómina del período"
            value={dash ?? (summary ? formatCurrency(summary.totalCompensationCurrentPeriod) : "—")}
            color={designTokens.color.palette.blue.color}
            testID="payroll-hub-metric-compensation"
          />
          <MetricCard
            label="Períodos abiertos"
            value={dash ?? String(summary?.openPeriodsCount ?? "—")}
            color={designTokens.color.palette.amber.color}
            testID="payroll-hub-metric-open-periods"
          />
          <MetricCard
            label="Enfermeras activas"
            value={dash ?? String(summary?.activeNursesCount ?? "—")}
            color={designTokens.color.palette.green.color}
            testID="payroll-hub-metric-nurses"
          />
        </View>

        {/* Section cards — taxonomy helper copy clarifies each module */}
        <View style={styles.grid}>
          {SECTION_CARDS.map((card) => (
            <Pressable
              key={card.key}
              testID={card.testID}
              nativeID={card.testID}
              accessibilityRole="button"
              accessibilityLabel={card.label}
              onPress={() => {
                hapticFeedback.selection();
                router.push(card.path as any);
              }}
              style={({ pressed }) => [
                styles.card,
                { borderLeftColor: designTokens.color.palette[card.hue].color },
                pressed && styles.cardPressed,
              ]}
            >
              <IconBadge icon={card.icon} hue={card.hue} size={42} iconSize={22} />
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{card.label}</Text>
                <Text style={styles.cardHelper} numberOfLines={2}>{card.helper}</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color={designTokens.color.ink.muted} />
            </Pressable>
          ))}
        </View>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: designTokens.spacing.lg,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designTokens.spacing.md,
  },
  grid: {
    gap: designTokens.spacing.md,
  },
  card: {
    ...mobileSurfaceCard,
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.lg,
    padding: designTokens.spacing.lg,
    borderLeftWidth: 4,
  },
  cardPressed: {
    opacity: 0.78,
  },
  cardText: {
    flex: 1,
    gap: designTokens.spacing.xs,
  },
  cardLabel: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
  },
  cardHelper: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "500",
  },
});
