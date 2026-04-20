import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminDashboard } from "@/src/services/adminPortalService";
import { adminTestIds } from "@/src/testing/testIds";

const adminSections = [
  { label: "Usuarios", path: "/admin/users" },
  { label: "Enfermeras", path: "/admin/nurse-profiles" },
  { label: "Clientes", path: "/admin/clients" },
  { label: "Solicitudes", path: "/admin/care-requests" },
  { label: "Acciones", path: "/admin/action-items" },
  { label: "Notificaciones", path: "/admin/notifications" },
  { label: "Nomina", path: "/admin/payroll" },
  { label: "Auditoria", path: "/admin/audit-logs" },
  { label: "Reportes", path: "/admin/reports" },
] as const;

export default function AdminDashboardScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getAdminDashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login" as any);
      return;
    }
    if (requiresProfileCompletion) {
      router.replace("/register" as any);
      return;
    }
    if (!roles.includes("ADMIN")) {
      router.replace("/" as any);
      return;
    }

    void getAdminDashboard()
      .then(setSnapshot)
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "No fue posible cargar el panel administrativo.");
      });
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  return (
    <MobileWorkspaceShell
      eyebrow="Administracion"
      title="Panel administrativo"
      description="Supervisa pendientes y entra rapido a cada modulo."
      actions={
        <>
          <Pressable
            testID={adminTestIds.dashboard.actionsButton}
            nativeID={adminTestIds.dashboard.actionsButton}
            style={styles.primaryButton}
            onPress={() => router.push("/admin/action-items" as any)}
          >
            <Text style={styles.primaryButtonText}>Ver acciones</Text>
          </Pressable>
          <Pressable
            testID={adminTestIds.dashboard.requestsButton}
            nativeID={adminTestIds.dashboard.requestsButton}
            style={styles.secondaryButton}
            onPress={() => router.push("/admin/care-requests" as any)}
          >
            <Text style={styles.secondaryButtonText}>Abrir solicitudes</Text>
          </Pressable>
        </>
      }
    >
      {error && <Text style={styles.error}>{error}</Text>}
      {snapshot && (
        <>
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{snapshot.pendingNurseProfilesCount}</Text>
              <Text style={styles.metricLabel}>Perfiles pendientes</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{snapshot.careRequestsWaitingForAssignmentCount}</Text>
              <Text style={styles.metricLabel}>Sin asignar</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{snapshot.careRequestsWaitingForApprovalCount}</Text>
              <Text style={styles.metricLabel}>Pendientes de aprobacion</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{snapshot.unreadAdminNotificationsCount}</Text>
              <Text style={styles.metricLabel}>No leidas</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.sectionList}>
        {adminSections.map((section) => (
          <Pressable
            key={section.path}
            style={styles.sectionRow}
            onPress={() => router.push(section.path as any)}
          >
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <Text style={styles.sectionChevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
  },
  metricValue: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 28,
    marginBottom: 6,
  },
  metricLabel: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: "#007aff",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#007aff",
    fontWeight: "700",
  },
  sectionList: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionLabel: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },
  sectionChevron: {
    color: "#9ca3af",
    fontSize: 24,
    lineHeight: 24,
  },
  error: { color: "#b91c1c", marginBottom: 12 },
});
