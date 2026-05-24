import { useEffect, useMemo, useState } from "react";
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
import { FilterChips } from "@/src/components/shared/FilterChips";
import { ListRow } from "@/src/components/shared/ListRow";
import { Pagination } from "@/src/components/shared/Pagination";
import { Banner } from "@/src/components/shared/Banner";
import { mobileTheme } from "@/src/design-system/mobileStyles";
import { designTokens } from "@/src/design-system/tokens";
import { toneStyles, type WorkCardTone } from "@/src/design-system/tones";
import { useAuth } from "@/src/context/AuthContext";
import { usePagedList } from "@/src/hooks/usePagedList";
import { SwipePager } from "@/src/components/shared/SwipePager";
import { getAdminActionItems, type AdminActionItemDto } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";
import {
  automationProps,
  getAdminActionItemPrimaryLabel,
  resolveAdminOperationalDeepLink,
  sortAdminActionItems,
} from "@/src/utils/adminOperationalUx";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

type SeverityFilter = "All" | "High" | "Medium" | "Low";

const ENTITY_LABELS: Record<AdminActionItemDto["entityType"], string> = {
  CareRequest: "Solicitud",
  NurseProfile: "Enfermera",
  UserAccount: "Usuario",
  SystemIssue: "Sistema",
};

const STATE_LABELS: Record<AdminActionItemDto["state"], string> = {
  Unread: "No leída",
  Pending: "Pendiente",
};

function severityToTone(severity: AdminActionItemDto["severity"]): WorkCardTone {
  switch (severity) {
    case "High": return "danger";
    case "Medium": return "orange";
    case "Low": return "warning";
  }
}

const FILTER_OPTIONS: ReadonlyArray<{ key: SeverityFilter; label: string }> = [
  { key: "All", label: "Todas" },
  { key: "High", label: "Urgentes" },
  { key: "Medium", label: "Medias" },
  { key: "Low", label: "Bajas" },
];

const PAGE_SIZE = 10;

function ActionItemCard({ item }: { item: AdminActionItemDto }) {
  const tone = toneStyles[severityToTone(item.severity)];
  const entityLabel = ENTITY_LABELS[item.entityType];
  const stateLabel = STATE_LABELS[item.state];
  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: tone.border, borderLeftWidth: 4 },
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardEyebrow}>{entityLabel}</Text>
        <View style={[styles.statePill, { backgroundColor: tone.soft }]}>
          <Text style={[styles.statePillText, { color: tone.color }]}>{stateLabel}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={3}>{item.summary}</Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {item.assignedOwner ?? "Sin responsable"}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={getAdminActionItemPrimaryLabel(item)}
        onPress={() => {
          hapticFeedback.selection();
          router.push(resolveAdminOperationalDeepLink(item.deepLinkPath) as never);
        }}
        style={({ pressed }) => [styles.cardCta, pressed && styles.pressed]}
      >
        <Text style={styles.cardCtaText}>{getAdminActionItemPrimaryLabel(item)}</Text>
      </Pressable>
    </View>
  );
}

export default function AdminActionItemsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [filter, setFilter] = useState<SeverityFilter>("All");

  const isEnabled = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");

  const { items: rawItems, totalCount, page, pageCount, isLoading, isRefreshing, error, setPage, refresh } =
    usePagedList<AdminActionItemDto>({
      fetcher: (p, ps) => getAdminActionItems({ page: p, pageSize: ps }),
      pageSize: PAGE_SIZE,
      enabled: isEnabled,
      resetKey: "action-items",
    });

  // Client-side severity filter applied to the fetched page
  const items = useMemo(() => {
    const sorted = sortAdminActionItems(rawItems);
    if (filter === "All") return sorted;
    return sorted.filter((item) => item.severity === filter);
  }, [rawItems, filter]);

  const counts = useMemo(() => {
    const out: Record<SeverityFilter, number> = { All: totalCount, High: 0, Medium: 0, Low: 0 };
    for (const item of rawItems) out[item.severity] = (out[item.severity] ?? 0) + 1;
    return out;
  }, [rawItems, totalCount]);

  // Auth gating runs in an effect — calling router.replace() during render updates
  // the navigator mid-render ("Cannot update a component while rendering a different component").
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
    else if (requiresProfileCompletion) router.replace("/register");
    else if (!roles.includes("ADMIN")) router.replace("/");
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  if (!isEnabled) return null;

  const filterOptions = FILTER_OPTIONS.map((opt) => ({
    ...opt,
    count: counts[opt.key],
  }));

  return (
    <MobileWorkspaceShell
      title="Acciones pendientes"
      primaryReturnPlacement="header"
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      disableScroll
    >
      <View {...automationProps(adminTestIds.actionQueue.screen)} style={styles.screenRoot}>
        <FilterChips
          options={filterOptions}
          value={filter}
          onChange={(key) => setFilter(key)}
          testIDPrefix="admin-action-items-filter"
        />

        <Banner tone="error" message={error} />

        {isLoading && items.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={designTokens.color.ink.accentStrong} accessibilityLabel="Cargando..." />
          </View>
        ) : !isLoading && items.length === 0 && !error ? (
          <View style={styles.loadingState}>
            <Text style={styles.emptyText}>No hay acciones en este filtro.</Text>
          </View>
        ) : (
          <SwipePager page={page} pageCount={pageCount} onPageChange={setPage} style={styles.list}>
            <ScrollView
              style={{ flex: 1 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
            >
              {items.map((item) => (
                <View key={item.id} style={styles.itemWrap}>
                  <ActionItemCard item={item} />
                </View>
              ))}
            </ScrollView>
          </SwipePager>
        )}

        <Pagination
          currentPage={page}
          totalPages={pageCount}
          onPageChange={setPage}
          testID="admin-action-items-pagination"
        />
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    minHeight: 0,
    gap: 8,
  },
  list: { flex: 1 },
  itemWrap: { marginBottom: 12 },
  loadingState: { flex: 1, paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  emptyText: { color: designTokens.color.ink.muted, fontSize: 14 },

  card: {
    backgroundColor: mobileTheme.colors.surface.primary,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border.subtle,
    boxShadow: "0px 4px 10px rgba(18, 48, 68, 0.04)",
    elevation: 1,
    padding: 14,
    gap: 6,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardEyebrow: {
    color: mobileTheme.colors.ink.muted,
    fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6,
  },
  statePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statePillText: { fontSize: 12, fontWeight: "800" },
  cardTitle: { color: mobileTheme.colors.ink.primary, fontSize: 17, lineHeight: 22, fontWeight: "900" },
  cardMeta: { color: mobileTheme.colors.ink.secondary, fontSize: 12, fontWeight: "600" },
  cardCta: {
    alignSelf: "flex-end",
    marginTop: 4,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: mobileTheme.colors.surface.secondary,
  },
  cardCtaText: { color: mobileTheme.colors.ink.accent, fontSize: 13, fontWeight: "900" },

  pressed: { opacity: 0.78 },
});
