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
    if (!roles.includes("ADMIN")) return void router.replace("/");
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
      title="Notificaciones"
      description="Bandeja administrativa con acciones rapidas y acceso directo."
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
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  meta: { color: "#92400e", fontWeight: "800", marginBottom: 6, fontSize: 12, textTransform: "uppercase" },
  title: { color: "#111827", fontWeight: "800", fontSize: 17, marginBottom: 6 },
  body: { color: "#4b5563", marginBottom: 8, lineHeight: 20 },
  source: { color: "#6b7280", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  action: { backgroundColor: "#ffffff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#d1d5db" },
  actionText: { color: "#4b5563", fontWeight: "700" },
  actionPrimary: { backgroundColor: "#007aff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionPrimaryText: { color: "#ffffff", fontWeight: "800" },
  button: { backgroundColor: "#ffffff", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: "#d1d5db" },
  buttonText: { color: "#007aff", fontWeight: "700" },
  error: { color: "#b91c1c", marginBottom: 12 },
});
