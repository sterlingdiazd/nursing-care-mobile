import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FilterSelect } from "@/src/components/shared/FilterSelect";
import { designTokens } from "@/src/design-system/tokens";
import { Pagination } from "@/src/components/shared/Pagination";
import { SwipePager } from "@/src/components/shared/SwipePager";
import {
  mobileSecondaryButton,
  mobileSurfaceCard,
} from "@/src/design-system/mobileStyles";
import { useAuth } from "@/src/context/AuthContext";
import {
  archiveAdminNotification,
  dismissAdminNotification,
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAdminNotificationAsUnread,
  type AdminNotificationDto,
  type AdminNotificationStatus,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import {
  automationProps,
  getAdminSeverityPresentation,
  getNotificationPrimaryActionLabel,
  getNotificationSecondaryActionLabel,
  getNotificationStatusLabel,
  resolveAdminOperationalDeepLink,
} from "@/src/utils/adminOperationalUx";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

const PAGE_SIZE = 10;

// Per-filter counts would require one request per status value — we only fetch
// the active filter's page, so counts are omitted here.
const STATUS_FILTER_OPTIONS: ReadonlyArray<{ key: AdminNotificationStatus; label: string }> = [
  { key: "Active", label: "Activas" },
  { key: "Unread", label: "No Leídas" },
  { key: "ActionRequired", label: "Acción" },
  { key: "Archived", label: "Archivadas" },
  { key: "All", label: "Todas" },
];

export default function AdminNotificationsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminNotificationDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<AdminNotificationStatus>("Active");
  const [page, setPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = async (
    nextStatus: AdminNotificationStatus,
    nextPage: number,
    mode: "initial" | "refresh" | "navigate" = "initial",
  ) => {
    try {
      setError(null);
      if (mode === "refresh") setIsRefreshing(true);
      else setIsFetching(true);
      const response = await getAdminNotifications({
        status: nextStatus,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setItems(response.items);
      setTotalCount(response.totalCount);
      setPage(response.page);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "No fue posible cargar notificaciones.",
      );
    } finally {
      setIsFetching(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("ADMIN")) return void router.replace("/");
    void load(status, 1, "initial");
    // Initial fetch only — subsequent loads happen via filter/page handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated]);

  const runAction = async (work: () => Promise<void>) => {
    hapticFeedback.light();
    try {
      await work();
      // Re-fetch the current page after a mutation; counts may shift filters.
      await load(status, page, "refresh");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "No fue posible actualizar la notificación.",
      );
    }
  };

  const handleStatusChange = (next: AdminNotificationStatus) => {
    if (next === status) return;
    setStatus(next);
    setItems([]);
    void load(next, 1, "navigate");
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pageCount || nextPage === page) return;
    void load(status, nextPage, "navigate");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Per-view counts (one light request per status view) so every filter shows its number.
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    let cancelled = false;
    const keys: AdminNotificationStatus[] = ["Active", "Unread", "ActionRequired", "Archived", "All"];
    Promise.all(
      keys.map((k) =>
        getAdminNotifications({ status: k, page: 1, pageSize: 1 })
          .then((r) => [k, r.totalCount] as const)
          .catch(() => [k, 0] as const),
      ),
    ).then((pairs) => { if (!cancelled) setStatusCounts(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  }, [isReady, isAuthenticated, totalCount]);

  const notifPalette = designTokens.color.palette;
  const notifTint = (k: AdminNotificationStatus): { bg: string; fg: string } | null =>
    k === "Unread" ? { bg: notifPalette.amber.soft, fg: notifPalette.amber.text }
      : k === "ActionRequired" ? { bg: notifPalette.red.soft, fg: notifPalette.red.text }
      : k === "Archived" ? { bg: notifPalette.neutral.soft, fg: notifPalette.neutral.text }
      : null;
  const statusOptions = STATUS_FILTER_OPTIONS.map((opt) => ({
    ...opt,
    count: statusCounts ? (statusCounts[opt.key] ?? 0) : undefined,
    tint: notifTint(opt.key),
  }));

  const showingFrom = items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = (page - 1) * PAGE_SIZE + items.length;

  return (
    <MobileWorkspaceShell
      title="Notificaciones"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
    >
      <SwipePager page={page} pageCount={pageCount} onPageChange={handlePageChange} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          {...automationProps(adminTestIds.notifications.screen)}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void load(status, page, "refresh")}
              tintColor={designTokens.color.ink.accent}
            />
          }
        >
        {/* Status filter — compact SelectRow + sheet (shared pattern across status pages). */}
        <FilterSelect<AdminNotificationStatus>
          label="Estado"
          options={statusOptions}
          value={status}
          onChange={handleStatusChange}
          testIDPrefix="admin-notifications-filter"
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text
              {...automationProps(adminTestIds.notifications.errorBanner)}
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* Summary chip — totalCount, derived from response */}
        <View
          {...automationProps(adminTestIds.notifications.statusChip)}
          style={styles.summaryRow}
        >
          <Text style={styles.summaryText}>
            {isFetching && items.length === 0
              ? "Cargando…"
              : totalCount === 0
              ? "0 notificaciones"
              : `Mostrando ${showingFrom}–${showingTo} de ${totalCount}`}
          </Text>
        </View>

        {isFetching && items.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={designTokens.color.ink.accent} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No hay notificaciones en este filtro</Text>
            <Text style={styles.emptyHint}>Prueba otro filtro o desliza para actualizar.</Text>
          </View>
        ) : (
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
                    {...(isLead ? automationProps(adminTestIds.notifications.primaryAction) : {})}
                    style={[styles.cardButton, isLead && styles.cardButtonLead]}
                    onPress={() => {
                      if (item.deepLinkPath) {
                        hapticFeedback.selection();
                        router.push(resolveAdminOperationalDeepLink(item.deepLinkPath) as any);
                        return;
                      }
                      void runAction(() =>
                        item.readAtUtc
                          ? markAdminNotificationAsUnread(item.id)
                          : markAdminNotificationAsRead(item.id),
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={getNotificationPrimaryActionLabel(item)}
                  >
                    <Text style={[styles.cardButtonText, isLead && styles.cardButtonTextLead]}>
                      {getNotificationPrimaryActionLabel(item)}
                    </Text>
                  </Pressable>

                  <Pressable
                    {...(isLead ? automationProps(adminTestIds.notifications.secondaryToggle) : {})}
                    style={styles.secondaryToggle}
                    onPress={() => {
                      hapticFeedback.selection();
                      setExpandedId(isExpanded ? null : item.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={isExpanded ? "Ocultar acciones adicionales" : "Mostrar más acciones"}
                  >
                    <Text style={styles.secondaryToggleText}>
                      {isExpanded ? "Ocultar más" : "Más acciones"}
                    </Text>
                  </Pressable>

                  {isExpanded ? (
                    <View style={styles.secondaryActions}>
                      <Pressable
                        style={styles.secondaryAction}
                        onPress={() =>
                          void runAction(() =>
                            item.readAtUtc
                              ? markAdminNotificationAsUnread(item.id)
                              : markAdminNotificationAsRead(item.id),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={getNotificationSecondaryActionLabel(item)}
                      >
                        <Text style={styles.secondaryActionText}>
                          {getNotificationSecondaryActionLabel(item)}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryAction}
                        onPress={() => void runAction(() => dismissAdminNotification(item.id))}
                        accessibilityRole="button"
                        accessibilityLabel="Descartar aviso"
                      >
                        <Text style={styles.secondaryActionText}>Descartar</Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryAction}
                        onPress={() => void runAction(() => archiveAdminNotification(item.id))}
                        accessibilityRole="button"
                        accessibilityLabel="Archivar aviso"
                      >
                        <Text style={styles.secondaryActionText}>Archivar</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <Pagination currentPage={page} totalPages={pageCount} onPageChange={handlePageChange} />
        </ScrollView>
      </SwipePager>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.xxl,
  },
  summaryRow: {
    paddingHorizontal: designTokens.spacing.xs,
  },
  summaryText: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
  },
  loadingWrap: {
    paddingVertical: designTokens.spacing.huge,
    alignItems: "center",
  },
  emptyWrap: {
    paddingVertical: designTokens.spacing.huge,
    alignItems: "center",
    gap: designTokens.spacing.sm,
  },
  emptyTitle: {
    color: designTokens.color.ink.primary,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: "800",
  },
  emptyHint: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.label.fontSize,
  },
  list: {
    gap: designTokens.spacing.md,
  },
  card: {
    ...mobileSurfaceCard,
    padding: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
  },
  cardHeader: {
    gap: designTokens.spacing.xs,
  },
  chipsRow: {
    flexDirection: "row",
    gap: designTokens.spacing.sm,
    flexWrap: "wrap",
  },
  severityChip: {
    fontWeight: "800",
    fontSize: designTokens.typography.caption.fontSize,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stateChip: {
    color: designTokens.color.ink.secondary,
    fontWeight: "800",
    fontSize: designTokens.typography.caption.fontSize,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  source: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: "700",
  },
  title: {
    color: designTokens.color.ink.primary,
    fontWeight: "900",
    fontSize: designTokens.typography.body.fontSize,
  },
  body: {
    color: designTokens.color.ink.secondary,
    fontSize: designTokens.typography.body.fontSize,
    lineHeight: 20,
  },
  meta: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.caption.fontSize,
  },
  cardButton: {
    ...mobileSecondaryButton,
    backgroundColor: designTokens.color.surface.primary,
    alignSelf: "stretch",
    paddingHorizontal: designTokens.spacing.xl,
  },
  cardButtonLead: {
    backgroundColor: designTokens.color.ink.accent,
    borderColor: designTokens.color.ink.accentStrong,
  },
  cardButtonText: {
    color: designTokens.color.ink.accentStrong,
    fontWeight: "800",
  },
  cardButtonTextLead: {
    color: designTokens.color.ink.inverse,
  },
  secondaryToggle: {
    alignSelf: "flex-start",
    paddingVertical: designTokens.spacing.xs,
  },
  secondaryToggleText: {
    color: designTokens.color.ink.accent,
    fontWeight: "800",
    fontSize: designTokens.typography.caption.fontSize,
  },
  secondaryActions: {
    gap: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.xs,
  },
  secondaryAction: {
    ...mobileSecondaryButton,
    alignSelf: "stretch",
    paddingHorizontal: designTokens.spacing.lg,
  },
  secondaryActionText: {
    color: designTokens.color.ink.accentStrong,
    fontWeight: "800",
  },
  errorBanner: {
    backgroundColor: designTokens.color.surface.danger,
    borderColor: designTokens.color.border.danger,
    borderWidth: 1,
    borderRadius: designTokens.radius.md,
    padding: designTokens.spacing.md,
  },
  errorText: {
    color: designTokens.color.status.dangerText,
    fontSize: designTokens.typography.label.fontSize,
    fontWeight: "700",
  },
});
