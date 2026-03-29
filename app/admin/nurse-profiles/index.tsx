import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  getPendingNurseProfiles,
  getActiveNurseProfiles,
  getInactiveNurseProfiles,
  type PendingNurseProfileDto,
  type ActiveNurseProfileSummaryDto,
  type NurseProfileSummaryDto,
} from "@/src/services/adminPortalService";

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
      description="Administrar perfiles de enfermeras y su estado operacional."
      actions={(
        <Pressable style={styles.buttonPrimary} onPress={() => router.push("/admin/nurse-profiles/create" as any)}>
          <Text style={styles.buttonPrimaryText}>Crear</Text>
        </Pressable>
      )}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "pending" && styles.tabActive]}
          onPress={() => setTab("pending")}
        >
          <Text style={[styles.tabText, tab === "pending" && styles.tabTextActive]}>
            Pendientes ({pendingItems.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "active" && styles.tabActive]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Activas ({activeItems.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "inactive" && styles.tabActive]}
          onPress={() => setTab("inactive")}
        >
          <Text style={[styles.tabText, tab === "inactive" && styles.tabTextActive]}>
            Inactivas ({inactiveItems.length})
          </Text>
        </Pressable>
      </View>

      {loading && <Text style={styles.loading}>Cargando...</Text>}

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
          >
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>⚠️ Pendiente de revisión</Text>
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
  buttonPrimary: { backgroundColor: "#3b82f6", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  buttonPrimaryText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  error: { backgroundColor: "#fee", color: "#c00", padding: 12, borderRadius: 12, marginBottom: 12 },
  loading: { color: "#52637a", fontSize: 14, textAlign: "center", padding: 20 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: "#f0f4f8", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  tabActive: { backgroundColor: "#3b82f6" },
  tabText: { color: "#102a43", fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: "#ffffff" },
  emptyState: { padding: 40, alignItems: "center" },
  emptyStateText: { color: "#52637a", fontSize: 16, textAlign: "center" },
  list: { gap: 12 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14, marginBottom: 12 },
  cardPending: { borderColor: "#f59e0b", borderWidth: 2 },
  pendingBadge: { backgroundColor: "#fef3c7", borderRadius: 8, padding: 6, marginBottom: 8 },
  pendingBadgeText: { color: "#92400e", fontSize: 12, fontWeight: "700", textAlign: "center" },
  cardTitle: { color: "#102a43", fontWeight: "800", fontSize: 18, marginBottom: 4 },
  cardMeta: { color: "#52637a", fontSize: 14, marginBottom: 8 },
  cardDetail: { color: "#52637a", fontSize: 13, marginBottom: 4 },
  cardRow: { flexDirection: "row", marginBottom: 4 },
  cardLabel: { color: "#7c2d12", fontSize: 13, fontWeight: "700", width: 100 },
  cardValue: { color: "#102a43", fontSize: 13, flex: 1 },
  workloadSection: { backgroundColor: "#f0f4f8", borderRadius: 8, padding: 8, marginTop: 8 },
  workloadTitle: { color: "#7c2d12", fontSize: 12, fontWeight: "800", marginBottom: 4 },
  workloadText: { color: "#102a43", fontSize: 12 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: { backgroundColor: "#dbeafe", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#1e40af", fontSize: 11, fontWeight: "700" },
  badgeSuccess: { backgroundColor: "#d1fae5", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeTextSuccess: { color: "#065f46", fontSize: 11, fontWeight: "700" },
  reviewButton: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 10, marginTop: 12 },
  reviewButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 14, textAlign: "center" },
});
