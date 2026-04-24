// @generated-by: implementation-agent
// @pipeline-run: 2026-04-20T-priority-1
// @diffs: DIFF-ADMIN-NP-001
// @do-not-edit: false

import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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

  return (
    <MobileWorkspaceShell
      eyebrow="Perfiles de Enfermeras"
      title="Gestión de enfermeras"
      description="Administra perfiles y estado operativo del personal de enfermería."
      testID={adminTestIds.nurses.listScreen}
      nativeID={adminTestIds.nurses.listScreen}
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

      {!loading && currentItems.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No se encontraron enfermeras en esta categoría.</Text>
        </View>
      )}

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        {tab === "pending" && pendingItems.map((item) => (
          <Pressable
            key={item.userId}
            onPress={() => router.push(`/admin/nurse-profiles/${item.userId}` as any)}
            style={[styles.card, styles.cardPending]}
            testID={`admin-nurse-profile-pending-card-${item.userId}`}
            nativeID={`admin-nurse-profile-pending-card-${item.userId}`}
            accessibilityRole="button"
            accessibilityLabel={`Perfil pendiente de ${item.name} ${item.lastName}`}
          >
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pendiente de revisión</Text>
            </View>
            <Text style={styles.cardTitle}>{item.name} {item.lastName}</Text>
            <Text style={styles.cardMeta}>{item.email}</Text>
            {item.identificationNumber && (
              <Text style={styles.cardDetail}>Cédula: {item.identificationNumber}</Text>
            )}
            {item.phone && (
              <Text style={styles.cardDetail}>Teléfono: {item.phone}</Text>
            )}
            {item.specialty && (
              <Text style={styles.cardDetail}>Especialidad: {item.specialty}</Text>
            )}
            <Pressable
              style={styles.reviewButton}
              onPress={() => router.push(`/admin/nurse-profiles/${item.userId}/review` as any)}
              accessibilityRole="button"
              accessibilityLabel={`Revisar perfil de ${item.name} ${item.lastName}`}
            >
              <Text style={styles.reviewButtonText}>Revisar Perfil</Text>
            </Pressable>
          </Pressable>
        ))}

        {(tab === "active" || tab === "inactive") && (tab === "active" ? activeItems : inactiveItems).map((item) => (
          <Pressable
            key={item.userId}
            onPress={() => router.push(`/admin/nurse-profiles/${item.userId}` as any)}
            style={styles.card}
            testID={`admin-nurse-profile-${tab}-card-${item.userId}`}
            nativeID={`admin-nurse-profile-${tab}-card-${item.userId}`}
            accessibilityRole="button"
            accessibilityLabel={`Perfil de ${item.name} ${item.lastName}`}
          >
            <Text style={styles.cardTitle}>{item.name} {item.lastName}</Text>
            <Text style={styles.cardMeta}>{item.email}</Text>
            
            {item.specialty && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Especialidad:</Text>
                <Text style={styles.cardValue}>{item.specialty}</Text>
              </View>
            )}
            
            {item.category && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Categoría:</Text>
                <Text style={styles.cardValue}>{item.category}</Text>
              </View>
            )}

            {item.workload && (
              <View style={styles.workloadSection}>
                <Text style={styles.workloadTitle}>Carga de trabajo</Text>
                <Text style={styles.workloadText}>
                  Total: {item.workload.totalAssignedCareRequests || 0} | 
                  Pendientes: {item.workload.pendingAssignedCareRequests || 0} | 
                  Aprobadas: {item.workload.approvedAssignedCareRequests || 0}
                </Text>
              </View>
            )}

            <View style={styles.statusRow}>
              {item.isProfileComplete && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓ Perfil completo</Text>
                </View>
              )}
              {item.isAssignmentReady && (
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeTextSuccess}>✓ Lista para asignación</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  buttonPrimary: { backgroundColor: designTokens.color.ink.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  buttonPrimaryText: { color: designTokens.color.ink.inverse, fontWeight: "700", fontSize: 14 },
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
  list: { gap: 12 },
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
