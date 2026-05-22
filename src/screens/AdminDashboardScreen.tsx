import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { toneStyles, type WorkCardTone } from "@/src/design-system/tones";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminDashboard, type AdminDashboardSnapshotDto } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import { automationProps } from "@/src/utils/adminOperationalUx";
import { useToast } from "@/src/components/shared/ToastProvider";

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
    void getAdminDashboard()
      .then(setSnapshot)
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el panel administrativo.");
      });
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

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
              {workCards.map((card) => {
                const tone = toneStyles[card.tone];

                return (
                  <Pressable
                    key={card.key}
                    {...automationProps(card.testID)}
                    accessibilityRole="button"
                    onPress={() => {
                      if (card.count === 0) {
                        showToast({ variant: "info", message: card.emptyMessage });
                        return;
                      }
                      router.push(card.route as any);
                    }}
                    style={({ pressed }) => [
                      styles.workCard,
                      { borderLeftColor: tone.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.workIconWrap, { backgroundColor: tone.soft }]}>
                      <FontAwesome name={card.icon} size={30} color={tone.color} />
                    </View>
                    <View style={styles.workBody}>
                      <Text style={styles.workTitle} numberOfLines={1}>
                        {card.title}
                      </Text>
                      <Text style={styles.workDescription} numberOfLines={1}>
                        {card.description}
                      </Text>
                      <View style={[styles.countPill, { backgroundColor: tone.soft }]}>
                        <Text style={[styles.countPillText, { color: tone.color }]}>
                          {formatCountLabel(card.count, card.countLabel)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.workAction}>
                      <View style={[styles.actionButton, { borderColor: tone.color }]}>
                        <Text style={[styles.actionButtonText, { color: tone.color }]}>{card.actionLabel}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
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
    backgroundColor: "#ef1d2d",
  },
  progressCard: {
    ...mobileSurfaceCard,
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderColor: "#cfe3ff",
    backgroundColor: "#f8fbff",
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
    backgroundColor: "#e8edf5",
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
  workCard: {
    ...mobileSurfaceCard,
    flex: 1,
    minHeight: 106,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderLeftWidth: 4,
  },
  workIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  workBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  workTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  workDescription: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    fontWeight: "600",
  },
  countPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countPillText: {
    fontSize: 13,
    fontWeight: "800",
  },
  workAction: {
    alignItems: "flex-end",
    gap: 16,
  },
  actionButton: {
    minWidth: 86,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "800",
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
