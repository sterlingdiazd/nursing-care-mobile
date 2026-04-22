import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { mobileSecondaryButton, mobileSecondarySurface, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminDashboard } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import {
  automationProps,
  buildAdminDashboardStatusSummary,
  buildAdminDashboardTriage,
  getAdminSeverityPresentation,
} from "@/src/utils/adminOperationalUx";

const adminSections = [
  { label: "Usuarios", path: "/admin/users" },
  { label: "Enfermeras", path: "/admin/nurse-profiles" },
  { label: "Clientes", path: "/admin/clients" },
  { label: "Solicitudes", path: "/admin/care-requests" },
  { label: "Acciones", path: "/admin/action-items" },
  { label: "Notificaciones", path: "/admin/notifications" },
  { label: "Nomina", path: "/admin/payroll" },
  { label: "Auditoria", path: "/admin/audit-logs" },
  { label: "Reportes", path: "/admin/reports" },
] as const;

export default function AdminDashboardScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getAdminDashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modulesOpen, setModulesOpen] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login" as any);
      return;
    }
    if (requiresProfileCompletion) {
      router.replace("/register" as any);
      return;
    }
    if (!roles.includes("ADMIN")) {
      router.replace("/" as any);
      return;
    }

    void getAdminDashboard()
      .then(setSnapshot)
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el panel administrativo.");
      });
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const statusSummary = snapshot ? buildAdminDashboardStatusSummary(snapshot) : null;
  const triageCards = snapshot ? buildAdminDashboardTriage(snapshot) : [];

  return (
    <MobileWorkspaceShell
      eyebrow="Administracion"
      title="Panel administrativo"
      description="Supervisa lo urgente primero y deja el resto como exploracion secundaria."
      actions={
        <>
          <Pressable
            {...automationProps(adminTestIds.dashboard.primaryAction)}
            style={styles.primaryButton}
            onPress={() => router.push("/admin/action-items" as any)}
          >
            <Text style={styles.primaryButtonText}>Ver acciones</Text>
          </Pressable>
          <Pressable
            {...automationProps(adminTestIds.dashboard.requestsButton)}
            style={styles.secondaryButton}
            onPress={() => router.push("/admin/care-requests" as any)}
          >
            <Text style={styles.secondaryButtonText}>Abrir solicitudes</Text>
          </Pressable>
        </>
      }
    >
      <View {...automationProps(adminTestIds.dashboard.screen)} style={styles.screenRoot}>
        {error ? (
          <Text {...automationProps(adminTestIds.dashboard.errorBanner)} style={styles.error}>
            {error}
          </Text>
        ) : null}

        {statusSummary ? (
          <View {...automationProps(adminTestIds.dashboard.statusChip)} style={styles.statusBand}>
            <Text style={styles.statusLabel}>{statusSummary.label}</Text>
            <Text style={styles.statusHelper}>{statusSummary.helper}</Text>
          </View>
        ) : null}

        {snapshot ? (
          <>
            <Text style={styles.sectionTitle}>Triage rapido</Text>
            <View style={styles.triageGrid}>
              {triageCards.map((card, index) => {
                const presentation = getAdminSeverityPresentation(card.severity);
                const testId =
                  index === 0
                    ? adminTestIds.dashboard.triageOverdueButton
                    : index === 1
                      ? adminTestIds.dashboard.triageUnassignedButton
                      : adminTestIds.dashboard.triageApprovalsButton;

                return (
                  <Pressable
                    key={card.key}
                    {...automationProps(testId)}
                    style={[
                      styles.triageCard,
                      {
                        backgroundColor: presentation.backgroundColor,
                        borderColor: presentation.borderColor,
                      },
                    ]}
                    onPress={() => router.push(card.route as any)}
                  >
                    <Text style={[styles.triageLabel, { color: presentation.textColor }]}>{card.label}</Text>
                    <Text style={[styles.triageValue, { color: presentation.textColor }]}>{card.value}</Text>
                    <Text style={styles.triageHelper}>{card.helper}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.summaryStrip}>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryPillLabel}>Perfiles pendientes</Text>
                <Text style={styles.summaryPillValue}>{snapshot.pendingNurseProfilesCount}</Text>
              </View>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryPillLabel}>Notificaciones</Text>
                <Text style={styles.summaryPillValue}>{snapshot.unreadAdminNotificationsCount}</Text>
              </View>
            </View>
          </>
        ) : null}

        <Pressable
          {...automationProps(adminTestIds.dashboard.modulesToggleButton)}
          style={styles.modulesToggle}
          onPress={() => setModulesOpen((current) => !current)}
        >
          <Text style={styles.modulesToggleText}>{modulesOpen ? "Ocultar otros modulos" : "Ver otros modulos"}</Text>
        </Pressable>

        {modulesOpen ? (
          <View style={styles.sectionList}>
            {adminSections.map((section) => (
              <Pressable
                key={section.path}
                style={styles.sectionRow}
                onPress={() => router.push(section.path as any)}
              >
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <Text style={styles.sectionChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    gap: 16,
  },
  statusBand: {
    ...mobileSurfaceCard,
    padding: 16,
    gap: 4,
  },
  statusLabel: {
    color: mobileTheme.colors.ink.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  statusHelper: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    color: mobileTheme.colors.ink.primary,
    fontWeight: "800",
    fontSize: 18,
  },
  triageGrid: {
    gap: 12,
  },
  triageCard: {
    ...mobileSurfaceCard,
    padding: 16,
    gap: 4,
  },
  triageLabel: {
    fontWeight: "800",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  triageValue: {
    fontWeight: "900",
    fontSize: 30,
    lineHeight: 34,
  },
  triageHelper: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  summaryStrip: {
    flexDirection: "row",
    gap: 12,
  },
  summaryPill: {
    ...mobileSecondarySurface,
    flex: 1,
    padding: 14,
  },
  summaryPillLabel: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryPillValue: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  primaryButton: {
    ...mobileSecondaryButton,
    backgroundColor: mobileTheme.colors.ink.accent,
  },
  primaryButtonText: {
    color: mobileTheme.colors.ink.inverse,
    fontWeight: "800",
  },
  secondaryButton: {
    ...mobileSecondaryButton,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.ink.accentStrong,
    fontWeight: "700",
  },
  modulesToggle: {
    ...mobileSecondaryButton,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
  },
  modulesToggleText: {
    color: mobileTheme.colors.ink.accentStrong,
    fontWeight: "700",
  },
  sectionList: {
    marginTop: 8,
    backgroundColor: mobileTheme.colors.surface.primary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    overflow: "hidden",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border.subtle,
  },
  sectionLabel: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  sectionChevron: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 24,
    lineHeight: 24,
  },
  error: {
    ...mobileSecondarySurface,
    borderColor: mobileTheme.colors.border.danger,
    color: mobileTheme.colors.status.dangerText,
    padding: 14,
    fontWeight: "700",
  },
});
