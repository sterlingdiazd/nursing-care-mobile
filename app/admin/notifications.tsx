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
import { Pagination } from "@/src/components/shared/Pagination";
import {
  mobileSecondaryButton,
  mobileSurfaceCard,
  mobileTheme,
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

const PAGE_SIZE = 10;

const STATUS_FILTERS: ReadonlyArray<{ key: AdminNotificationStatus; label: string }> = [
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

  const showingFrom = items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = (page - 1) * PAGE_SIZE + items.length;

  return (
    <MobileWorkspaceShell
      title="Notificaciones"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
    >
      <ScrollView
        ref={scrollRef}
        {...automationProps(adminTestIds.notifications.screen)}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load(status, page, "refresh")}
            tintColor={mobileTheme.colors.ink.accent}
          />
        }
      >
        {/* Status filter chips — always visible, render-first */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {STATUS_FILTERS.map((f) => {
            const active = f.key === status;
            return (
              <Pressable
                key={f.key}
                onPress={() => handleStatusChange(f.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filtro ${f.label}`}
                testID={`admin-notifications-filter-${f.key.toLowerCase()}`}
                nativeID={`admin-notifications-filter-${f.key.toLowerCase()}`}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

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
            <ActivityIndicator color={mobileTheme.colors.ink.accent} />
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
                        router.push(resolveAdminOperationalDeepLink(item.deepLinkPath) as any);
                        return;
                      }
                      void runAction(() =>
                        item.readAtUtc
                          ? markAdminNotificationAsUnread(item.id)
                          : markAdminNotificationAsRead(item.id),
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
                      >
                        <Text style={styles.secondaryActionText}>
                          {getNotificationSecondaryActionLabel(item)}
                        </Text>
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
        )}

        <Pagination currentPage={page} totalPages={pageCount} onPageChange={handlePageChange} />
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 12,
    paddingBottom: 24,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
  },
  filterChipActive: {
    backgroundColor: mobileTheme.colors.ink.accent,
    borderColor: mobileTheme.colors.ink.accentStrong,
  },
  filterChipText: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  filterChipTextActive: {
    color: mobileTheme.colors.ink.inverse,
  },
  summaryRow: {
    paddingHorizontal: 4,
  },
  summaryText: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyHint: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
  },
  list: {
    gap: 12,
  },
  card: {
    ...mobileSurfaceCard,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    gap: 4,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  severityChip: {
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  stateChip: {
    color: mobileTheme.colors.ink.secondary,
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  source: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: mobileTheme.colors.ink.primary,
    fontWeight: "900",
    fontSize: 16,
  },
  body: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 12,
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
  secondaryToggle: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  secondaryToggleText: {
    color: mobileTheme.colors.ink.accent,
    fontWeight: "800",
    fontSize: 12,
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
    fontWeight: "800",
  },
  errorBanner: {
    backgroundColor: mobileTheme.colors.surface.danger,
    borderColor: mobileTheme.colors.border.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: mobileTheme.colors.status.dangerText,
    fontSize: 13,
    fontWeight: "700",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
  },
  pageChip: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: mobileTheme.colors.surface.secondary,
    alignItems: "center",
  },
  pageChipActive: {
    backgroundColor: mobileTheme.colors.ink.accent,
  },
  pageChipText: {
    color: mobileTheme.colors.ink.secondary,
    fontSize: 13,
    fontWeight: "800",
  },
  pageChipTextActive: {
    color: mobileTheme.colors.ink.inverse,
  },
  pageEllipsis: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 4,
  },
  pageNav: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: mobileTheme.colors.surface.secondary,
    alignItems: "center",
  },
  pageNavDisabled: {
    opacity: 0.4,
  },
  pageNavText: {
    color: mobileTheme.colors.ink.primary,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 18,
  },
});
