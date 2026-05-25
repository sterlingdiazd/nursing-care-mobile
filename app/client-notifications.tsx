import { useEffect, useMemo, useState } from "react";
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

export default function ClientNotificationsScreen() {
  const { isAuthenticated, isReady, roles } = useAuth();
  const [items, setItems] = useState<ClientNotificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const response = await getClientNotifications();
      setItems(response);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar tus avisos.");
    } finally {
      setIsLoading(false);
    }
  };

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
  }, [isAuthenticated, isReady, roles]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAtUtc).length, [items]);

  const markOne = async (item: ClientNotificationDto) => {
    hapticFeedback.selection();
    if (item.readAtUtc) {
      if (item.careRequestId) router.push({ pathname: "/(tabs)/care-requests/[id]", params: { id: item.careRequestId } } as never);
      return;
    }
    setIsActing(true);
    try {
      await markClientNotificationRead(item.id);
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, readAtUtc: new Date().toISOString() } : n));
      hapticFeedback.success();
    } catch (nextError: unknown) {
      hapticFeedback.error();
      setError(nextError instanceof Error ? nextError.message : "No fue posible marcar el aviso.");
    } finally {
      setIsActing(false);
    }
  };

  const markAll = async () => {
    hapticFeedback.selection();
    setIsActing(true);
    try {
      await markAllClientNotificationsRead();
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
        label: "Marcar leidos",
        onPress: markAll,
        variant: "secondary",
        disabled: isActing,
        testID: clientTestIds.notifications.markAllButton,
      }] : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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
                        {unread ? "Nuevo" : "Leido"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.notificationBody}>{item.body}</Text>
                  <Text style={styles.notificationMeta}>{formatDateTimeES(item.createdAtUtc)}</Text>
                  {unread ? (
                    <Text
                      testID={clientTestIds.notifications.markReadButton(item.id)}
                      nativeID={clientTestIds.notifications.markReadButton(item.id)}
                      style={styles.readHint}
                    >
                      Toca para marcar como leído
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
  notificationMeta: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "700" },
  statusDot: { borderRadius: designTokens.radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  statusDotText: { fontSize: 11, fontWeight: "900" },
  readHint: { color: designTokens.color.ink.accentStrong, fontSize: 13, fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
