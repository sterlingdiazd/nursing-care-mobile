// @generated-by: implementation-agent
// @pipeline-run: 2026-05-23-pagination-refactor
// @do-not-edit: false

import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";
import { hapticFeedback } from "@/src/utils/haptics";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { FilterSelect } from "@/src/components/shared/FilterSelect";
import { ListRow } from "@/src/components/shared/ListRow";
import { Pagination } from "@/src/components/shared/Pagination";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { Banner } from "@/src/components/shared/Banner";
import { useAuth } from "@/src/context/AuthContext";
import { usePagedList } from "@/src/hooks/usePagedList";
import { SwipePager } from "@/src/components/shared/SwipePager";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";
import { designTokens } from "@/src/design-system/tokens";
import {
  getPendingNurseProfiles,
  getActiveNurseProfilesPaged,
  getInactiveNurseProfiles,
  type PendingNurseProfileDto,
  type ActiveNurseProfileSummaryDto,
  type NurseProfileSummaryDto,
} from "@/src/services/adminPortalService";
import { useEffect, useState } from "react";

type TabType = "pending" | "active" | "inactive";

const PAGE_SIZE = 10;

export default function AdminNurseProfilesScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  // Default to active tab — pending is often empty, active is day-to-day management.
  const [tab, setTab] = useState<TabType>("active");

  const isEnabled = isReady && isAuthenticated && !requiresProfileCompletion && roles.includes("ADMIN");

  const pending = usePagedList<PendingNurseProfileDto>({
    fetcher: (p, ps) => getPendingNurseProfiles({ page: p, pageSize: ps }),
    pageSize: PAGE_SIZE,
    enabled: isEnabled,
    resetKey: "pending",
  });

  const active = usePagedList<ActiveNurseProfileSummaryDto>({
    fetcher: (p, ps) => getActiveNurseProfilesPaged({ page: p, pageSize: ps }),
    pageSize: PAGE_SIZE,
    enabled: isEnabled,
    resetKey: "active",
  });

  const inactive = usePagedList<NurseProfileSummaryDto>({
    fetcher: (p, ps) => getInactiveNurseProfiles({ page: p, pageSize: ps }),
    pageSize: PAGE_SIZE,
    enabled: isEnabled,
    resetKey: "inactive",
  });

  // Auth gating runs in an effect — calling router.replace() during render updates
  // the navigator mid-render ("Cannot update a component while rendering a different component").
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login" as never);
    else if (requiresProfileCompletion) router.replace("/register" as never);
    else if (!roles.includes("ADMIN")) router.replace("/" as never);
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  if (!isEnabled) return null;

  const current = tab === "pending" ? pending : tab === "active" ? active : inactive;

  // Always show all three tab counts — every bucket is loaded, so the numbers are known.
  const p = designTokens.color.palette;
  const chipOptions = [
    { key: "active" as TabType, label: "Activas", count: active.totalCount, tint: { bg: p.green.soft, fg: p.green.text } },
    { key: "pending" as TabType, label: "Pendientes", count: pending.totalCount, tint: { bg: p.amber.soft, fg: p.amber.text } },
    { key: "inactive" as TabType, label: "Inactivas", count: inactive.totalCount, tint: { bg: p.neutral.soft, fg: p.neutral.text } },
  ];

  const anyError = current.error;

  function handleRefresh() {
    pending.refresh();
    active.refresh();
    inactive.refresh();
  }

  return (
    <MobileWorkspaceShell
      onPrimaryReturn={() => goBackOrReplace(router, mobileNavigationEscapes.adminHome)}
      primaryReturnLabel="Volver"
      eyebrow="Perfiles de Enfermeras"
      title="Gestión de enfermeras"
      testID={adminTestIds.nurses.listScreen}
      nativeID={adminTestIds.nurses.listScreen}
      disableScroll
      systemActions={[
        {
          label: "Crear",
          onPress: () => router.push("/admin/nurse-profiles/create" as never),
          variant: "primary",
          testID: adminTestIds.nurses.listCreateButton,
        },
      ]}
    >
      <View style={styles.container}>
        <View
          testID={adminTestIds.nurses.listReadinessChip}
          nativeID={adminTestIds.nurses.listReadinessChip}
        >
          <FilterSelect
            label="Estado"
            options={chipOptions}
            value={tab}
            onChange={(key) => setTab(key)}
            testIDPrefix="admin-nurse-status-chip"
          />
        </View>

        <Banner tone="error" message={anyError} />

        {!current.isLoading && current.items.length === 0 && !anyError && (
          <Text
            style={styles.empty}
            testID={adminTestIds.nurses.listErrorBanner}
            nativeID={adminTestIds.nurses.listErrorBanner}
          >
            No hay enfermeras en este filtro.
          </Text>
        )}

        <SwipePager page={current.page} pageCount={current.pageCount} onPageChange={current.setPage} style={styles.list}>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={<RefreshControl refreshing={current.isRefreshing} onRefresh={handleRefresh} />}
          >
          {tab === "pending" && pending.items.map((p) => (
            <View key={p.userId}>
              <ListRow
                title={`${p.name ?? ""} ${p.lastName ?? ""}`.trim()}
                badge={<StatusBadge label="Pendiente" tone="warning" testID={`admin-nurse-profile-status-badge-${p.userId}`} />}
                metaLines={[p.identificationNumber, p.specialty]}
                railColor={designTokens.color.ink.warning}
                onPress={() => router.push(`/admin/nurse-profiles/${p.userId}` as never)}
                testID={`admin-nurse-profile-pending-card-${p.userId}`}
                accessibilityLabel={`Perfil pendiente de ${p.name} ${p.lastName}`}
              >
                <Pressable
                  style={styles.reviewButton}
                  onPress={() => {
                    hapticFeedback.selection();
                    router.push(`/admin/nurse-profiles/${p.userId}/review` as never);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Revisar perfil de ${p.name} ${p.lastName}`}
                >
                  <Text style={styles.reviewButtonText}>Revisar perfil</Text>
                </Pressable>
              </ListRow>
            </View>
          ))}

          {tab === "active" && active.items.map((a) => (
            <ListRow
              key={a.userId}
              title={`${a.name ?? ""} ${a.lastName ?? ""}`.trim()}
              badge={<StatusBadge label="Activa" tone="success" testID={`admin-nurse-profile-status-badge-${a.userId}`} />}
              metaLines={[a.specialty, (a as ActiveNurseProfileSummaryDto).category]}
              onPress={() => router.push(`/admin/nurse-profiles/${a.userId}` as never)}
              testID={`admin-nurse-profile-active-card-${a.userId}`}
              accessibilityLabel={`Perfil de ${a.name} ${a.lastName}`}
            />
          ))}

          {tab === "inactive" && inactive.items.map((n) => (
            <ListRow
              key={n.userId}
              title={`${n.name ?? ""} ${n.lastName ?? ""}`.trim()}
              badge={<StatusBadge label="Inactiva" tone="neutral" testID={`admin-nurse-profile-status-badge-${n.userId}`} />}
              metaLines={[n.specialty, n.category]}
              onPress={() => router.push(`/admin/nurse-profiles/${n.userId}` as never)}
              testID={`admin-nurse-profile-inactive-card-${n.userId}`}
              accessibilityLabel={`Perfil de ${n.name} ${n.lastName}`}
            />
          ))}
          </ScrollView>
        </SwipePager>

        <Pagination
          currentPage={current.page}
          totalPages={current.pageCount}
          onPageChange={current.setPage}
          testID="admin-nurses-pagination"
        />
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: designTokens.spacing.sm },
  list: { flex: 1 },
  empty: {
    color: designTokens.color.ink.muted,
    fontSize: designTokens.typography.body.fontSize,
    textAlign: "center",
    padding: designTokens.spacing.lg,
  },
  reviewButton: {
    backgroundColor: designTokens.color.ink.accent,
    borderRadius: designTokens.radius.md,
    paddingVertical: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
    alignItems: "center",
  },
  reviewButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "700",
    fontSize: designTokens.typography.label.fontSize,
  },
});
