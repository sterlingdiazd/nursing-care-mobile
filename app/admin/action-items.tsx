import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { mobileSecondaryButton, mobileSecondarySurface, mobileSurfaceCard, mobileTheme } from "@/src/design-system/mobileStyles";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminActionItems, type AdminActionItemDto } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import {
  automationProps,
  getAdminActionItemPrimaryLabel,
  getAdminActionItemStatusLabel,
  getAdminSeverityPresentation,
  resolveAdminOperationalDeepLink,
  sortAdminActionItems,
} from "@/src/utils/adminOperationalUx";

export default function AdminActionItemsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminActionItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");

    void getAdminActionItems()
      .then((response) => setItems(sortAdminActionItems(response)))
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "No fue posible cargar acciones."));
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const unreadCount = items.filter((item) => item.state === "Unread").length;
  const highSeverityCount = items.filter((item) => item.severity === "High").length;
  const leadItem = items[0] ?? null;

  return (
    <MobileWorkspaceShell
      eyebrow="Cola administrativa"
      title="Acciones pendientes"
      description="Prioriza lo urgente y abre cada caso en su ruta administrativa correcta."
      actions={
        <Pressable style={styles.button} onPress={() => router.push("/admin" as any)}>
          <Text style={styles.buttonText}>Volver al panel</Text>
        </Pressable>
      }
    >
      <View {...automationProps(adminTestIds.actionQueue.screen)} style={styles.screenRoot}>
        {error ? (
          <Text {...automationProps(adminTestIds.actionQueue.errorBanner)} style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View {...automationProps(adminTestIds.actionQueue.statusChip)} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Triage activo</Text>
          <Text style={styles.summaryValue}>{unreadCount}</Text>
          <Text style={styles.summaryHelper}>
            {highSeverityCount > 0 ? `${highSeverityCount} de alta prioridad · ` : ""}
            {items.length} elementos en cola
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Trabajo priorizado</Text>

        <Pressable
          {...automationProps(adminTestIds.actionQueue.primaryAction)}
          style={[styles.primaryLeadAction, styles.leadButton, !leadItem && styles.leadButtonDisabled]}
          disabled={!leadItem}
          onPress={() => {
            if (!leadItem) return;
            router.push(resolveAdminOperationalDeepLink(leadItem.deepLinkPath) as any);
          }}
        >
          <Text style={styles.leadButtonText}>
            {leadItem ? getAdminActionItemPrimaryLabel(leadItem) : "Sin acciones urgentes"}
          </Text>
        </Pressable>

        <View style={styles.list}>
          {items.map((item, index) => {
            const presentation = getAdminSeverityPresentation(item.severity);
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
                    <Text style={styles.stateChip}>{getAdminActionItemStatusLabel(item)}</Text>
                  </View>
                  <Text style={styles.entityText}>{item.entityIdentifier}</Text>
                </View>

                <Text style={styles.title}>{item.summary}</Text>
                <Text style={styles.body}>{item.requiredAction}</Text>

                <Text style={styles.context}>{item.assignedOwner ?? "Sin responsable"} · {item.entityType}</Text>

                <Pressable
                  style={[styles.cardButton, isLead && styles.cardButtonLead]}
                  onPress={() => router.push(resolveAdminOperationalDeepLink(item.deepLinkPath) as any)}
                >
                  <Text style={[styles.cardButtonText, isLead && styles.cardButtonTextLead]}>
                    {getAdminActionItemPrimaryLabel(item)}
                  </Text>
                </Pressable>
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
  sectionTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  list: {
    gap: 12,
  },
  card: {
    ...mobileSurfaceCard,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    gap: 8,
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
  entityText: {
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
  context: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 13,
  },
  cardButton: {
    ...mobileSecondaryButton,
    backgroundColor: mobileTheme.colors.surface.primary,
    alignSelf: "stretch",
    marginTop: 4,
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
