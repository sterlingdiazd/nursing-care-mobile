import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  getClientNotifications,
  markAllClientNotificationsRead,
  markClientNotificationRead,
} from "@/src/services/clientNotificationsService";
import type { ClientNotificationDto } from "@/src/types/client";
import { clientTestIds } from "@/src/testing/testIds";
import { formatDateTimeES } from "@/src/utils/spanishTextValidator";
import { hapticFeedback } from "@/src/utils/haptics";
import { isConnectivityError } from "@/src/services/httpClient";
import { readSnapshot, SnapshotBuckets, writeSnapshot } from "@/src/services/apiSnapshotCache";
import { OfflineSnapshotBanner } from "@/src/components/shared/OfflineSnapshotBanner";

function getSeverityStyle(severity: ClientNotificationDto["severity"]) {
  switch (severity) {
    case "success":
      return { bg: designTokens.color.surface.success, fg: designTokens.color.status.successText };
    case "warning":
      return { bg: designTokens.color.surface.warning, fg: designTokens.color.status.warningText };
    case "danger":
      return { bg: designTokens.color.surface.danger, fg: designTokens.color.status.dangerText };
    default:
      return { bg: designTokens.color.status.infoBg, fg: designTokens.color.ink.accentStrong };
  }
}

function getCareRequestId(item: ClientNotificationDto) {
  if (item.careRequestId) {
    return item.careRequestId;
  }

  if (item.entityType === "CareRequest" && item.entityId) {
    return item.entityId;
  }

  return null;
}

