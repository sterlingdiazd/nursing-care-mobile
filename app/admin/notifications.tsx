import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { mobileSecondaryButton, mobileSecondarySurface, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { useAuth } from "@/src/context/AuthContext";
import {
  archiveAdminNotification,
  dismissAdminNotification,
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAdminNotificationAsUnread,
  type AdminNotificationDto,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import {
  automationProps,
  getAdminSeverityPresentation,
  getNotificationPrimaryActionLabel,
  getNotificationSecondaryActionLabel,
  getNotificationStatusLabel,
  resolveAdminOperationalDeepLink,
  sortAdminNotifications,
} from "@/src/utils/adminOperationalUx";

export default function AdminNotificationsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminNotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const response = await getAdminNotifications();
      setItems(sortAdminNotifications(response));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar notificaciones.");
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const runAction = async (work: () => Promise<void>) => {
    try {
      await work();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible actualizar la notificacion.");
    }
  };

  const unreadCount = items.filter((item) => !item.readAtUtc).length;
  const actionRequiredCount = items.filter((item) => item.requiresAction).length;
  const leadItem = items[0] ?? null;

  return (
    <MobileWorkspaceShell
      eyebrow="Notificaciones"
      title="Notificaciones"
      description="Una accion dominante por tarjeta y opciones secundarias solo cuando las necesitas."
      actions={
        <Pressable style={styles.button} onPress={() => void load()}>
          <Text style={styles.buttonText}>Actualizar</Text>
        </Pressable>
      }
    >
      <View {...automationProps(adminTestIds.notifications.screen)} style={styles.screenRoot}>
        {error ? (
          <Text {...automationProps(adminTestIds.notifications.errorBanner)} style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View {...automationProps(adminTestIds.notifications.statusChip)} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Bandeja activa</Text>
          <Text style={styles.summaryValue}>{unreadCount}</Text>
          <Text style={styles.summaryHelper}>
            {actionRequiredCount > 0 ? `${actionRequiredCount} requieren accion · ` : ""}
            {items.length} notificaciones visibles
          </Text>
        </View>

        <Pressable
          {...automationProps(adminTestIds.notifications.primaryAction)}
          style={[styles.primaryLeadAction, styles.leadButton, !leadItem && styles.leadButtonDisabled]}
          disabled={!leadItem}
          onPress={() => {
            if (!leadItem) return;
            if (leadItem.deepLinkPath) {
              router.push(resolveAdminOperationalDeepLink(leadItem.deepLinkPath) as any);
              return;
            }
            void runAction(() =>
              leadItem.readAtUtc ? markAdminNotificationAsUnread(leadItem.id) : markAdminNotificationAsRead(leadItem.id),
            );
          }}
        >
          <Text style={styles.leadButtonText}>
            {leadItem ? getNotificationPrimaryActionLabel(leadItem) : "Sin notificaciones urgentes"}
          </Text>
        </Pressable>

        <View style={styles.list}>
          {items.map((item, index) => {
            const presentation = getAdminSeverityPresentation(item.severity);
            const isExpanded = expandedId === item.id;
            const isLead = index === 0;

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: presentation.backgroundColor,
                    borderColor: presentation.borderColor,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.chipsRow}>
                    <Text style={[styles.severityChip, { color: presentation.textColor }]}>
                      {presentation.label}
                    </Text>
                    <Text style={styles.stateChip}>{getNotificationStatusLabel(item)}</Text>
                  </View>
                  <Text style={styles.source}>{item.category}</Text>
                </View>

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                {item.source ? <Text style={styles.meta}>Origen: {item.source}</Text> : null}

                <Pressable
                  style={[styles.cardButton, isLead && styles.cardButtonLead]}
                  onPress={() => {
                    if (item.deepLinkPath) {
                      router.push(resolveAdminOperationalDeepLink(item.deepLinkPath) as any);
                      return;
                    }
                    void runAction(() =>
                      item.readAtUtc ? markAdminNotificationAsUnread(item.id) : markAdminNotificationAsRead(item.id),
                    );
                  }}
                >
                  <Text style={[styles.cardButtonText, isLead && styles.cardButtonTextLead]}>
                    {getNotificationPrimaryActionLabel(item)}
                  </Text>
                </Pressable>

                <Pressable
                  {...(isLead ? automationProps(adminTestIds.notifications.secondaryToggle) : {})}
                  style={styles.secondaryToggle}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <Text style={styles.secondaryToggleText}>
                    {isExpanded ? "Ocultar acciones secundarias" : "Ver acciones secundarias"}
                  </Text>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.secondaryActions}>
                    <Pressable
                      style={styles.secondaryAction}
                      onPress={() =>
                        void runAction(() =>
                          item.readAtUtc ? markAdminNotificationAsUnread(item.id) : markAdminNotificationAsRead(item.id),
                        )
                      }
                    >
                      <Text style={styles.secondaryActionText}>{getNotificationSecondaryActionLabel(item)}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryAction}
                      onPress={() => void runAction(() => dismissAdminNotification(item.id))}
                    >
                      <Text style={styles.secondaryActionText}>Descartar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryAction}
                      onPress={() => void runAction(() => archiveAdminNotification(item.id))}
                    >
                      <Text style={styles.secondaryActionText}>Archivar</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    gap: 16,
  },
  summaryCard: {
    ...mobileSurfaceCard,
    padding: 16,
    gap: 4,
  },
  summaryLabel: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: mobileTheme.colors.ink.primary,
    fontWeight: "900",
    fontSize: 30,
    lineHeight: 34,
  },
  summaryHelper: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  list: {
    gap: 12,
  },
  card: {
    ...mobileSurfaceCard,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    gap: 6,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  severityChip: {
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stateChip: {
    color: mobileTheme.colors.ink.secondary,
    fontWeight: "700",
    fontSize: 12,
  },
  source: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: mobileTheme.colors.ink.primary,
    fontWeight: "800",
    fontSize: 17,
  },
  body: {
    color: mobileTheme.colors.ink.secondary,
    lineHeight: 20,
  },
  meta: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 13,
  },
  cardButton: {
    ...mobileSecondaryButton,
    backgroundColor: mobileTheme.colors.surface.primary,
    alignSelf: "stretch",
    paddingHorizontal: 18,
  },
  cardButtonLead: {
    backgroundColor: mobileTheme.colors.ink.accent,
    borderColor: mobileTheme.colors.ink.accentStrong,
  },
  cardButtonText: {
    color: mobileTheme.colors.ink.accentStrong,
    fontWeight: "800",
  },
  cardButtonTextLead: {
    color: mobileTheme.colors.ink.inverse,
  },
  leadButton: {
    alignSelf: "stretch",
    paddingHorizontal: 18,
  },
  leadButtonDisabled: {
    opacity: 0.65,
  },
  leadButtonText: {
    color: mobileTheme.colors.ink.inverse,
    fontWeight: "800",
  },
  primaryLeadAction: {
    ...mobileSecondaryButton,
    backgroundColor: mobileTheme.colors.ink.accent,
  },
  secondaryToggle: {
    ...mobileSecondaryButton,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    minHeight: 44,
  },
  secondaryToggleText: {
    color: mobileTheme.colors.ink.accentStrong,
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryActions: {
    gap: 8,
    paddingTop: 4,
  },
  secondaryAction: {
    ...mobileSecondaryButton,
    alignSelf: "stretch",
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: mobileTheme.colors.ink.accentStrong,
    fontWeight: "700",
  },
  button: {
    ...mobileSecondaryButton,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: mobileTheme.colors.ink.accentStrong,
    fontWeight: "700",
  },
  error: {
    ...mobileSecondarySurface,
    borderColor: mobileTheme.colors.border.danger,
    color: mobileTheme.colors.status.dangerText,
    padding: 14,
    fontWeight: "700",
  },
});
