import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { toneStyles, type WorkCardTone } from "@/src/design-system/tones";
import type { PaletteHue } from "@/src/design-system/tokens";
import { ActionCard } from "@/src/components/shared/ActionCard";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminDashboard, type AdminDashboardSnapshotDto } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { automationProps } from "@/src/utils/adminOperationalUx";
import { useToast } from "@/src/components/shared/ToastProvider";
import { isConnectivityError } from "@/src/services/httpClient";
import { readSnapshot, SnapshotBuckets } from "@/src/services/apiSnapshotCache";
import { OfflineSnapshotBanner } from "@/src/components/shared/OfflineSnapshotBanner";

// Bridges the work-card "tone" vocabulary to the unified palette hues used by ActionCard.
const TONE_TO_HUE: Record<WorkCardTone, PaletteHue> = {
  danger: "red",
  orange: "orange",
  warning: "amber",
  info: "blue",
  neutral: "neutral",
};

interface WorkCardConfig {
  key: string;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  actionLabel: string;
  icon: ComponentProps<typeof FontAwesome>["name"];
  route: string;
  testID: string;
  tone: WorkCardTone;
  /** Toast message shown when count is 0. Tapping the card no-ops + toast. */
  emptyMessage: string;
}

function buildWorkCards(snapshot: AdminDashboardSnapshotDto): WorkCardConfig[] {
  return [
    {
      key: "overdue",
      title: "Vencidas",
      description: "Solicitudes vencidas",
      count: snapshot.overdueOrStaleRequestsCount,
      countLabel: "pendientes",
      actionLabel: "Revisar",
      icon: "exclamation-circle",
      route: "/admin/care-requests?view=overdue",
      testID: adminTestIds.dashboard.triageOverdueButton,
      tone: "danger",
      emptyMessage: "No hay solicitudes vencidas.",
    },
    {
      key: "assignment",
      title: "Asignación",
      description: "Sin asignar",
      count: snapshot.careRequestsWaitingForAssignmentCount,
      countLabel: "solicitudes",
      actionLabel: "Asignar",
      icon: "user-md",
      route: "/admin/care-requests?view=unassigned",
      testID: adminTestIds.dashboard.triageUnassignedButton,
      tone: "orange",
      emptyMessage: "No hay solicitudes sin asignar.",
    },
    {
      key: "approval",
      title: "Aprobación",
      description: "Pendientes de aprobación",
      count: snapshot.careRequestsWaitingForApprovalCount,
      countLabel: "pendientes",
      actionLabel: "Revisar",
      icon: "check-square-o",
      route: "/admin/care-requests?view=pending-approval",
      testID: adminTestIds.dashboard.triageApprovalsButton,
      tone: "warning",
      emptyMessage: "No hay solicitudes pendientes de aprobación.",
    },
    {
      key: "follow-up",
      title: "Seguimiento",
      description: "Alertas y casos a dar seguimiento",
      count: snapshot.unreadAdminNotificationsCount,
      countLabel: "alerta",
      actionLabel: "Ver detalles",
      icon: "bell",
      route: "/admin/notifications",
      testID: adminTestIds.dashboard.notificationsButton,
      tone: "info",
      emptyMessage: "No hay alertas ni casos de seguimiento.",
    },
  ];
}

function formatCountLabel(count: number, label: string) {
  if (label === "alerta") {
    return `${count} ${count === 1 ? "alerta" : "alertas"}`;
  }

  return `${count} ${label}`;
}