export default function ClientNotificationsScreen() {
  const { isAuthenticated, isReady, roles } = useAuth();
  const [items, setItems] = useState<ClientNotificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Connectivity-resilience: on a real network failure, fall back to the last
  // cached snapshot so the client sees their prior notifications behind an
  // offline banner instead of a blank screen with a red toast.
  const [isStale, setIsStale] = useState(false);
  const [staleCapturedAtUtc, setStaleCapturedAtUtc] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const load = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const response = await getClientNotifications();
      setItems(response);
      setIsStale(false);
      setStaleCapturedAtUtc(null);
      void writeSnapshot(SnapshotBuckets.clientNotifications, response);
      return true;
    } catch (nextError: unknown) {
      if (isConnectivityError(nextError)) {
        const cached = await readSnapshot<ClientNotificationDto[]>(SnapshotBuckets.clientNotifications);
        if (cached) {
          setItems(cached.data);
          setIsStale(true);
          setStaleCapturedAtUtc(cached.capturedAtUtc);
          setError(null);
          return false;
        }
      }
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar tus avisos.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!roles.includes("CLIENT")) {
      router.replace("/account");
      return;
    }
    void load();
  }, [isAuthenticated, isReady, roles, load]);

  const onRetryNotifications = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    await load();
    setIsRetrying(false);
  }, [isRetrying, load]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAtUtc).length, [items]);

  const markOne = async (item: ClientNotificationDto) => {
    hapticFeedback.selection();
    const careRequestId = getCareRequestId(item);
    if (!item.readAtUtc) {
      setIsActing(true);
      try {
        await markClientNotificationRead(item.id);
        setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, readAtUtc: new Date().toISOString() } : n));
        hapticFeedback.success();
      } catch (nextError: unknown) {
        hapticFeedback.error();
        setError(nextError instanceof Error ? nextError.message : "No fue posible marcar el aviso.");
        setIsActing(false);
        return;
      }
      setIsActing(false);
    }
    if (careRequestId) {
      router.push({ pathname: "/(tabs)/care-requests/[id]", params: { id: careRequestId } } as never);
    }
  };

  const markAll = async () => {
    hapticFeedback.selection();
    const unreadIds = items.filter((item) => !item.readAtUtc).map((item) => item.id);
    if (unreadIds.length === 0) {
      return;
    }

    setIsActing(true);
    try {
      await markAllClientNotificationsRead(unreadIds);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((item) => ({ ...item, readAtUtc: item.readAtUtc ?? now })));
      hapticFeedback.success();
    } catch (nextError: unknown) {
      hapticFeedback.error();
      setError(nextError instanceof Error ? nextError.message : "No fue posible actualizar los avisos.");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <MobileWorkspaceShell
      title="Avisos"
      description={unreadCount > 0 ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} pendiente${unreadCount === 1 ? "" : "s"}.` : "No tienes avisos pendientes."}
      testID={clientTestIds.notifications.screen}
      nativeID={clientTestIds.notifications.screen}
      primaryReturnLabel="Volver"
      onPrimaryReturn={() => router.back()}
      systemActions={unreadCount > 0 ? [{
        label: "Marcar leídos",
        onPress: markAll,
        variant: "secondary",
        disabled: isActing,
        testID: clientTestIds.notifications.markAllButton,
      }] : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isStale ? (
          <View style={styles.staleBannerWrap}>
            <OfflineSnapshotBanner
              capturedAtUtc={staleCapturedAtUtc ?? undefined}
              onRetry={onRetryNotifications}
              retrying={isRetrying}
              testID="client-notifications-offline-banner"
            />
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
            <Text style={styles.stateText}>Cargando avisos...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorBanner}>{error}</Text>
        ) : items.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.emptyTitle}>Todo está al día</Text>
            <Text style={styles.emptyText}>Aquí verás cambios importantes de tus solicitudes.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const unread = !item.readAtUtc;
              const severity = getSeverityStyle(item.severity);
              const careRequestId = getCareRequestId(item);
              return (
                <Pressable
                  key={item.id}
                  testID={clientTestIds.notifications.row(item.id)}
                  nativeID={clientTestIds.notifications.row(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => void markOne(item)}
                  style={({ pressed }) => [
                    styles.notificationCard,
                    unread && styles.notificationUnread,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <View style={[styles.statusDot, { backgroundColor: severity.bg }]}>
                      <Text style={[styles.statusDotText, { color: severity.fg }]}>
                        {unread ? "Nuevo" : "Leído"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.notificationBody}>{item.body}</Text>
                  {item.source || careRequestId ? (
                    <Text style={styles.notificationSource}>
                      Fuente: {item.source ?? "Solicitud de cuidado"}
                    </Text>
                  ) : null}
                  <Text style={styles.notificationMeta}>{formatDateTimeES(item.createdAtUtc)}</Text>
                  {unread ? (
                    <Text
                      testID={clientTestIds.notifications.markReadButton(item.id)}
                      nativeID={clientTestIds.notifications.markReadButton(item.id)}
                      style={styles.readHint}
                    >
                      {careRequestId ? "Toca para abrir la solicitud" : "Toca para marcar como leído"}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: designTokens.spacing.xxl },
  staleBannerWrap: { marginBottom: designTokens.spacing.md },
  list: { gap: designTokens.spacing.md },
  stateCard: {
    alignItems: "center",
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    backgroundColor: designTokens.color.surface.primary,
    padding: designTokens.spacing.xxl,
    gap: designTokens.spacing.sm,
  },
  stateText: { color: designTokens.color.ink.secondary, fontWeight: "700" },
  emptyTitle: { color: designTokens.color.ink.primary, fontSize: 18, fontWeight: "900" },
  emptyText: { color: designTokens.color.ink.secondary, textAlign: "center", lineHeight: 20 },
  errorBanner: {
    color: designTokens.color.status.dangerText,
    backgroundColor: designTokens.color.surface.danger,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
    fontWeight: "700",
  },
  notificationCard: {
    backgroundColor: designTokens.color.surface.primary,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  notificationUnread: {
    borderColor: designTokens.color.border.accent,
    backgroundColor: designTokens.color.surface.accent,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designTokens.spacing.md,
  },
  notificationTitle: {
    flex: 1,
    color: designTokens.color.ink.primary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  notificationBody: { color: designTokens.color.ink.secondary, lineHeight: 21 },
  notificationSource: {
    color: designTokens.color.ink.accentStrong,
    fontSize: 12,
    fontWeight: "800",
  },
  notificationMeta: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "700" },
  statusDot: { borderRadius: designTokens.radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  statusDotText: { fontSize: 11, fontWeight: "900" },
  readHint: { color: designTokens.color.ink.accentStrong, fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
