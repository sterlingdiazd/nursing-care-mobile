// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-NP-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { goBackOrReplace, mobileNavigationEscapes } from "@/src/utils/navigationEscapes";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { StatusBadge } from "@/src/components/shared/StatusBadge";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import { mobileSurfaceCard } from "@/src/design-system/mobileStyles";
import {
  getPendingNurseProfiles,
  getActiveNurseProfiles,
  getInactiveNurseProfiles,
  type PendingNurseProfileDto,
  type ActiveNurseProfileSummaryDto,
  type NurseProfileSummaryDto,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds/adminTestIds";

const PAGE_SIZE = 10;

type TabType = "pending" | "active" | "inactive";

const TAB_CHIPS: { label: string; value: TabType }[] = [
  { label: "Pendientes", value: "pending" },
  { label: "Activas", value: "active" },
  { label: "Inactivas", value: "inactive" },
];

function nurseStatusLabel(tab: TabType): string {
  switch (tab) {
    case "pending": return "Pendiente";
    case "active": return "Activa";
    case "inactive": return "Inactiva";
  }
}

export default function AdminNurseProfilesScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  // Default to the active roster (the day-to-day management view); the "Pendientes" chip shows a
  // count badge when there are profiles awaiting review.
  const [tab, setTab] = useState<TabType>("active");
  const [pendingItems, setPendingItems] = useState<PendingNurseProfileDto[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveNurseProfileSummaryDto[]>([]);
  const [inactiveItems, setInactiveItems] = useState<NurseProfileSummaryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load all three buckets once so the chip count badges are accurate and switching tabs is instant.
  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const [pending, active, inactive] = await Promise.all([
        getPendingNurseProfiles(),
        getActiveNurseProfiles(),
        getInactiveNurseProfiles(),
      ]);
      setPendingItems(pending);
      setActiveItems(active);
      setInactiveItems(inactive);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar perfiles de enfermeras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login" as any);
    if (requiresProfileCompletion) return void router.replace("/register" as any);
    if (!roles.includes("ADMIN")) return void router.replace("/" as any);
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  const currentItems = tab === "pending" ? pendingItems : tab === "active" ? activeItems : inactiveItems;

  function countFor(t: TabType): number {
    if (t === "pending") return pendingItems.length;
    if (t === "active") return activeItems.length;
    return inactiveItems.length;
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
      actions={(
        <Pressable
          testID={adminTestIds.nurses.listCreateButton}
          nativeID={adminTestIds.nurses.listCreateButton}
          style={styles.buttonPrimary}
          onPress={() => router.push("/admin/nurse-profiles/create" as any)}
          accessibilityRole="button"
          accessibilityLabel="Crear perfil de enfermera"
        >
          <Text style={styles.buttonPrimaryText}>Crear</Text>
        </Pressable>
      )}
    >
      {/* Status filter chips */}
      <View
        style={styles.chipRow}
        testID={adminTestIds.nurses.listReadinessChip}
        nativeID={adminTestIds.nurses.listReadinessChip}
      >
        {TAB_CHIPS.map((chip) => {
          const isActive = tab === chip.value;
          const count = countFor(chip.value);
          return (
            <Pressable
              key={chip.value}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setTab(chip.value)}
              accessibilityRole="tab"
              accessibilityLabel={`Filtrar por: ${chip.label}`}
              accessibilityState={{ selected: isActive }}
              testID={`admin-nurse-status-chip-${chip.value}`}
              nativeID={`admin-nurse-status-chip-${chip.value}`}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip.label}
              </Text>
              {count > 0 && (
                <View style={[styles.chipCount, isActive && styles.chipCountActive]}>
                  <Text style={[styles.chipCountText, isActive && styles.chipCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {!!error && (
        <Text
          testID={adminTestIds.nurses.listErrorBanner}
          nativeID={adminTestIds.nurses.listErrorBanner}
          style={styles.error}
        >
          {error}
        </Text>
      )}

      {loading && (
        <ActivityIndicator
          color={designTokens.color.ink.accent}
          accessibilityLabel="Cargando perfiles de enfermeras"
          style={{ marginVertical: 20 }}
        />
      )}

      {!loading && currentItems.length === 0 && (
        <Text style={styles.emptyText}>No hay enfermeras en este filtro.</Text>
      )}

      <FlatList
        data={currentItems as Array<PendingNurseProfileDto | ActiveNurseProfileSummaryDto | NurseProfileSummaryDto>}
        keyExtractor={(item) => item.userId}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        renderItem={({ item }) => {
          if (tab === "pending") {
            const p = item as PendingNurseProfileDto;
            return (
              <Pressable
                onPress={() => router.push(`/admin/nurse-profiles/${p.userId}` as any)}
                style={[styles.card, styles.cardPending]}
                testID={`admin-nurse-profile-pending-card-${p.userId}`}
                nativeID={`admin-nurse-profile-pending-card-${p.userId}`}
                accessibilityRole="button"
                accessibilityLabel={`Perfil pendiente de ${p.name} ${p.lastName}`}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{p.name} {p.lastName}</Text>
                  <StatusBadge
                    label="Pendiente"
                    tone="warning"
                    testID={`admin-nurse-profile-status-badge-${p.userId}`}
                  />
                </View>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {[p.identificationNumber, p.specialty].filter(Boolean).join(" · ")}
                </Text>
                <Pressable
                  style={styles.reviewButton}
                  onPress={() => router.push(`/admin/nurse-profiles/${p.userId}/review` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`Revisar perfil de ${p.name} ${p.lastName}`}
                >
                  <Text style={styles.reviewButtonText}>Revisar perfil</Text>
                </Pressable>
              </Pressable>
            );
          }

          const a = item as ActiveNurseProfileSummaryDto | NurseProfileSummaryDto;
          return (
            <Pressable
              onPress={() => router.push(`/admin/nurse-profiles/${a.userId}` as any)}
              style={styles.card}
              testID={`admin-nurse-profile-${tab}-card-${a.userId}`}
              nativeID={`admin-nurse-profile-${tab}-card-${a.userId}`}
              accessibilityRole="button"
              accessibilityLabel={`Perfil de ${a.name} ${a.lastName}`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{a.name} {a.lastName}</Text>
                <StatusBadge
                  label={nurseStatusLabel(tab)}
                  tone={tab === "active" ? "success" : "neutral"}
                  testID={`admin-nurse-profile-status-badge-${a.userId}`}
                />
              </View>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {[a.specialty, (a as ActiveNurseProfileSummaryDto).category].filter(Boolean).join(" · ")}
              </Text>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  buttonPrimary: {
    backgroundColor: designTokens.color.ink.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonPrimaryText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "700",
    fontSize: 14,
  },
  error: {
    backgroundColor: designTokens.color.surface.danger,
    color: designTokens.color.ink.danger,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  list: { flex: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: designTokens.color.ink.inverse,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: designTokens.color.border.subtle,
  },
  chipActive: {
    backgroundColor: designTokens.color.ink.primary,
    borderColor: designTokens.color.ink.primary,
  },
  chipText: {
    color: designTokens.color.ink.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: designTokens.color.ink.inverse,
  },
  chipCount: {
    backgroundColor: designTokens.color.surface.secondary,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipCountActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  chipCountText: {
    color: designTokens.color.ink.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  chipCountTextActive: {
    color: designTokens.color.ink.inverse,
  },
  emptyText: {
    color: designTokens.color.ink.muted,
    fontSize: 14,
    textAlign: "center",
    marginVertical: 24,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  card: { ...mobileSurfaceCard, padding: 14 },
  cardPending: {
    borderColor: designTokens.color.ink.warning,
    borderLeftWidth: 4,
    borderLeftColor: designTokens.color.ink.warning,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    color: designTokens.color.ink.primary,
    fontWeight: "800",
    fontSize: 16,
    flex: 1,
  },
  cardMeta: {
    color: designTokens.color.ink.muted,
    fontSize: 13,
    marginTop: 2,
  },
  reviewButton: {
    backgroundColor: designTokens.color.ink.accent,
    borderRadius: 12,
    paddingVertical: 8,
    marginTop: 12,
    alignItems: "center",
  },
  reviewButtonText: {
    color: designTokens.color.ink.inverse,
    fontWeight: "700",
    fontSize: 13,
  },
});
