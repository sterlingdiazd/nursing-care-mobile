import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import { getAdminDashboard } from "@/src/services/adminPortalService";

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
      title="Panel administrativo mobile"
      description="Replica la visibilidad ejecutiva del portal web para seguimiento rapido de pendientes operativos."
      actions={
        <>
          <Pressable style={styles.button} onPress={() => router.push("/admin/users" as any)}>
            <Text style={styles.buttonText}>Usuarios</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => router.push("/admin/nurse-profiles" as any)}>
            <Text style={styles.buttonText}>Enfermeras</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => router.push("/admin/clients" as any)}>
            <Text style={styles.buttonText}>Clientes</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => router.push("/admin/care-requests" as any)}>
            <Text style={styles.buttonText}>Solicitudes</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => router.push("/admin/action-items" as any)}>
            <Text style={styles.buttonText}>Abrir cola de acciones</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => router.push("/admin/notifications" as any)}>
            <Text style={styles.buttonText}>Abrir notificaciones</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => router.push("/admin/audit-logs" as any)}>
            <Text style={styles.buttonText}>Abrir auditoria</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => router.push("/admin/reports" as any)}>
            <Text style={styles.buttonText}>Abrir reportes</Text>
          </Pressable>
        </>
      }
    >
      {error && <Text style={styles.error}>{error}</Text>}
      {snapshot && (
        <View style={styles.grid}>
          <View style={styles.card}><Text style={styles.label}>Perfiles pendientes</Text><Text style={styles.value}>{snapshot.pendingNurseProfilesCount}</Text></View>
          <View style={styles.card}><Text style={styles.label}>Sin asignar</Text><Text style={styles.value}>{snapshot.careRequestsWaitingForAssignmentCount}</Text></View>
          <View style={styles.card}><Text style={styles.label}>Pendientes de aprobacion</Text><Text style={styles.value}>{snapshot.careRequestsWaitingForApprovalCount}</Text></View>
          <View style={styles.card}><Text style={styles.label}>Notificaciones sin leer</Text><Text style={styles.value}>{snapshot.unreadAdminNotificationsCount}</Text></View>
        </View>
      )}
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  card: { backgroundColor: "#fffdf9", borderRadius: 18, borderWidth: 1, borderColor: "#dbe5f3", padding: 16 },
  label: { color: "#52637a", fontWeight: "700", marginBottom: 6 },
  value: { color: "#102a43", fontWeight: "800", fontSize: 28 },
  button: { backgroundColor: "#fef3c7", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { color: "#132d75", fontWeight: "800" },
  error: { color: "#b91c1c", marginBottom: 12 },
});