export default function AdminDashboardScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const { showToast } = useToast();
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  // When true, `snapshot` is the cached fallback rendered while the API is
  // unreachable. The OfflineSnapshotBanner is shown above the cards; tapping
  // Reintentar re-fetches and swaps in live data when it succeeds.
  const [isStale, setIsStale] = useState(false);
  const [staleCapturedAtUtc, setStaleCapturedAtUtc] = useState<string | undefined>(undefined);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const fresh = await getAdminDashboard();
      setSnapshot(fresh);
      setError(null);
      setIsStale(false);
      setStaleCapturedAtUtc(undefined);
      return true;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "No fue posible cargar el panel administrativo.";
      // Connectivity errors are the silent demo-killer. Instead of leaving the
      // screen blank with a red toast, fall back to the last cached snapshot
      // so the admin sees real data + a banner explaining the situation.
      if (isConnectivityError(nextError)) {
        const cached = await readSnapshot<AdminDashboardSnapshotDto>(SnapshotBuckets.adminDashboard);
        if (cached) {
          setSnapshot(cached.data);
          setIsStale(true);
          setStaleCapturedAtUtc(cached.capturedAtUtc);
          setError(null);
          return false;
        }
      }
      setError(message);
      return false;
    }
  }, []);

  const fetchedRef = useRef(false);
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

    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void loadDashboard();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, loadDashboard]);

  const onRetry = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    const ok = await loadDashboard();
    setIsRetrying(false);
    if (!ok && isStale) {
      showToast({ variant: "warning", message: "El API sigue sin responder. Mostrando últimos datos guardados." });
    }
  }, [isRetrying, isStale, loadDashboard, showToast]);

  const pendingTasks = snapshot?.pendingDashboardTasksCount ?? 0;
  const completedTasks = snapshot?.completedDashboardTasksTodayCount ?? 0;
  const totalTasks = snapshot?.totalDashboardTasksTodayCount ?? 0;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 1;
  const workCards = snapshot ? buildWorkCards(snapshot) : [];
  const hasUnreadNotifications = (snapshot?.unreadAdminNotificationsCount ?? 0) > 0;

  return (
    <MobileWorkspaceShell
      title="Inicio"
      disableScroll
      headerAccessory={
        <Pressable
          {...automationProps(adminTestIds.dashboard.alertButton)}
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
          onPress={() => router.push("/admin/notifications" as any)}
          style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
        >
          <FontAwesome name="bell-o" size={22} color={mobileTheme.colors.ink.primary} />
          {hasUnreadNotifications ? <View style={styles.unreadDot} /> : null}
        </Pressable>
      }
    >
      <View {...automationProps(adminTestIds.dashboard.screen)} style={styles.screenRoot}>
        {isStale ? (
          <OfflineSnapshotBanner
            capturedAtUtc={staleCapturedAtUtc}
            onRetry={onRetry}
            retrying={isRetrying}
            testID="admin-dashboard-offline-banner"
          />
        ) : null}

        {error ? (
          <Text {...automationProps(adminTestIds.dashboard.errorBanner)} style={styles.error}>
            {error}
          </Text>
        ) : null}

        {snapshot ? (
          <>
            <Pressable
              {...automationProps(adminTestIds.dashboard.progressCard)}
              accessibilityRole="button"
              onPress={() => router.push("/admin/action-items" as any)}
              style={({ pressed }) => [styles.progressCard, pressed && styles.pressed]}
            >
              <View style={styles.progressIconWrap}>
                <FontAwesome name="line-chart" size={25} color={toneStyles.info.color} />
              </View>
              <View style={styles.progressBody}>
                <Text style={styles.progressTitle}>Trabajo pendiente</Text>
                <Text style={styles.progressPending}>
                  Tienes <Text style={styles.progressPendingNumber}>{pendingTasks}</Text> tareas pendientes
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
              <Text style={styles.progressMeta}>
                {completedTasks} de {totalTasks} tareas completadas
              </Text>
            </View>
            </Pressable>

            <View style={styles.workList}>
              {workCards.map((card) => (
                <ActionCard
                  key={card.key}
                  icon={card.icon}
                  hue={TONE_TO_HUE[card.tone]}
                  title={card.title}
                  subtitle={card.description}
                  countText={formatCountLabel(card.count, card.countLabel)}
                  actionLabel={card.actionLabel}
                  testID={card.testID}
                  style={styles.workCardFill}
                  onPress={() => {
                    if (card.count === 0) {
                      showToast({ variant: "info", message: card.emptyMessage });
                      return;
                    }
                    router.push(card.route as any);
                  }}
                />
              ))}
            </View>
          </>
        ) : error ? null : (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Cargando panel...</Text>
          </View>
        )}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    gap: 10,
    paddingBottom: 8,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.colors.surface.primary,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    ...mobileTheme.shadows.raised,
  },
  unreadDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: mobileTheme.colors.ink.danger,
  },
  progressCard: {
    ...mobileSurfaceCard,
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderColor: mobileTheme.colors.border.accent,
  },
  progressIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: toneStyles.info.soft,
  },
  progressBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  progressTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  progressPending: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  progressPendingNumber: {
    color: toneStyles.info.color,
    fontWeight: "900",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: mobileTheme.colors.surface.tertiary,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: toneStyles.info.color,
  },
  progressMeta: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  workList: {
    flex: 1,
    gap: 10,
  },
  workCardFill: {
    flex: 1,
  },
  loadingCard: {
    ...mobileSurfaceCard,
    padding: 16,
  },
  loadingText: {
    color: mobileTheme.colors.ink.secondary,
    fontWeight: "700",
  },
  error: {
    backgroundColor: mobileTheme.colors.status.dangerBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.danger,
    color: mobileTheme.colors.status.dangerText,
    padding: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.78,
  },
});
