// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-NP-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { designTokens } from "@/src/design-system/tokens";
import {
  getPendingNurseProfiles,
  getActiveNurseProfiles,
  getInactiveNurseProfiles,
  type PendingNurseProfileDto,
  type ActiveNurseProfileSummaryDto,
  type NurseProfileSummaryDto,
} from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";

type TabType = "pending" | "active" | "inactive";

export default function AdminNurseProfilesScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [tab, setTab] = useState<TabType>("pending");
  const [pendingItems, setPendingItems] = useState<PendingNurseProfileDto[]>([]);
  const [activeItems, setActiveItems] = useState<ActiveNurseProfileSummaryDto[]>([]);
  const [inactiveItems, setInactiveItems] = useState<NurseProfileSummaryDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      if (tab === "pending") {
        const result = await getPendingNurseProfiles();
        setPendingItems(result);
      } else if (tab === "active") {
        const result = await getActiveNurseProfiles();
        setActiveItems(result);
      } else {
        const result = await getInactiveNurseProfiles();
        setInactiveItems(result);
      }
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
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles, tab]);

  if (!isReady || !isAuthenticated || !roles.includes("ADMIN")) {
    return null;
  }

  const currentItems = tab === "pending" ? pendingItems : tab === "active" ? activeItems : inactiveItems;

  const listHeader = (
    <>
      <View style={styles.summaryRow}>
        <Text
          testID={adminTestIds.nurses.listReadinessChip}
          nativeID={adminTestIds.nurses.listReadinessChip}
          style={styles.summaryChip}
        >
          Pendientes: {pendingItems.length} • Activas: {activeItems.length} • Inactivas: {inactiveItems.length}
        </Text>
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
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "pending" && styles.tabActive]}
          onPress={() => setTab("pending")}
          accessibilityRole="tab"
          accessibilityLabel="Pestaña de enfermeras pendientes"
          accessibilityState={{ selected: tab === "pending" }}
        >
          <Text style={[styles.tabText, tab === "pending" && styles.tabTextActive]}>
            Pendientes ({pendingItems.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "active" && styles.tabActive]}
          onPress={() => setTab("active")}
          accessibilityRole="tab"
          accessibilityLabel="Pestaña de enfermeras activas"
          accessibilityState={{ selected: tab === "active" }}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Activas ({activeItems.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "inactive" && styles.tabActive]}
          onPress={() => setTab("inactive")}
          accessibilityRole="tab"
          accessibilityLabel="Pestaña de enfermeras inactivas"
          accessibilityState={{ selected: tab === "inactive" }}
        >
          <Text style={[styles.tabText, tab === "inactive" && styles.tabTextActive]}>
            Inactivas ({inactiveItems.length})
          </Text>
        </Pressable>
      </View>
      {loading && (
        <ActivityIndicator
          color={designTokens.color.ink.accent}
          accessibilityLabel="Cargando perfiles de enfermeras"
          style={{ margin: 20 }}
        />
      )}
    </>
  );

  return (
    <MobileWorkspaceShell
      eyebrow="Perfiles de Enfermeras"
      title="Gestión de enfermeras"
      description="Administra perfiles y estado operativo del personal de enfermería."
      flat
      testID={adminTestIds.nurses.listScreen}
      nativeID={adminTestIds.nurses.listScreen}
      systemActions={[
        {
          label: "Crear",
          onPress: () => router.push("/admin/nurse-profiles/create" as any),
          variant: "primary",
          testID: adminTestIds.nurses.listCreateButton,
        },
      ]}
    >
      <FlatList
        data={currentItems as any[]}
        keyExtractor={(item: any) => item.userId}
        renderItem={({ item }: { item: any }) => {
          if (tab === "pending") {
            const pending = item as PendingNurseProfileDto;
            return (
              <Pressable
                onPress={() => router.push(`/admin/nurse-profiles/${pending.userId}` as any)}
                style={[styles.card, styles.cardPending]}
                testID={`admin-nurse-profile-pending-card-${pending.userId}`}
                nativeID={`admin-nurse-profile-pending-card-${pending.userId}`}
                accessibilityRole="button"
                accessibilityLabel={`Perfil pendiente de ${pending.name} ${pending.lastName}`}
              >
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pendiente de revisión</Text>
                </View>
                <Text style={styles.cardTitle}>{pending.name} {pending.lastName}</Text>
                <Text style={styles.cardMeta}>{pending.email}</Text>
                {pending.identificationNumber && (
                  <Text style={styles.cardDetail}>Cédula: {pending.identificationNumber}</Text>
                )}
                {pending.phone && (
                  <Text style={styles.cardDetail}>Teléfono: {pending.phone}</Text>
                )}
                {pending.specialty && (
                  <Text style={styles.cardDetail}>Especialidad: {pending.specialty}</Text>
                )}
                <Pressable
                  style={styles.reviewButton}
                  onPress={() => router.push(`/admin/nurse-profiles/${pending.userId}/review` as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`Revisar perfil de ${pending.name} ${pending.lastName}`}
                >
                  <Text style={styles.reviewButtonText}>Revisar Perfil</Text>
                </Pressable>
              </Pressable>
            );
          }
          const profile = item as unknown as ActiveNurseProfileSummaryDto;
          return (
            <Pressable
              onPress={() => router.push(`/admin/nurse-profiles/${profile.userId}` as any)}
              style={styles.card}
              testID={`admin-nurse-profile-${tab}-card-${profile.userId}`}
              nativeID={`admin-nurse-profile-${tab}-card-${profile.userId}`}
              accessibilityRole="button"
              accessibilityLabel={`Perfil de ${profile.name} ${profile.lastName}`}
            >
              <Text style={styles.cardTitle}>{profile.name} {profile.lastName}</Text>
              <Text style={styles.cardMeta}>{profile.email}</Text>
              {profile.specialty && (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Especialidad:</Text>
                  <Text style={styles.cardValue}>{profile.specialty}</Text>
                </View>
              )}
              {profile.category && (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Categoría:</Text>
                  <Text style={styles.cardValue}>{profile.category}</Text>
                </View>
              )}
              {profile.workload && (
                <View style={styles.workloadSection}>
                  <Text style={styles.workloadTitle}>Carga de trabajo</Text>
                  <Text style={styles.workloadText}>
                    Total: {profile.workload.totalAssignedCareRequests || 0} |
                    Pendientes: {profile.workload.pendingAssignedCareRequests || 0} |
                    Aprobadas: {profile.workload.approvedAssignedCareRequests || 0}
                  </Text>
                </View>
              )}
              <View style={styles.statusRow}>
                {profile.isProfileComplete && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>✓ Perfil completo</Text>
                  </View>
                )}
                {profile.isAssignmentReady && (
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeTextSuccess}>✓ Lista para asignación</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshing={loading}
        onRefresh={() => void load()}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No se encontraron enfermeras en esta categoría.</Text>
            </View>
          ) : null
        }
      />
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 16 },
  error: { backgroundColor: designTokens.color.surface.danger, color: designTokens.color.ink.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  summaryRow: { marginBottom: 10 },
  summaryChip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "800", backgroundColor: designTokens.color.surface.secondary, borderWidth: 1, borderColor: designTokens.color.border.subtle, color: designTokens.color.ink.primary },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: designTokens.color.ink.inverse, borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: designTokens.color.border.subtle },
  tabActive: { backgroundColor: designTokens.color.ink.primary, borderColor: designTokens.color.ink.primary },
  tabText: { color: designTokens.color.ink.primary, fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: designTokens.color.ink.inverse },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: designTokens.color.ink.secondary, fontSize: 16, textAlign: "center" },
  card: { backgroundColor: designTokens.color.ink.inverse, borderWidth: 1, borderColor: designTokens.color.border.subtle, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: "#000" /* RN shadow requires raw hex */, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardPending: { borderColor: designTokens.color.ink.warning, borderWidth: 1.5 },
  pendingBadge: { backgroundColor: designTokens.color.surface.warning, borderRadius: 10, padding: 8, marginBottom: 8, alignSelf: "flex-start" },
  pendingBadgeText: { color: designTokens.color.status.warningText, fontSize: 12, fontWeight: "700", textAlign: "center" },
  cardTitle: { color: designTokens.color.ink.primary, fontWeight: "800", fontSize: 18, marginBottom: 4 },
  cardMeta: { color: designTokens.color.ink.muted, fontSize: 14, marginBottom: 8 },
  cardDetail: { color: designTokens.color.ink.muted, fontSize: 13, marginBottom: 4 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: designTokens.color.ink.muted, fontSize: 13, fontWeight: "700", width: 100 },
  cardValue: { color: designTokens.color.ink.primary, fontSize: 13, flex: 1 },
  workloadSection: { backgroundColor: designTokens.color.surface.secondary, borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: designTokens.color.border.subtle },
  workloadTitle: { color: designTokens.color.ink.muted, fontSize: 12, fontWeight: "800", marginBottom: 4, textTransform: "uppercase" },
  workloadText: { color: designTokens.color.ink.primary, fontSize: 12 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: { backgroundColor: designTokens.color.surface.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: designTokens.color.ink.accentStrong, fontSize: 11, fontWeight: "700" },
  badgeSuccess: { backgroundColor: designTokens.color.surface.success, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTextSuccess: { color: designTokens.color.status.successText, fontSize: 11, fontWeight: "700" },
  reviewButton: { backgroundColor: designTokens.color.ink.accent, borderRadius: 14, paddingVertical: 10, marginTop: 12 },
  reviewButtonText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14, textAlign: "center" },
});
