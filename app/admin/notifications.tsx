import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import MobileWorkspaceShell from "@/components/app/MobileWorkspaceShell";
import { useAuth } from "@/src/context/AuthContext";
import {
  archiveAdminNotification,
  dismissAdminNotification,
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAdminNotificationAsUnread,
  type AdminNotificationDto,
} from "@/src/services/adminPortalService";

function resolveMobileDeepLink(path: string | null) {
  if (!path) return "/admin";
  if (path.startsWith("/admin/care-requests/")) {
    const id = path.replace("/admin/care-requests/", "").split("?")[0];
    return `/care-requests/${id}`;
  }
  return "/admin";
}

export default function AdminNotificationsScreen() {
  const { isReady, isAuthenticated, requiresProfileCompletion, roles } = useAuth();
  const [items, setItems] = useState<AdminNotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const response = await getAdminNotifications();
      setItems(response);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible cargar notificaciones.");
    }
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) return void router.replace("/login");
    if (requiresProfileCompletion) return void router.replace("/register");
    if (!roles.includes("Admin")) return void router.replace("/");
    void load();
  }, [isReady, isAuthenticated, requiresProfileCompletion, roles]);

  const runAction = async (work: () => Promise<void>) => {
    try {
      await work();
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible actualizar la notificacion.");
    }
  };

  return (
    <MobileWorkspaceShell
      eyebrow="Notificaciones"
      title="Centro de notificaciones administrativo"
      description="Replica mobile de la bandeja de avisos del portal web con lectura, descarte y archivo."
      actions={<Pressable style={styles.button} onPress={() => void load()}><Text style={styles.buttonText}>Actualizar</Text></Pressable>}
    >
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.meta}>{item.severity} · {item.readAtUtc ? "Leida" : "No leida"} · {item.category}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            {item.source ? <Text style={styles.source}>Origen: {item.source}</Text> : null}
            <View style={styles.actions}>
              <Pressable style={styles.action} onPress={() => void runAction(() => item.readAtUtc ? markAdminNotificationAsUnread(item.id) : markAdminNotificationAsRead(item.id))}>
                <Text style={styles.actionText}>{item.readAtUtc ? "No leida" : "Leida"}</Text>
              </Pressable>
              <Pressable style={styles.action} onPress={() => void runAction(() => dismissAdminNotification(item.id))}>
                <Text style={styles.actionText}>Descartar</Text>
              </Pressable>
              <Pressable style={styles.action} onPress={() => void runAction(() => archiveAdminNotification(item.id))}>
                <Text style={styles.actionText}>Archivar</Text>
              </Pressable>
              {item.deepLinkPath ? (
                <Pressable style={styles.actionPrimary} onPress={() => router.push(resolveMobileDeepLink(item.deepLinkPath) as never)}>
                  <Text style={styles.actionPrimaryText}>Abrir</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </MobileWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: { backgroundColor: "#fffdf9", borderWidth: 1, borderColor: "#dbe5f3", borderRadius: 18, padding: 14 },
  meta: { color: "#7c2d12", fontWeight: "800", marginBottom: 6 },
  title: { color: "#102a43", fontWeight: "800", fontSize: 17, marginBottom: 6 },
  body: { color: "#52637a", marginBottom: 8 },
  source: { color: "#475569", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  action: { backgroundColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionText: { color: "#334155", fontWeight: "700" },
  actionPrimary: { backgroundColor: "#dbeafe", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionPrimaryText: { color: "#1e3a8a", fontWeight: "800" },
  button: { backgroundColor: "#fef3c7", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { color: "#132d75", fontWeight: "800" },
  error: { color: "#b91c1c", marginBottom: 12 },
});
